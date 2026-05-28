# Architectural Decisions - Breathe ESG

## 1. Ingestion Mechanism: File Upload (CSV/TSV)
**Decision**: Prioritized flat-file uploads over direct API integrations for the prototype.
**Justification**: Research shows SAP users frequently use "Material Document List" (MB51) or "Material Consumption" (MM60) exports. Utility portals (Green Button) and travel platforms (Concur) also provide robust CSV exports. This mechanism is most representative of how sustainability leads currently collect data.
**What I'd ask the PM**: "Do we need to support automated SFTP polling or S3 triggers for the next iteration?"

## 2. SAP Parser: German Locale Support
**Decision**: Explicitly handle German column headers (`Werk`, `Menge`) and decimal notation (`1.234,56`).
**Justification**: Enterprise SAP instances are often configured in German or use German-standard exports even in English-speaking regions. Failure to handle `,` as a decimal separator is a leading cause of data corruption in carbon accounting.
**What I'd ask the PM**: "Should we support IDoc XML parsing directly, or is CSV export sufficient for the first 10 clients?"

## 3. Scope Classification at Ingestion
**Decision**: Hard-code scope logic into parsers based on source type.
- SAP Fuel → Scope 1 (Stationary Combustion)
- Utility Electricity → Scope 2 (Purchased Energy)
- Utility Gas (Sub-metered) → Scope 1
- Travel → Scope 3 (Category 6)
**Justification**: While scopes can overlap, source-based classification provides 95% accuracy and significantly reduces the manual burden on analysts.

## 4. IATA-based Distance Computation
**Decision**: Use a haversine formula with a lookup table of 80 major IATA airport coordinates.
**Justification**: Concur exports often leave the `Distance` column empty but provide `Origin` and `Destination` codes. Manual lookup is too slow for analysts. This automated fallback provides "good enough" data for Scope 3.

## 5. Append-Only Audit Trail
**Decision**: Store edit history in a JSONField on the record rather than a separate `AuditLog` table.
**Justification**: For a prototype, this keeps the record's context self-contained and simplifies the "View Detail" frontend logic. For production, I would move this to a dedicated table or a CDC (Change Data Capture) system.

## 6. Granular Travel Sub-types
**Decision**: Added specific ingestion paths for `travel_hotels` and `travel_ground`.
**Justification**: While a "Unified Travel" parser is powerful, clients often receive separate hotel logs from travel agencies that don't follow the Concur schema. Specific endpoints improve robustness.
