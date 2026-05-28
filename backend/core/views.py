import logging
from django.contrib.auth import authenticate
from django.db.models import Sum, Count, Q
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import (Tenant, TenantMembership, IngestionBatch,
                     EmissionRecord, PlantCode, EmissionFactor)
from .serializers import (TenantSerializer, IngestionBatchSerializer,
                           EmissionRecordSerializer, UserSerializer,
                           PlantCodeSerializer, EmissionFactorSerializer)

logger = logging.getLogger(__name__)


# ── Auth helpers ───────────────────────────────────────────────────────────────

def _get_tenant_membership(user, slug, require_role=None):
    """Returns membership or raises PermissionError."""
    try:
        m = TenantMembership.objects.select_related('tenant').get(user=user, tenant__slug=slug)
    except TenantMembership.DoesNotExist:
        raise PermissionError("Access denied to this tenant.")
    if require_role and m.role != require_role:
        raise PermissionError(f"Role '{m.role}' cannot perform this action.")
    return m


def _tenant_membership_data(user):
    ms = TenantMembership.objects.filter(user=user).select_related('tenant')
    return [{'id': str(m.tenant.id), 'name': m.tenant.name,
              'slug': m.tenant.slug, 'role': m.role} for m in ms]


# ── Auth endpoints ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_view(request):
    """Returns a CSRF cookie so the SPA can include it in subsequent POST requests."""
    return Response({'csrfToken': get_token(request)})


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    if not username or not password:
        return Response({'error': 'Username and password required.'}, status=400)
    user = authenticate(request, username=username, password=password)
    if not user:
        return Response({'error': 'Invalid credentials.'}, status=400)
    token, _ = Token.objects.get_or_create(user=user)
    logger.info("Login: %s", username)
    return Response({
        'token': token.key,
        'user': UserSerializer(user).data,
        'tenants': _tenant_membership_data(user),
    })


@api_view(['POST'])
def logout_view(request):
    # Delete the token so it can't be reused
    Token.objects.filter(user=request.user).delete()
    return Response({'message': 'Logged out.'})


@api_view(['GET'])
@permission_classes([AllowAny])
def me_view(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated.'}, status=401)
    return Response({'user': UserSerializer(request.user).data,
                     'tenants': _tenant_membership_data(request.user)})


# ── Dashboard ──────────────────────────────────────────────────────────────────

@api_view(['GET'])
def dashboard_stats(request, tenant_slug):
    try:
        m = _get_tenant_membership(request.user, tenant_slug)
    except PermissionError as e:
        return Response({'error': str(e)}, status=403)

    qs = EmissionRecord.objects.filter(tenant=m.tenant)

    # Dynamic location-based personalization filters
    country_filter = request.query_params.get('country')
    region_filter = request.query_params.get('region')
    plant_filter = request.query_params.get('plant_code')

    if country_filter:
        qs = qs.filter(country=country_filter)
    if region_filter:
        matching_plants = PlantCode.objects.filter(tenant=m.tenant, region=region_filter).values_list('code', flat=True)
        qs = qs.filter(Q(plant_code__in=matching_plants) | Q(location__icontains=region_filter))
    if plant_filter:
        qs = qs.filter(plant_code=plant_filter)

    # Date range filter
    date_from = request.query_params.get('date_from')
    date_to   = request.query_params.get('date_to')
    if date_from:
        qs = qs.filter(activity_date__gte=date_from)
    if date_to:
        qs = qs.filter(activity_date__lte=date_to)

    # Status counts
    status_counts = {
        r['status']: r['count']
        for r in qs.values('status').annotate(count=Count('id'))
    }

    # Scope breakdown (tCO2e)
    scope_rows = (qs.filter(co2e_kg__isnull=False)
                    .values('scope').annotate(total=Sum('co2e_kg')))
    scope_breakdown = {f"scope_{r['scope']}": round((r['total'] or 0) / 1000, 3)
                       for r in scope_rows}

    # Source breakdown (tCO2e)
    source_rows = (qs.filter(co2e_kg__isnull=False)
                     .values('source_type').annotate(total=Sum('co2e_kg')))
    source_breakdown = {r['source_type']: round((r['total'] or 0) / 1000, 3)
                        for r in source_rows}

    # Flag breakdown
    flag_breakdown = {}
    for rec in qs.filter(flag_codes__len__gt=0).values_list('flag_codes', flat=True):
        for code in rec:
            flag_breakdown[code] = flag_breakdown.get(code, 0) + 1

    # Monthly trend (last 12 months, approved+locked+pending_review)
    from django.db.models.functions import TruncMonth
    trend_qs = (qs.filter(status__in=['approved', 'locked', 'pending_review'], co2e_kg__isnull=False)
                  .annotate(month=TruncMonth('activity_date'))
                  .values('month', 'scope', 'source_type')
                  .annotate(total=Sum('co2e_kg'))
                  .order_by('month', 'scope', 'source_type'))
    monthly_trend = [
        {'month': r['month'].strftime('%Y-%m') if r['month'] else None,
         'scope': r['scope'], 'source_type': r['source_type'], 'co2e_t': round((r['total'] or 0) / 1000, 3)}
        for r in trend_qs
    ]

    total_co2e_kg = qs.filter(co2e_kg__isnull=False).aggregate(t=Sum('co2e_kg'))['t'] or 0
    recent_batches = IngestionBatch.objects.filter(tenant=m.tenant).order_by('-uploaded_at')[:5]

    # Available areas & personalization details
    available_countries = list(PlantCode.objects.filter(tenant=m.tenant).values_list('country', flat=True).distinct())
    available_countries.extend(list(qs.values_list('country', flat=True).distinct()))
    available_countries = sorted(list(set(c for c in available_countries if c)))

    available_regions = list(PlantCode.objects.filter(tenant=m.tenant).values_list('region', flat=True).distinct())
    available_regions = sorted(list(set(r for r in available_regions if r)))

    available_plants = [
        {'code': p.code, 'name': p.name}
        for p in PlantCode.objects.filter(tenant=m.tenant)
    ]

    return Response({
        'total_records':  qs.count(),
        'pending_review': status_counts.get('pending_review', 0),
        'flagged':        status_counts.get('flagged', 0),
        'approved':       status_counts.get('approved', 0),
        'locked':         status_counts.get('locked', 0),
        'rejected':       status_counts.get('rejected', 0),
        'total_co2e_kg':  round(total_co2e_kg, 2),
        'total_co2e_t':   round(total_co2e_kg / 1000, 3),
        'scope_breakdown':  scope_breakdown,
        'source_breakdown': source_breakdown,
        'flag_breakdown':   flag_breakdown,
        'monthly_trend':    monthly_trend,
        'recent_batches':   IngestionBatchSerializer(recent_batches, many=True).data,
        'available_countries': available_countries,
        'available_regions': available_regions,
        'available_plants': available_plants,
    })


# ── EmissionRecord ViewSet ─────────────────────────────────────────────────────

class EmissionRecordViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = EmissionRecordSerializer

    def _membership(self):
        try:
            return _get_tenant_membership(self.request.user, self.kwargs['tenant_slug'])
        except PermissionError:
            return None

    def get_queryset(self):
        m = self._membership()
        if not m:
            return EmissionRecord.objects.none()
        qs = (EmissionRecord.objects
              .filter(tenant=m.tenant)
              .select_related('batch', 'reviewed_by', 'approved_by'))

        p = self.request.query_params
        if p.get('status'):      qs = qs.filter(status=p['status'])
        if p.get('scope'):       qs = qs.filter(scope=p['scope'])
        if p.get('source_type'): qs = qs.filter(source_type=p['source_type'])
        if p.get('batch'):       qs = qs.filter(batch_id=p['batch'])
        if p.get('has_flags'):   qs = qs.exclude(flag_codes=[])
        if p.get('date_from'):   qs = qs.filter(activity_date__gte=p['date_from'])
        if p.get('date_to'):     qs = qs.filter(activity_date__lte=p['date_to'])
        if p.get('search'):
            q = p['search']
            qs = qs.filter(
                Q(location__icontains=q) | Q(raw_description__icontains=q) |
                Q(category__icontains=q) | Q(plant_code__icontains=q)
            )
        return qs

    @action(detail=True, methods=['post'])
    def approve(self, request, tenant_slug=None, pk=None):
        record = self.get_object()
        try:
            record.approve(request.user)
        except PermissionError as e:
            return Response({'error': str(e)}, status=400)
        return Response(EmissionRecordSerializer(record).data)

    @action(detail=True, methods=['post'])
    def flag(self, request, tenant_slug=None, pk=None):
        record = self.get_object()
        codes = request.data.get('codes', [])
        notes = request.data.get('notes', '')
        if not codes:
            return Response({'error': 'At least one flag code required.'}, status=400)
        try:
            record.flag(request.user, codes, notes)
        except PermissionError as e:
            return Response({'error': str(e)}, status=400)
        return Response(EmissionRecordSerializer(record).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, tenant_slug=None, pk=None):
        record = self.get_object()
        try:
            record.reject(request.user, request.data.get('notes', ''))
        except PermissionError as e:
            return Response({'error': str(e)}, status=400)
        return Response(EmissionRecordSerializer(record).data)

    @action(detail=True, methods=['post'])
    def lock(self, request, tenant_slug=None, pk=None):
        m = self._membership()
        if m and m.role not in ('admin', 'analyst'):
            return Response({'error': 'Insufficient role.'}, status=403)
        record = self.get_object()
        try:
            record.lock(request.user)
        except (PermissionError, ValueError) as e:
            return Response({'error': str(e)}, status=400)
        return Response(EmissionRecordSerializer(record).data)

    @action(detail=False, methods=['post'])
    def bulk_approve(self, request, tenant_slug=None):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided.'}, status=400)
        qs = self.get_queryset().filter(id__in=ids, status__in=['pending_review', 'flagged'])
        count = 0
        errors = []
        for r in qs:
            try:
                r.approve(request.user)
                count += 1
            except PermissionError as e:
                errors.append({'id': str(r.id), 'error': str(e)})
        return Response({'approved': count, 'errors': errors})

    @action(detail=False, methods=['get'])
    def export_csv(self, request, tenant_slug=None):
        """Export filtered records as CSV for auditors."""
        import csv
        from django.http import HttpResponse
        qs = self.get_queryset()
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="emissions_{tenant_slug}.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'id', 'scope', 'category', 'source_type', 'status',
            'activity_date', 'location', 'plant_code', 'country',
            'raw_quantity', 'raw_unit', 'quantity_norm', 'normalized_unit',
            'co2e_kg', 'co2e_tonnes', 'emission_factor', 'emission_factor_unit',
            'emission_factor_source', 'flag_codes', 'approved_by', 'approved_at',
            'locked_at', 'batch_id',
        ])
        for r in qs.select_related('approved_by', 'batch'):
            writer.writerow([
                str(r.id), r.scope, r.category, r.source_type, r.status,
                r.activity_date, r.location, r.plant_code, r.country,
                r.raw_quantity, r.raw_unit, r.quantity_norm, r.normalized_unit,
                r.co2e_kg, round(r.co2e_kg / 1000, 6) if r.co2e_kg else '',
                r.emission_factor, r.emission_factor_unit, r.emission_factor_source,
                ','.join(r.flag_codes or []),
                r.approved_by.username if r.approved_by else '',
                r.approved_at, r.locked_at, str(r.batch_id),
            ])
        return response

    @action(detail=False, methods=['post'])
    def bulk_reject(self, request, tenant_slug=None):
        """Bulk reject selected records."""
        ids = request.data.get('ids', [])
        notes = request.data.get('notes', '')
        if not ids:
            return Response({'error': 'No IDs provided.'}, status=400)
        qs = self.get_queryset().filter(id__in=ids, status__in=['pending_review', 'flagged'])
        count = 0
        errors = []
        for r in qs:
            try:
                r.reject(request.user, notes)
                count += 1
            except PermissionError as e:
                errors.append({'id': str(r.id), 'error': str(e)})
        return Response({'rejected': count, 'errors': errors})

    @action(detail=True, methods=['patch'])
    def edit(self, request, tenant_slug=None, pk=None):
        """Edit raw_quantity or raw_unit with audit trail."""
        record = self.get_object()
        if record.is_locked:
            return Response({'error': 'Record is locked for audit.'}, status=400)
        allowed = {'raw_quantity', 'raw_unit', 'flag_notes'}
        changes = {k: v for k, v in request.data.items() if k in allowed}
        if not changes:
            return Response({'error': f'Only editable fields: {allowed}'}, status=400)
        for field, new_val in changes.items():
            old_val = getattr(record, field)
            record._append_history(request.user, field, old_val, new_val)
            setattr(record, field, new_val)
        record.save(update_fields=list(changes.keys()) + ['edit_history', 'updated_at'])
        return Response(EmissionRecordSerializer(record).data)

    @action(detail=False, methods=['get'])
    def pending_count(self, request, tenant_slug=None):
        """Return count of pending_review records for sidebar badge."""
        m = self._membership()
        if not m:
            return Response({'count': 0})
        count = EmissionRecord.objects.filter(
            tenant=m.tenant, status__in=['pending_review', 'flagged']
        ).count()
        return Response({'count': count})


class IngestionBatchViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = IngestionBatchSerializer

    def get_queryset(self):
        try:
            m = _get_tenant_membership(self.request.user, self.kwargs['tenant_slug'])
            return IngestionBatch.objects.filter(tenant=m.tenant).order_by('-uploaded_at')
        except PermissionError:
            return IngestionBatch.objects.none()


class PlantCodeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = PlantCodeSerializer

    def get_queryset(self):
        try:
            m = _get_tenant_membership(self.request.user, self.kwargs['tenant_slug'])
            return PlantCode.objects.filter(tenant=m.tenant)
        except PermissionError:
            return PlantCode.objects.none()

    def perform_create(self, serializer):
        m = _get_tenant_membership(self.request.user, self.kwargs['tenant_slug'])
        serializer.save(tenant=m.tenant)


class EmissionFactorViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = EmissionFactorSerializer
    queryset           = EmissionFactor.objects.filter(effective_to__isnull=True)


# ── AI Chatbot Proxy ─────────────────────────────────────────────────────────

@api_view(['POST'])
def chatbot_view(request, tenant_slug):
    try:
        m = _get_tenant_membership(request.user, tenant_slug)
    except PermissionError as e:
        return Response({'error': str(e)}, status=403)

    user_message = request.data.get('message', '').strip()
    history = request.data.get('history', [])

    if not user_message:
        return Response({'error': 'Message required.'}, status=400)

    # Compile carbon footprint state for the system context
    qs = EmissionRecord.objects.filter(tenant=m.tenant)

    total_kg = qs.filter(co2e_kg__isnull=False).aggregate(s=Sum('co2e_kg'))['s'] or 0
    total_t = round(total_kg / 1000, 2)

    # Scopes
    scope_rows = qs.filter(co2e_kg__isnull=False).values('scope').annotate(total=Sum('co2e_kg'))
    scope_data = {f"Scope {r['scope']}": round((r['total'] or 0) / 1000, 2) for r in scope_rows}

    # Sources
    source_rows = qs.filter(co2e_kg__isnull=False).values('source_type').annotate(total=Sum('co2e_kg'))
    source_data = {r['source_type'].replace('_', ' ').title(): round((r['total'] or 0) / 1000, 2) for r in source_rows}

    # Locations
    plant_codes = PlantCode.objects.filter(tenant=m.tenant)
    plants_list = ", ".join([f"{p.name} ({p.code} in {p.country})" for p in plant_codes])
    if not plants_list:
        plants_list = "No designated plant locations registered."

    # Review status
    status_counts = {
        r['status']: r['count']
        for r in qs.values('status').annotate(count=Count('id'))
    }

    system_prompt = f"""You are the Breathe ESG AI Assistant, an expert chatbot in sustainability, carbon accounting (GHG Protocol), and compliance auditing.
You are assisting members of the company '{m.tenant.name}' (tenant slug: '{m.tenant.slug}').

Here is the real-time sustainability and carbon emissions data for '{m.tenant.name}' retrieved directly from the database:

OVERALL EMISSION SUMMARY
- Total Carbon Emissions: {total_t} tonnes CO2e (tCO2e)
- Scope Breakdown (in tCO2e): {scope_data if scope_data else "No emissions calculated yet."}
- Source Type Breakdown (in tCO2e): {source_data if source_data else "No source types recorded."}

AUDIT & COMPLIANCE QUEUE STATUS
- Total Ingested Emission Records: {qs.count()}
- Pending Auditor Review: {status_counts.get('pending_review', 0)}
- Flagged with anomalies: {status_counts.get('flagged', 0)}
- Approved & Verified: {status_counts.get('approved', 0)}
- Locked for official Audit: {status_counts.get('locked', 0)}
- Rejected/Invalid: {status_counts.get('rejected', 0)}

GEOGRAPHIC LOCATIONS & SAP PLANT FACILITIES
Registered plant codes: {plants_list}

INSTRUCTIONS:
1. Provide highly accurate, precise, and professional sustainability answers grounded strictly in the data above.
2. If the user asks about specific plants, emissions, or compliance, refer directly to the metrics.
3. Be professional, direct, and concise. Format calculations, tables, or comparative bullet points using clean Markdown.
4. Keep the context in mind. Keep your tone helpful and sustainability-expert oriented.
"""

    api_key = request.data.get('custom_key') or request.headers.get('X-Mistral-Key') or request.META.get('HTTP_X_MISTRAL_KEY')
    if not api_key:
        from decouple import config
        api_key = config('MISTRAL_API_KEY', default='').strip()

    if not api_key:
        # Dry-run simulated mode
        simulated_response = f"""### ⚠️ Mistral API Key Not Set (Client Simulation Mode)

It looks like the Mistral API Key is not set in `.env` and no custom key was supplied in the AI Assistant settings. 

However, I can still analyze your **{m.tenant.name}** sustainability data! Here is an automated ESG summary:
- **Total Emissions:** **{total_t} tCO2e**
- **Distribution:** {", ".join([f"**{k}:** {v} tCO2e" for k, v in scope_data.items()]) if scope_data else "No calculations"}
- **Top Sources:** {", ".join([f"**{k}:** {v} tCO2e" for k, v in source_data.items()]) if source_data else "No sources"}
- **Audit Health:** You have **{status_counts.get('approved', 0)} approved** records, and **{status_counts.get('pending_review', 0) + status_counts.get('flagged', 0)} records** requiring immediate review in the queue.

*Tip: Click the ⚙️ settings icon at the bottom of this chat box to input your Mistral API Key and unlock real-time conversational analysis!*
"""
        return Response({'message': simulated_response})

    import urllib.request
    import json

    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:
        if h.get('role') in ('user', 'assistant') and h.get('content'):
            messages.append({"role": h['role'], "content": h['content']})

    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": "open-mistral-7b",
        "messages": messages,
        "temperature": 0.2
    }

    req = urllib.request.Request(
        "https://api.mistral.ai/v1/chat/completions",
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            ai_message = res_data['choices'][0]['message']['content']
            return Response({'message': ai_message})
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        logger.error("Mistral API Error: %s | Response: %s", e, error_body)
        return Response({
            'error': 'Failed to communicate with Mistral API.',
            'detail': f"Mistral API returned status code {e.code}. Make sure your API key is valid."
        }, status=400)
    except Exception as e:
        logger.exception("Chatbot request exception")
        return Response({
            'error': 'AI request failed.',
            'detail': str(e)
        }, status=500)


# ── Compliance Documentation API ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def docs_view(request):
    """
    Reads markdown compliance and architectural documents from the repository root
    and serves them to the frontend.
    """
    docs_to_read = [
        ('model', 'MODEL.md', 'Data Architecture & Rules'),
        ('decisions', 'DECISIONS.md', 'Architectural Decisions'),
        ('tradeoffs', 'TRADEOFFS.md', 'Technical Tradeoffs & Design'),
        ('readme', 'README.md', 'System Overview & Installation'),
    ]

    response_data = []
    from django.conf import settings
    base_dir = settings.BASE_DIR
    root_dir = base_dir.parent

    import os
    for key, filename, title in docs_to_read:
        file_path = os.path.join(root_dir, filename)
        if not os.path.exists(file_path):
            file_path = os.path.join(base_dir, filename)

        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                response_data.append({
                    'key': key,
                    'title': title,
                    'filename': filename,
                    'content': content
                })
            except Exception as e:
                logger.warning("Could not read doc file %s: %s", filename, e)

    return Response(response_data)
