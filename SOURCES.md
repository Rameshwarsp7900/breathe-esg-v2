# SOURCES.md — Real-World Format Research

---

## Source 1: SAP Fuel & Procurement

**Format researched:** MM60 (Consumption Statistics) and MB51 (Material Document List)
flat file exports from SAP GUI.

**What I researched:**
- MM60 transaction: Logistics → MM → Purchasing → Reporting → MM60. Exports per plant per period.
- MB51 transaction: material document list with movement types. 201 = GI to cost center (consumption),
  261 = GI to production order, 202/262 = reversals (produce negative quantities).
- German-locale SAP column headers: Werk (Plant), Menge (Quantity), Mengeneinheit (Unit of Measure),
  Periode (Posting Period), Materialbezeichnung (Material Description), Kostenstelle (Cost Center).
- German decimal: thousands separator is `.`, decimal separator is `,`. So `12.450,00` = 12450.00.
- SAP period: 3-digit posting period. Period 001 = January, 012 = December. Export shows `2024001`.
- Material groups starting with `B` (Betriebsstoffe = operating supplies): typical for fuels in DE.
- Movement type 202 = reversal of 201 — produces negative quantity, should be flagged not silently
  included (negative emissions would undercount).

**What I learned:**
The hardest part of SAP data is semantic interpretation, not parsing. `Werk: 1000, Menge: 12450, ME: L`
is meaningless without knowing plant 1000 = Frankfurt and that the material is diesel not hydraulic fluid.
This is why `PlantCode` is a first-class model, not a JSON lookup.

**Why sample data looks the way it does:**
- Frankfurt (1000): German headers, German decimals (12.450,00), natural gas in M3
- Chicago (2000): US English headers, GAL units, ASTM material standard reference
- Singapore (3000): English headers, L units
- Mumbai (4000): English headers, L units, Furnace Oil (common in Indian industry)
- Edge case row: `DRUM` unit → `unit_mismatch` flag triggered
- Edge case row: quantity 9,999,999 L → `outlier_value` flag triggered
- Edge case row: movement type 202 (reversal) → filtered out correctly
- Office supplies row (EA unit) → correctly filtered as non-fuel

**What would break in production:**
1. Material master sync: our keyword filter misclassifies materials named "Dieselaggregat" (diesel generator)
2. Plant hierarchies: storage locations within a plant — we aggregate at plant level
3. Multiple SAP instances: a multinational may have EU SAP + US SAP with overlapping plant code namespaces
4. Credit memos: movement type 162 (returns to vendor) appears in MB51 and reduces inventory without
   producing emissions — needs separate handling

---

## Source 2: Utility Electricity

**Format researched:** Green Button NAESB standard CSV (US) and generic utility portal CSV exports
(India/Singapore/Europe).

**What I researched:**
- Green Button standard: DATE, START TIME, END TIME, USAGE, UNITS, COST, NOTES columns.
  Comment lines beginning with `#` precede the header. Supported by PG&E, ConEd, Ameren, Xcel.
- BESCOM (Bangalore) portal: meter_id, read_date, quantity, unit, cost, account_number columns.
- MSEDCL (Maharashtra) HT industrial export: similar structure. INR costs.
- SP Group (Singapore): English columns, SGD costs, kWh units.
- Billing cycle misalignment: utilities run 28-32 day cycles, not calendar months. A "January" bill
  may cover Dec 23–Jan 21. We store `period_start` and `period_end` separately from `read_date`.
- Renewable tariffs: PG&E "Solar Choice", "EV Rate", "BioMAT" — these trigger near-zero EF
  under GHG Protocol market-based Scope 2 accounting.
- Unit conversions needed: kWh (most common), MWh (large industrial), therms (gas sub-metering),
  MMBTU (US industrial gas), GJ (some EU meters).

**Why sample data looks the way it does:**
- US billing cycles (MTR-US-001) don't start Jan 1 — they start Dec 28 from the previous cycle
- MWh unit (MTR-DE-002) → conversion to kWh tested (×1000)
- Solar tariff (MTR-US-002) → co2e_kg = 0.0 (market-based accounting)
- MMBTU unit (MTR-IN-003) → MMBTU→kWh conversion (×293.071)
- Unknown facility row → `unknown_plant` + `negative_value` flags both triggered
- Multiple meters for Mumbai Manufacturing → multi-meter aggregation tested

**What would break in production:**
1. Interval data (15-min AMI): 35,040 rows/meter/year overwhelms the current row-per-record model
2. Gas sub-metering in utility exports: natural gas is Scope 1, not Scope 2 — would be misclassified
3. Demand charges (kW) mixed with consumption (kWh) in some exports — needs unit filtering
4. REC certificate validation: we detect renewable tariffs by keyword, not by verifying certificates

---

## Source 3: Corporate Travel

**Format researched:** Concur Travel & Expense CSV report export and Navan (TripActions) export.

**What I researched:**
- Concur REST API: `/api/travel/trip/v1` with OAuth2. Requires OAuth2 client credentials from
  client's SAP Concur tenant — not available for initial implementation.
- Concur report builder export: configurable columns, typically includes Employee, Department,
  Trip Start/End, Origin/Destination airports (IATA codes), Travel Type, Booking Class, Amount, Currency.
- IATA airport codes: International Air Transport Association maintains ~9,000 codes.
  Concur exports typically include 3-letter codes (JFK, LHR) not city names.
- Distance in Concur exports: present only when booking made through connected GDS (Amadeus/Sabre)
  and distance field populated. Often absent — requiring IATA computation.
- DEFRA 2023 cabin class factors: Economy short-haul 0.255 kg/pkm, Economy long-haul 0.195 kg/pkm,
  Business short-haul 0.510 kg/pkm (2× economy — seat area methodology),
  Business long-haul 0.390 kg/pkm, First class 3× economy.
- Long-haul threshold: DEFRA defines at 3,700 km.
- Hotel factors (DEFRA 2023): per room-night by destination country. US 31.2, UK 24.0, DE 19.5, IN 10.1.
  Japan 24.8, Singapore 22.5, UAE 30.1.
- Rail (DEFRA 2023): 0.041 kg CO₂e/pkm (UK national rail average). Used for Deutsche Bahn, Eurostar.

**Why sample data looks the way it does:**
- JFK→LHR Business: distance computed from IATA (5,540 km, long-haul), business EF → 2,160 kg CO₂e
- LHR→CDG Economy: short-haul (340 km), economy EF → 88 kg CO₂e
- ORD→LAX: distance provided in file (2,982 km), used directly (not computed)
- Rail row (FRA–CDG): travel type Rail, distance 1,200 km, EF 0.041 → 49 kg CO₂e
- Car rental (Midsize, 350 km): EF 0.171 → 60 kg CO₂e
- Short city hop car rental (85 km): EF 0.143 → 12 kg CO₂e
- JP hotels: HOTEL_EF JP = 24.8 (correctly resolved in v2, was missing in v1)
- AE hotels: HOTEL_EF AE = 30.1 (new in v2)
- missing_distance flag: car without distance triggers correctly (not missing_period as in v1)

**What would break in production:**
1. IATA coverage: our table has 80 airports. Regional routes (e.g. BHQ – Broken Hill, AU) fail computation
2. Multi-leg trips as one row: JFK→LHR→CDG as a single booking understates distance
3. Mileage reimbursements: personal vehicle in expense system — no distance, no EF possible
4. Rail vs bus: both appear as "ground" in some Concur exports; bus EF ≠ rail EF
5. Charter flights: no standard IATA codes, distance computation impossible
