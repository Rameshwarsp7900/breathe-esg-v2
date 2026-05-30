## 2025-05-15 - [N+1 Query in IngestionBatchSerializer]
**Learning:** The `IngestionBatchSerializer` uses a `SerializerMethodField` to fetch the `uploaded_by` user's name, which triggers a separate database query for each batch in a list if not pre-fetched.
**Action:** Always use `.select_related('uploaded_by')` when querying `IngestionBatch` records that will be serialized.
