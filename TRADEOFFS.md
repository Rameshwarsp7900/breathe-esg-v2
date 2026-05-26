# TRADEOFFS.md — Three Things Deliberately Not Built

---

## 1. Semantic Row-Level Deduplication

**What it is:** When a client uploads a "corrected" version of last quarter's data, detect that
row 14 in the new file matches row 14 from the previous batch (same plant, period, material,
approximate quantity) and either merge them, flag the conflict, or offer a "supersedes" relationship.

**Why not built:**
The definition of "match" is ambiguous. Exact quantity match rejects legitimate corrections.
Fuzzy match (quantity within 5%, same plant and period) requires tuning per source type and
will produce false positives. The UX for conflict resolution (show both versions, let analyst choose,
propagate the edit to approved downstream records) is a multi-week feature with hard-to-test logic.

**What was built instead:**
Batch-level SHA-256 deduplication — if the *same file bytes* are uploaded twice, we reject with 409.
This prevents double-clicks and accidental re-uploads of the exact same export.

**When to build it:** After the first production client complains that uploading a corrected extract
creates duplicate records. At that point the requirement is concrete and the conflict resolution UX
can be designed from a real example, not speculation.

---

## 2. Two-Party Approval with Materiality Thresholds

**What it is:** For records above a CO₂e threshold (e.g. any single record > 100 tCO₂e),
require sign-off from two separate analysts before the record can be locked. Enforce that the
approver cannot be the same user who uploaded the batch. Track "approved by" and
"countersigned by" separately. Escalate to admin if the second approver is unavailable.

**Why not built:**
The approval matrix is a policy question, not an engineering question. Does the threshold apply
per record, per batch, or per source type? What is the materiality threshold — 100t, 50t, or
1% of total inventory? What happens if the second approver is on leave — escalate to admin,
block, or allow after N days? These have no obvious answers without real client input.
Building the mechanism before the policy is decided produces code nobody uses.

**What was built instead:**
Single-analyst `approve()` + `lock()` with full `edit_history` audit trail. `approved_by` and
`approved_at` are stored on every record. This satisfies the accountability requirement.
The `TenantMembership.role` field is already structured to support multi-role enforcement —
adding a second approver requirement is an incremental change once the policy is defined.

**When to build it:** When a specific client's legal or compliance team specifies an approval
matrix in writing. At that point, the requirement will be precise enough to implement correctly.

---

## 3. Versioned Emission Factor Recalculation

**What it is:** When DEFRA releases 2024 factors (typically June each year), automatically
identify all records in approved-but-not-locked status that used 2023 factors, recalculate
their CO₂e with the new factors, generate a diff report showing the delta, and require analyst
re-approval of records where the change exceeds a threshold.

**Why not built:**
This requires a scheduled job, a diff model, a re-approval workflow, and a UI for reviewing
recalculated deltas. It also raises the question: should locked records ever be recalculated?
(Answer: no — locked means frozen for the audit period. But approved-not-locked records are ambiguous.)
The feature is only needed once a reporting cycle closes and the next one begins with updated factors —
which means it's not needed for the prototype.

**What was built instead:**
The `EmissionFactor` model has `effective_from` / `effective_to` date fields and is the
authoritative versioned reference. Records store `emission_factor`, `emission_factor_unit`,
and `emission_factor_source` as a snapshot — so the factor used is always auditable.
Adding a recalculation job on top of this foundation is straightforward once the recalculation
policy (which records, which threshold, who approves) is defined.

**When to build it:** When the first client completes a reporting year and asks "can we update
our Q1 numbers to use the new DEFRA 2024 factors?" At that point the workflow is concrete.
