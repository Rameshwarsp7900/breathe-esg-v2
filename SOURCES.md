# Data Sources Research - Breathe ESG

## 1. SAP (Fuel & Procurement)
### Real-world Format
Research into SAP MB51 (Material Document List) and MM60 (Material List) shows that data is typically exported as Tab-Separated Values (.txt) or Semicolon-Separated Values (.csv).
- **Learning**: European instances use `,` as a decimal separator and `.` as a thousands separator.
- **Movement Types**: Not all material movements represent emissions. We filtered for `201` (Goods issue for cost center) and similar, while ignoring transfers or returns.

### Sample Data Justification
`sap_fuel_hostile.csv` includes:
- German headers (`Werk`, `Menge`) to test alias mapping.
- Mixed date formats (`2024001` SAP format vs `01.2024`).
- European notation (`12.450,00`) to test the robustness of the `normalize_decimal` utility.

---

## 2. Utility Data (Electricity)
### Real-world Format
We targeted the **Green Button (NAESB)** standard and generic portal exports.
- **Learning**: Billing periods rarely align with calendar months (e.g., Dec 28 to Jan 27). We handle this by storing both `period_start` and `period_end` on the record.
- **Gas Sub-metering**: Many "Electricity" bills also include natural gas in MMBTU or therms. Our parser detects these units and shifts the Scope from 2 to 1 automatically.

### Sample Data Justification
`utility_electricity_sample.csv` includes:
- Multi-meter exports.
- Renewable tariffs (e.g., "Solar-Green") which apply a market-based EF of `0.0`.

---

## 3. Corporate Travel (Concur/Navan)
### Real-world Format
Concur "Intelligence" reports are the gold standard for travel data.
- **Learning**: Cabin class is often missing or represented by a single code (J, Y, F). EF factors vary by ~3x between Economy and First Class.
- **Distance**: Distance is frequently missing for car rentals or short-haul flights. We implemented a Haversine fallback for flights.

### Sample Data Justification
`travel_concur_hostile.csv` includes:
- IATA codes for distance fallback (JFK, LHR).
- Cabin codes (J for Business).
- Mixed Rail/Car/Hotel types to test the unified travel parser.

---

## 4. Emission Factor References
- **Scope 1/2**: IEA 2023 and EPA AP-42.
- **Scope 3**: DEFRA 2023 (United Kingdom) was used as the primary source for hotel and aviation factors due to its high granularity (cabin classes, haul lengths).
