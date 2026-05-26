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
                  .values('month', 'scope')
                  .annotate(total=Sum('co2e_kg'))
                  .order_by('month', 'scope'))
    monthly_trend = [
        {'month': r['month'].strftime('%Y-%m') if r['month'] else None,
         'scope': r['scope'], 'co2e_t': round((r['total'] or 0) / 1000, 3)}
        for r in trend_qs
    ]

    total_co2e_kg = qs.filter(co2e_kg__isnull=False).aggregate(t=Sum('co2e_kg'))['t'] or 0
    recent_batches = IngestionBatch.objects.filter(tenant=m.tenant).order_by('-uploaded_at')[:5]

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
