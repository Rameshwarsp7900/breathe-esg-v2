# MODEL.md — Data Model

## Philosophy
Every EmissionRecord has an unbroken chain of custody from raw file bytes → normalised row → analyst sign-off → audit lock.
Three questions auditors ask drive every design decision:
1. *Where did this number come from?*  → `raw_data_snapshot`, `source_row_ref`, `batch.source_file`, `batch.source_checksum`
2. *Was it touched after ingestion?*   → `edit_history` (append-only), `locked_at` (immutable after lock)
3. *Who signed off?*                   → `approved_by`, `approved_at`, `reviewed_by`

---

## Entity Map

```
Tenant
  ├── TenantMembership  (user ↔ tenant, with role: admin/analyst/viewer)
  ├── PlantCode         (SAP plant code → name, country, grid_region)
  ├── IngestionBatch    (one upload event, immutable after creation)
  │     └── EmissionRecord  (one normalised emission event)
EmissionFactor          (versioned EF table, global, not tenant-scoped)
```

---

## Tenant (Multi-tenancy)

Row-level isolation: every `EmissionRecord` and `IngestionBatch` carries a `tenant` FK.
API layer enforces this via `_get_tenant_membership()` before every queryset.

**Why row-level, not schema-per-tenant?**
Schema-per-tenant adds ops overhead (migrations per tenant, connection pool per tenant) with
minimal security benefit when the application layer enforces isolation correctly.
Escalation path: for clients requiring contractual data isolation, Django's multi-db routing
can migrate a specific tenant to a dedicated DB without rewriting application logic.

**Roles:** `admin` (full), `analyst` (review/approve/lock), `viewer` (read-only).
Viewer is blocked at the API layer before any mutation reaches the model.

---

## IngestionBatch

Immutable after creation. One row per upload event.

| Field | Purpose |
|---|---|
| `source_type` | Pipeline (sap_fuel / utility_electricity / travel_flights) |
| `source_checksum` | SHA-256 of raw file bytes — duplicate detection at batch level |
| `source_file` | Original raw file stored for re-parsing or audit inspection |
| `processing_log` | JSON list of human-readable messages from the parser |
| `success_rows / failed_rows / flagged_rows` | Counters set post-processing |
| `ingestion_params` | Extra params used (e.g. `{"country":"IN"}`) — stored for reproducibility |

---

## EmissionRecord

One normalised emission event. The canonical row.

### Scope Classification

| Scope | Source type | GHG Protocol category |
|---|---|---|
| 1 | sap_fuel | Stationary Combustion (direct fuel burn) |
| 2 | utility_electricity | Purchased Electricity |
| 3 | travel_flights / travel_hotels / travel_ground | Category 6: Business Travel |

Scope is assigned at ingestion time and stored on the record (not derived).
If an analyst disagrees, they flag with `manual_review`.

### Unit Normalisation

All quantities stored in SI base units:

| Fuel type | SI unit | Example conversion |
|---|---|---|
| Liquid fuel | liters | 1 GAL = 3.785 L |
| Solid fuel | kg | 1 tonne = 1000 kg |
| Gas fuel | m³ | 1 NM3 = 1 m3 |
| Energy (utility) | kWh | 1 MMBTU = 293.071 kWh |
| Distance (flights) | km | IATA Haversine |
| Hotel | room-nights | (dimensionless count) |

Raw value and raw unit are preserved alongside normalised value.
`conversion_applied` records the exact conversion as a string (e.g. `"1 GAL = 3.785 L"`).
This makes the normalisation auditable without running code.

### CO₂e Calculation

`co2e_kg = raw_quantity × emission_factor`

Always stored in **kilograms**, never tonnes (avoids floating-point loss at small values).
`emission_factor_source` cites the exact reference (IPCC AR6, DEFRA 2023, IEA 2023).

### Source-of-Truth Fields

| Field | What it tracks |
|---|---|
| `batch` | Which upload produced this row |
| `source_row_ref` | Row number in the source file (1-indexed) |
| `raw_data_snapshot` | Full parsed row as JSON dict — immutable, set at create |
| `source_specific` | Source-type metadata (fuel_type, meter_id, cabin_class, etc.) |
| `edit_history` | Append-only list of `{user, ts, field, old, new}` |
| `locked_at` | Set on lock; blocks all further writes at model level |

### Review Workflow

```
[ingest] → pending_review
              ↓            ↓
           flagged      approved → locked (terminal)
              ↓            ↑
         pending_review ←──┘
              ↓
           rejected (terminal)
```

`locked` is terminal — `_check_not_locked()` raises `PermissionError` before any mutation.

### Flag System

Flags stored as a JSON list of coded strings (queryable, not free text):

| Code | Meaning |
|---|---|
| `unit_mismatch` | Unit present but not in conversion table |
| `missing_unit` | No unit on source row |
| `outlier_value` | Quantity > statistical threshold |
| `unknown_plant` | Plant code not in tenant's PlantCode lookup |
| `missing_period` | No parseable date/period found |
| `negative_value` | Quantity is negative (may indicate a reversal posting) |
| `missing_distance` | Travel row has no distance and IATA compute failed |
| `manual_review` | Analyst manually flagged |
| `duplicate_suspect` | Possible duplicate (not auto-detected yet — see TRADEOFFS.md) |

### DB Indexes

```python
Index(['tenant', 'scope',       'status'])   # primary review filter
Index(['tenant', 'source_type', 'status'])   # source breakdown
Index(['tenant', 'activity_date'])           # date-range reporting
Index(['batch',  'status'])                  # batch detail views
Index(['tenant', 'co2e_kg'])                 # emission totals
```

---

## EmissionFactor (Versioned)

Global table (not tenant-scoped). Each factor has `effective_from` and `effective_to` (NULL = active).
Records snapshot the factor value at ingestion time. This table is the authoritative reference for:
- What factors are currently in use
- Historical factor values for audit questions ("what EF were you using in Q1 2024?")

---

## PlantCode

Per-tenant lookup table: `{code} → {name, country, region, grid_region}`.
Used by the SAP parser to resolve `1000` → `Frankfurt Main Plant (DE)` and determine
which grid EF to apply for any electricity from that plant.
`unknown_plant` flag fires when a SAP plant code is not found in this table.

---

## What This Model Deliberately Does Not Handle

See TRADEOFFS.md for full rationale. In brief:
- Market-based vs location-based Scope 2 (tariff code stored, logic not implemented)
- GHG Protocol Category breakdown within Scope 3 beyond Category 6
- Organisational boundary methodology (equity share vs operational control)
- Row-level semantic deduplication (batch-level SHA-256 only)
