## 2025-05-15 - [Backend N+1 Query in IngestionBatch]
**Learning:** The `IngestionBatchSerializer` uses a `SerializerMethodField` to access `uploaded_by.username`. Without `select_related('uploaded_by')` on the QuerySet, Django executes an additional SQL query for every batch in a list, leading to O(N) queries for a list of N batches. This was particularly visible in the dashboard's "Recent Batches" table and the main Batch History view.
**Action:** Always use `.select_related('uploaded_by')` when querying `IngestionBatch` models that will be serialized using `IngestionBatchSerializer`.
