# Data Model - Breathe ESG

## Core Principles
The data model is designed for **auditability**, **multi-tenancy**, and **normalization**.

### 1. Multi-Tenancy
- **Tenant**: Represents an enterprise client (e.g., a multi-national corporation).
- **Row-level isolation**: Every record (`EmissionRecord`, `IngestionBatch`, `PlantCode`) is linked to a `Tenant` via a foreign key. All queries are scoped by `tenant_slug` to ensure data privacy.
- **TenantMembership**: Handles RBAC (Admin, Analyst, Viewer) within a tenant.

### 2. Ingestion & Source Tracking
- **IngestionBatch**: Represents a single upload event.
  - Stores the original filename and a **SHA-256 checksum** to prevent duplicate ingestion.
  - Preservation: The raw file is stored in `raw/%Y/%m/` to maintain a chain of custody.
  - Processing summary: Tracks success, failure, and flagged counts.
- **EmissionRecord**: The normalized outcome of ingestion.
  - `source_row_ref`: Tracks the exact row in the source file.
  - `raw_data_snapshot`: JSON field storing the verbatim source row. **Immutable** after creation.
  - `source_specific`: JSON field for type-specific data (e.g., `meter_id`, `cabin_class`).

### 3. Normalization & CO2e Calculation
- **Unit Normalization**: All activity data is converted to SI units (`liters`, `kWh`, `kg`, `km`) during ingestion. Both `raw_quantity` and `quantity_norm` are stored.
- **Emission Factors**:
  - `EmissionFactor` table: Reference table for factors (DEFRA, IPCC, IEA).
  - Snapshotting: At ingestion time, the specific EF value, unit, and source are copied onto the `EmissionRecord`. This ensures that historical records don't change if the reference table is updated.
- **CO2e Storage**: Always stored in **kilograms (kg)** to avoid precision issues with small values in tonnes.

### 4. Audit Trail & Record State
- **Status Workflow**: `pending_review` → `flagged` (if anomalies found) → `approved` → `locked`.
- **Edit History**: An append-only JSON list of `{user, ts, field, old, new}`. Manual overrides of `raw_quantity` or `raw_unit` are recorded here.
- **Immutability**: Once a record is marked `locked`, all mutations are blocked at the model level via `_check_not_locked()`.

### 5. Anomaly Detection (Flagging)
Anomalies are stored as queryable `flag_codes` (e.g., `outlier_value`, `unit_mismatch`). This allows analysts to filter for "dirty" data without affecting the calculation.
