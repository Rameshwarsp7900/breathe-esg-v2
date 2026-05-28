import hashlib
import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.models import Tenant, TenantMembership, IngestionBatch, EmissionRecord, PlantCode
from core.serializers import IngestionBatchSerializer
from core.views import _get_tenant_membership
from .parsers.sap_parser import parse_sap_file
from .parsers.utility_parser import parse_utility_file
from .parsers.travel_parser import parse_travel_file

logger = logging.getLogger(__name__)

VALID_SOURCE_TYPES = {
    'sap_fuel', 'utility_electricity', 'travel_flights', 'travel_hotels', 'travel_ground',
}


def _build_plant_lookup(tenant):
    return {
        p.code: {'name': p.name, 'country': p.country, 'grid_region': p.grid_region}
        for p in PlantCode.objects.filter(tenant=tenant)
    }


class IngestFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, tenant_slug, source_type):
        # Auth
        try:
            m = _get_tenant_membership(request.user, tenant_slug)
        except PermissionError as e:
            return Response({'error': str(e)}, status=403)

        if m.role == 'viewer':
            return Response({'error': 'Viewers cannot upload data.'}, status=403)

        if source_type not in VALID_SOURCE_TYPES:
            return Response({'error': f"Unknown source type '{source_type}'. "
                                      f"Valid: {', '.join(sorted(VALID_SOURCE_TYPES))}"}, status=400)

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided. Send as multipart/form-data with key "file".'}, status=400)

        raw_bytes = file_obj.read()
        if not raw_bytes:
            return Response({'error': 'Uploaded file is empty.'}, status=400)

        checksum = hashlib.sha256(raw_bytes).hexdigest()

        # Duplicate detection
        if IngestionBatch.objects.filter(tenant=m.tenant, source_checksum=checksum).exists():
            return Response({
                'error': 'Duplicate file detected.',
                'detail': 'This exact file has already been ingested (SHA-256 match). '
                          'If this is a corrected file, ensure content changed before re-uploading.'
            }, status=409)

        # Ingest params
        ingestion_params = {}
        if source_type == 'utility_electricity':
            ingestion_params['country'] = request.data.get('country', 'DEFAULT')

        # Create batch record
        batch = IngestionBatch.objects.create(
            tenant=m.tenant,
            source_type=source_type,
            status='processing',
            uploaded_by=request.user,
            source_filename=file_obj.name,
            source_checksum=checksum,
            notes=request.data.get('notes', ''),
            ingestion_params=ingestion_params,
        )
        try:
            batch.source_file.save(file_obj.name, file_obj, save=True)
        except Exception as e:
            logger.warning("Could not save source file: %s", e)

        # Parse
        plant_lookup = _build_plant_lookup(m.tenant)
        try:
            if source_type == 'sap_fuel':
                parsed, parse_errors = parse_sap_file(raw_bytes, file_obj.name, plant_lookup)
            elif source_type == 'utility_electricity':
                parsed, parse_errors = parse_utility_file(
                    raw_bytes, file_obj.name,
                    country=ingestion_params.get('country', 'DEFAULT'),
                )
            else:  # travel_flights covers all travel sub-types
                parsed, parse_errors = parse_travel_file(raw_bytes, file_obj.name)
        except Exception as e:
            logger.exception("Parser crashed for batch %s", batch.id)
            batch.status = 'failed'
            batch.processing_log = [f'Parser exception: {e}']
            batch.processed_at = timezone.now()
            batch.save(update_fields=['status', 'processing_log', 'processed_at'])
            return Response({'error': 'Parser crashed.', 'detail': str(e)}, status=500)

        # Persist records
        to_create = []
        for rec in parsed:
            flag_codes = rec.pop('flag_codes', [])
            rec_status = 'flagged' if flag_codes else 'pending_review'
            to_create.append(EmissionRecord(
                tenant=m.tenant,
                batch=batch,
                status=rec_status,
                flag_codes=flag_codes,
                **rec,
            ))

        EmissionRecord.objects.bulk_create(to_create, batch_size=500)

        flagged_count = sum(1 for r in to_create if r.flag_codes)

        # Update batch metadata
        log_lines = [f"Parsed {len(parsed)} records, {len(parse_errors)} row-level errors, {flagged_count} flagged."]
        for e in parse_errors[:30]:
            log_lines.append(f"  Row {e['row']}: {e['error']}")
        if len(parse_errors) > 30:
            log_lines.append(f"  … and {len(parse_errors)-30} more errors (see logs)")

        if not parsed and parse_errors:
            new_status = 'failed'
        elif parse_errors:
            new_status = 'partial'
        else:
            new_status = 'success'

        # Compute coverage period from parsed records
        dates = [r['activity_date'] for r in parsed if r.get('activity_date')]
        period_start = min(dates) if dates else None
        period_end   = max(dates) if dates else None

        batch.status       = new_status
        batch.total_rows   = len(parsed) + len(parse_errors)
        batch.success_rows = len(parsed)
        batch.failed_rows  = len(parse_errors)
        batch.flagged_rows = flagged_count
        batch.processing_log = log_lines
        batch.processed_at = timezone.now()
        batch.period_start = period_start
        batch.period_end   = period_end
        batch.save(update_fields=[
            'status', 'total_rows', 'success_rows', 'failed_rows',
            'flagged_rows', 'processing_log', 'processed_at',
            'period_start', 'period_end',
        ])

        logger.info("Batch %s: %s records ingested, %s errors, status=%s",
                    batch.id, len(parsed), len(parse_errors), new_status)

        return Response({
            'batch': IngestionBatchSerializer(batch).data,
            'records_created': len(to_create),
            'parse_errors': parse_errors[:50],
        }, status=201)
