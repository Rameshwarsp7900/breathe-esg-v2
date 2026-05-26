# DECISIONS.md — Every Ambiguity Resolved

---

## 1. SAP: Which export format?

**Options:** IDoc (ALE/EDI), OData (SAP Gateway), BAPI (RFC), flat file (GUI export).

**Chose:** MM60/MB51 flat file — tab-delimited, exported from SAP GUI.

**Why:**
IDoc requires ALE/EDI middleware configured on the client's SAP Basis — weeks of effort.
OData requires SAP Gateway to be set up and a service exposed — not standard on SAP ECC.
BAPI requires live RFC connectivity, VPN, RFC user, and authorisations.
**The real workflow**: a sustainability analyst runs MM60 (Material Consumption) or MB51 (Material Documents)
in SAP GUI, clicks "Local File", and emails a .txt file. This is what actually happens at every manufacturing client.

**Subset handled:** Fuel and combustible materials only (filtered by material description keywords and
material group patterns like `B001`, `B002`, `FUEL`, `ENER`). Movement types filtered to consumption
postings only (201, 261, 281, 291, 601). Non-fuel procurement (office supplies, raw materials) skipped
— that would be Scope 3 Category 1, requiring a spend-based methodology outside this MVP.

**German locale handled:** Column headers (Werk/Menge/ME/Periode), decimal notation (12.450,00 → 12450.00),
period format (2024001 = Jan 2024), date format (DD.MM.YYYY).

**What I'd ask PM:** Does any client have S/4HANA with OData enabled and IT willing to configure an RFC?
If yes, an OData pull is strictly better (scheduled, no manual export). For the first three clients, flat file.

---

## 2. Utility: Portal CSV vs PDF vs API?

**Chose:** Portal CSV export.

**Why:**
PDF: OCR is fragile; every utility has a different bill layout; layout changes break parsers.
Utility API: Green Button Direct Connect exists for US utilities but requires OAuth enrollment per
account per utility — a multi-week IT engagement. Enterprise clients span multiple utilities
(PG&E for CA, ComEd for IL, MSEDCL for Mumbai) and can't maintain separate OAuth integrations.
**Portal CSV**: Every utility has a "Download Usage Data" button. Green Button CSV is NAESB-standard
and covers PG&E, ConEd, Ameren, Xcel. BESCOM/MSEDCL/SP Group have similar exports.

**Key issue handled:** Billing periods don't align with calendar months (a "January" bill covers
Dec 23 – Jan 21). We store `period_start` and `period_end` separately from `activity_date`.

**Renewable tariff detection:** Tariff codes containing 'solar', 'wind', 'renewable', 'green'
trigger market-based EF of 0.0 kg/kWh. We flag this as "unverified" — real deployment would
require REC certificate validation.

**What I'd ask PM:** Do any clients have advanced metering infrastructure (15-min interval data)?
If yes, aggregation to monthly before storage is necessary — 35,040 rows/meter/year is too granular
for the current review workflow.

---

## 3. Travel: Concur API vs CSV export?

**Chose:** CSV report export from Concur/Navan.

**Why:**
Concur REST API requires OAuth2 client credentials from the client's SAP Concur tenant.
This is a multi-week IT engagement per client. In practice, travel managers run a "Travel Summary"
report in Concur, export to CSV, and email to the sustainability team monthly.
Navan (TripActions) has the same workflow. The CSV column structure is consistent enough to handle
both with a shared alias mapping.

**Distance computation:** Concur often omits flight distance. When absent, we compute via Haversine
on IATA airport coordinates (80 major airports embedded; full deployment queries an IATA DB).
This is cited on the record as `distance_source: computed_iata(JFK→LHR)`.

**Cabin class:** Business class gets 2× economy emission factor (seat area methodology, DEFRA 2023).
First class gets 3×. Premium Economy gets 1.3×. This matters — a transatlantic business trip
produces ~2,160 kg CO₂e vs ~1,081 kg in economy.

**What I'd ask PM:** Which travel platforms do the first three clients use? If Concur dominates,
the OAuth API integration pays off after 3+ clients.

---

## 4. Grid emission factors: Per-file vs per-meter?

**Chose:** Per-file (user selects country on upload) with per-row override from `grid_region` column.

**Why:** Different facilities in the same upload may be in different countries (Mumbai and Singapore
meters in the same export). The parser reads `grid_region` column if present; falls back to the
user-provided country parameter; falls back to DEFAULT.

**What I'd ask PM:** Do clients have mixed-country exports from a single portal? If yes, the
per-row `grid_region` column approach is already implemented.

---

## 5. Multi-tenancy: Row-level vs schema-per-tenant?

**Chose:** Row-level isolation with `tenant` FK on every table.

**Why:** For a seed-stage product with <50 tenants, schema-per-tenant adds:
- Separate migration scripts per tenant
- N separate database connection pools
- More complex backup/restore logic
Application-layer isolation via `TenantMembership` is correct at this scale.
**Escalation trigger:** When a client requires contractual data isolation guarantees
(common in financial services, government), Django's multi-db routing supports migrating
a tenant to a dedicated schema/DB without rewriting application logic.

---

## 6. Emission factor storage: Embedded vs DB table?

**Chose:** Both — parsers use hardcoded dicts for performance, `EmissionFactor` DB table
stores the authoritative versioned reference.

**Why:** Runtime queries to a DB table on every parsed row would add latency.
Hardcoded dicts in `constants.py` are fast and testable. The DB table serves as:
- Audit reference ("what EF was used in Q1 2024?")
- Admin interface for future updates
- API endpoint for the Emission Factors page in the UI

**What I'd ask PM:** Do clients need CBAM-compliant factors? CBAM (EU Carbon Border Adjustment
Mechanism) requires supplier-specific EFs — a fundamentally different methodology.

---

## 7. Duplicate detection: Checksum vs semantic?

**Chose:** Batch-level SHA-256 checksum only.

**Why:** Row-level semantic deduplication (same plant + period + quantity = likely duplicate)
requires defining similarity thresholds per source type, and a UI for resolving conflicts.
That's a 2-week feature with unclear requirements.
The checksum prevents the most common accident: clicking Upload twice.

**What I'd ask PM:** Do clients re-send corrected files (e.g. Q1 data re-sent with corrections)?
If yes, we need a semantic dedup strategy. At minimum, a "supersedes batch X" field on the batch.

---

## 8. Audit lock: Soft vs hard?

**Chose:** Soft lock at application layer — `_check_not_locked()` raises `PermissionError`
before any mutation. Not a database-level constraint.

**Why:** Database triggers or row-level security are harder to test and complicate migrations.
Application-level enforcement with a clear exception is sufficient for an audit trail.

**What I'd ask PM:** Does the audit engagement require a *signed* export with a hash manifest?
GHG Protocol assurance engagements typically want a frozen dataset with a cryptographic proof.
That would require an export endpoint producing a signed PDF/CSV — not built in this prototype.
