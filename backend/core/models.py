"""
Core data models for Breathe ESG.

Architecture decisions:
- Row-level multi-tenancy: every table has a tenant FK
- All CO2e stored in kg (not tonnes) — avoids floating point loss at small values
- SI normalization: liters, kWh, kg, km — stored alongside raw for audit
- Scope 1/2/3 assigned at ingestion time, stored on record (not derived)
- Immutable audit trail: edit_history append-only JSON, locked records block all writes
- Flag system uses coded strings (queryable) not free text
"""

import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Tenant(models.Model):
    """An enterprise client. All data is scoped here."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class TenantMembership(models.Model):
    ROLE_CHOICES = [
        ('admin',   'Admin'),
        ('analyst', 'Analyst'),
        ('viewer',  'Viewer'),
    ]
    user   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='memberships')
    role   = models.CharField(max_length=20, choices=ROLE_CHOICES, default='analyst')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'tenant')

    def __str__(self):
        return f"{self.user.username} @ {self.tenant.slug} ({self.role})"


class PlantCode(models.Model):
    """Maps SAP plant codes to human-readable locations per tenant."""
    tenant  = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='plant_codes')
    code    = models.CharField(max_length=20)
    name    = models.CharField(max_length=255)
    country = models.CharField(max_length=2, help_text='ISO 3166-1 alpha-2')
    region  = models.CharField(max_length=100, blank=True)
    grid_region = models.CharField(max_length=10, blank=True,
        help_text='Grid emission factor region code (e.g. IN, DE, US)')

    class Meta:
        unique_together = ('tenant', 'code')
        ordering = ['code']

    def __str__(self):
        return f"{self.code} – {self.name} ({self.country})"


class EmissionFactor(models.Model):
    """
    Versioned emission factor table.
    Records store a snapshot of factor+source at ingestion time.
    This table is the authoritative reference, updatable by admins.
    """
    CATEGORY_CHOICES = [
        ('fuel',        'Fuel Combustion'),
        ('electricity', 'Purchased Electricity'),
        ('flight',      'Air Travel'),
        ('hotel',       'Hotel Stay'),
        ('car',         'Car / Ground Transport'),
    ]
    category        = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    substance       = models.CharField(max_length=100, help_text='e.g. diesel, natural_gas, grid_IN')
    unit            = models.CharField(max_length=20,  help_text='e.g. liter, kWh, pkm, room-night')
    kg_co2e         = models.FloatField(help_text='kg CO2e per unit')
    source          = models.CharField(max_length=200, help_text='e.g. IPCC AR6, DEFRA 2023, EPA AP-42')
    effective_from  = models.DateField()
    effective_to    = models.DateField(null=True, blank=True, help_text='NULL = currently active')
    notes           = models.TextField(blank=True)

    class Meta:
        ordering = ['category', 'substance', '-effective_from']

    def __str__(self):
        return f"{self.substance} ({self.unit}) = {self.kg_co2e} kg CO2e [{self.source}]"


class IngestionBatch(models.Model):
    """
    One upload event. Immutable metadata after creation.
    Every EmissionRecord links back to exactly one batch.
    """
    SOURCE_CHOICES = [
        ('sap_fuel',            'SAP – Fuel & Combustion'),
        ('utility_electricity', 'Utility – Electricity'),
        ('travel_flights',      'Travel – Flights'),
        ('travel_hotels',       'Travel – Hotels'),
        ('travel_ground',       'Travel – Ground Transport'),
    ]
    STATUS_CHOICES = [
        ('pending',    'Queued'),
        ('processing', 'Processing'),
        ('success',    'Success'),
        ('partial',    'Partial – Some Errors'),
        ('failed',     'Failed'),
    ]

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant          = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='batches')
    source_type     = models.CharField(max_length=30, choices=SOURCE_CHOICES)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Who uploaded it and when
    uploaded_by     = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                        related_name='uploaded_batches')
    uploaded_at     = models.DateTimeField(auto_now_add=True)
    processed_at    = models.DateTimeField(null=True, blank=True)

    # Raw file preservation (source of truth)
    source_filename = models.CharField(max_length=255, blank=True)
    source_file     = models.FileField(upload_to='raw/%Y/%m/', blank=True, null=True)
    source_checksum = models.CharField(max_length=64, blank=True,
                                       help_text='SHA-256 of raw bytes — used for duplicate detection')

    # Processing summary
    total_rows      = models.PositiveIntegerField(default=0)
    success_rows    = models.PositiveIntegerField(default=0)
    failed_rows     = models.PositiveIntegerField(default=0)
    flagged_rows    = models.PositiveIntegerField(default=0)
    processing_log  = models.JSONField(default=list)

    # Optional period coverage metadata
    period_start    = models.DateField(null=True, blank=True)
    period_end      = models.DateField(null=True, blank=True)
    notes           = models.TextField(blank=True)

    # Extra ingestion params stored for reproducibility (e.g. country for grid EF)
    ingestion_params = models.JSONField(default=dict)

    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['tenant', 'source_type']),
            models.Index(fields=['tenant', '-uploaded_at']),
        ]

    def __str__(self):
        return f"{self.tenant.slug} | {self.get_source_type_display()} | {self.uploaded_at:%Y-%m-%d}"


class EmissionRecord(models.Model):
    """
    One normalised emission event.

    Scope classification:
      Scope 1 — Direct combustion  (sap_fuel)
      Scope 2 — Purchased energy   (utility_electricity)
      Scope 3 — Indirect           (travel_*)

    Storage conventions:
      raw_*         — exactly as received from source file
      quantity_norm — converted to SI base unit
      co2e_kg       — kg CO2 equivalent (always kg, never tonnes)

    Audit conventions:
      raw_data_snapshot — full source row as JSON, immutable
      edit_history      — append-only list of {user, ts, field, old, new}
      locked_at         — set on lock; all mutations blocked after this
    """

    # ── Flag reason codes ──────────────────────────────────────────────────
    FLAG_UNIT_MISMATCH   = 'unit_mismatch'
    FLAG_MISSING_UNIT    = 'missing_unit'
    FLAG_OUTLIER         = 'outlier_value'
    FLAG_UNKNOWN_PLANT   = 'unknown_plant'
    FLAG_MISSING_PERIOD  = 'missing_period'
    FLAG_NEGATIVE        = 'negative_value'
    FLAG_MISSING_DIST    = 'missing_distance'
    FLAG_MANUAL          = 'manual_review'
    FLAG_DUPLICATE       = 'duplicate_suspect'

    FLAG_CHOICES = [
        (FLAG_UNIT_MISMATCH,  'Unit Mismatch'),
        (FLAG_MISSING_UNIT,   'Missing Unit'),
        (FLAG_OUTLIER,        'Statistical Outlier'),
        (FLAG_UNKNOWN_PLANT,  'Unknown Plant Code'),
        (FLAG_MISSING_PERIOD, 'Missing / Ambiguous Period'),
        (FLAG_NEGATIVE,       'Negative Value'),
        (FLAG_MISSING_DIST,   'Missing Distance'),
        (FLAG_MANUAL,         'Manually Flagged'),
        (FLAG_DUPLICATE,      'Possible Duplicate'),
    ]

    SCOPE_CHOICES  = [('1','Scope 1 – Direct'),('2','Scope 2 – Indirect Energy'),('3','Scope 3 – Value Chain')]
    STATUS_CHOICES = [
        ('pending_review', 'Pending Review'),
        ('flagged',        'Flagged'),
        ('approved',       'Approved'),
        ('rejected',       'Rejected'),
        ('locked',         'Locked for Audit'),
    ]

    # ── Identity ───────────────────────────────────────────────────────────
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant  = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='records')
    batch   = models.ForeignKey(IngestionBatch, on_delete=models.CASCADE, related_name='records')

    # ── GHG classification ─────────────────────────────────────────────────
    scope       = models.CharField(max_length=1, choices=SCOPE_CHOICES)
    category    = models.CharField(max_length=120,
                    help_text='e.g. Stationary Combustion, Purchased Electricity, Business Air Travel')
    source_type = models.CharField(max_length=30)

    # ── Raw activity data (immutable after create) ─────────────────────────
    raw_quantity    = models.FloatField(null=True, blank=True)
    raw_unit        = models.CharField(max_length=50, blank=True)
    raw_description = models.CharField(max_length=500, blank=True)
    raw_period      = models.CharField(max_length=100, blank=True)

    # ── Normalised activity data ───────────────────────────────────────────
    quantity_norm       = models.FloatField(null=True, blank=True,
                            help_text='In SI base unit (liters / kWh / kg / km / room-nights)')
    normalized_unit     = models.CharField(max_length=30, blank=True)
    conversion_applied  = models.CharField(max_length=200, blank=True,
                            help_text='Human-readable conversion, e.g. "1 GAL = 3.785 L"')

    # ── Temporal ───────────────────────────────────────────────────────────
    activity_date = models.DateField(null=True, blank=True)
    period_start  = models.DateField(null=True, blank=True)
    period_end    = models.DateField(null=True, blank=True)

    # ── Location / org ─────────────────────────────────────────────────────
    location    = models.CharField(max_length=255, blank=True)
    plant_code  = models.CharField(max_length=20,  blank=True)
    country     = models.CharField(max_length=2,   blank=True)
    cost_center = models.CharField(max_length=50,  blank=True)

    # ── Emission calculation ───────────────────────────────────────────────
    emission_factor        = models.FloatField(null=True, blank=True)
    emission_factor_unit   = models.CharField(max_length=50, blank=True,
                               help_text='e.g. kg CO2e/liter')
    emission_factor_source = models.CharField(max_length=200, blank=True)
    co2e_kg                = models.FloatField(null=True, blank=True,
                               help_text='kg CO2 equivalent — always kilograms, never tonnes')

    # ── Source-of-truth ────────────────────────────────────────────────────
    source_row_ref      = models.CharField(max_length=50, blank=True,
                            help_text='Row number in source file (1-indexed)')
    raw_data_snapshot   = models.JSONField(default=dict,
                            help_text='Full source row as received — immutable')
    source_specific     = models.JSONField(default=dict,
                            help_text='Source-type fields: fuel_type, meter_id, cabin_class, etc.')

    # ── Review workflow ────────────────────────────────────────────────────
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_review')
    flag_codes  = models.JSONField(default=list,
                    help_text='List of FLAG_* codes — queryable, not free text')
    flag_notes  = models.TextField(blank=True)

    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='reviewed_records')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='approved_records')
    approved_at = models.DateTimeField(null=True, blank=True)

    # ── Audit lock ─────────────────────────────────────────────────────────
    locked_at   = models.DateTimeField(null=True, blank=True)

    # ── Audit trail ────────────────────────────────────────────────────────
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
    edit_history = models.JSONField(default=list,
                     help_text='Append-only: [{user, ts, field, old, new}]')

    class Meta:
        ordering = ['-activity_date', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'scope', 'status']),
            models.Index(fields=['tenant', 'source_type', 'status']),
            models.Index(fields=['tenant', 'activity_date']),
            models.Index(fields=['batch', 'status']),
            models.Index(fields=['tenant', 'co2e_kg']),
        ]

    def __str__(self):
        co2 = f"{self.co2e_kg:.2f} kg" if self.co2e_kg is not None else "?"
        return f"[S{self.scope}] {self.category} | {co2} CO2e"

    # ── Business logic ─────────────────────────────────────────────────────

    @property
    def is_locked(self):
        return self.locked_at is not None

    def _check_not_locked(self):
        if self.is_locked:
            raise PermissionError("Record is locked for audit and cannot be modified.")

    def _append_history(self, user, field, old_val, new_val):
        self.edit_history.append({
            'user': user.username if user else 'system',
            'ts':   timezone.now().isoformat(),
            'field': field,
            'old':   str(old_val),
            'new':   str(new_val),
        })

    def approve(self, user):
        self._check_not_locked()
        self._append_history(user, 'status', self.status, 'approved')
        self.status      = 'approved'
        self.approved_by = user
        self.approved_at = timezone.now()
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.save(update_fields=['status','approved_by','approved_at',
                                 'reviewed_by','reviewed_at','edit_history','updated_at'])

    def flag(self, user, codes, notes=''):
        self._check_not_locked()
        self._append_history(user, 'status', self.status, 'flagged')
        self.status     = 'flagged'
        self.flag_codes = codes
        self.flag_notes = notes
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.save(update_fields=['status','flag_codes','flag_notes',
                                 'reviewed_by','reviewed_at','edit_history','updated_at'])

    def reject(self, user, notes=''):
        self._check_not_locked()
        self._append_history(user, 'status', self.status, 'rejected')
        self.status      = 'rejected'
        self.flag_notes  = notes
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.save(update_fields=['status','flag_notes','reviewed_by',
                                 'reviewed_at','edit_history','updated_at'])

    def lock(self, user):
        if self.status != 'approved':
            raise ValueError("Only approved records can be locked.")
        self._check_not_locked()
        self._append_history(user, 'status', 'approved', 'locked')
        self.status    = 'locked'
        self.locked_at = timezone.now()
        self.save(update_fields=['status','locked_at','edit_history','updated_at'])
