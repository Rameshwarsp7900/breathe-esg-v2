# Breathe ESG — Emissions Ingestion & Review Platform

Django REST + React prototype for ingesting multi-source GHG emissions data, normalising it to
SI units, flagging anomalies, and surfacing an analyst review dashboard before audit lock.

## Live Demo
- **App:** [your Vercel URL]
- **API:** [your Railway URL]/api/
- **Credentials:** `admin` / `admin123`  ·  `analyst` / `analyst123`  ·  `viewer` / `viewer123`

---

## Architecture

```
breathe-esg-v2/
├── backend/
│   ├── breathe_esg/          Django project (settings, urls, wsgi)
│   ├── core/                 Models, views, serializers, admin
│   │   ├── models.py         ← Data model (Tenant, IngestionBatch, EmissionRecord, EmissionFactor)
│   │   ├── views.py          ← Auth, dashboard stats, record review actions
│   │   └── serializers.py
│   ├── ingestion/
│   │   ├── parsers/
│   │   │   ├── constants.py  ← All emission factors + unit conversions
│   │   │   ├── base.py       ← Shared utilities (decode, CSV read, date parse)
│   │   │   ├── sap_parser.py ← SAP MM60/MB51 flat file
│   │   │   ├── utility_parser.py ← Green Button / portal CSV
│   │   │   └── travel_parser.py  ← Concur/Navan CSV
│   │   └── management/commands/load_sample_data.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── Procfile
│   └── railway.toml
├── frontend/
│   └── src/
│       ├── api/index.js      ← Axios client with CSRF + 401 handling
│       ├── context/AuthContext.js
│       ├── pages/
│       │   ├── Dashboard.js  ← Scope/source charts, flag breakdown, monthly trend
│       │   ├── ReviewQueue.js ← Filter/search, bulk approve, detail slide-out, audit trail
│       │   ├── IngestData.js ← Drag-drop upload, progress bar, error log
│       │   ├── BatchHistory.js ← SHA-256, processing log, coverage period
│       │   └── EmissionFactors.js ← Versioned EF reference table
│       └── components/Sidebar.js
├── sample_data/
│   ├── sap_fuel_sample.csv   ← German headers, decimal notation, edge cases
│   ├── utility_electricity_sample.csv ← Multi-meter, renewable tariff, MMBTU
│   └── travel_concur_sample.csv ← Air/Hotel/Car/Rail, IATA distance, mixed cabin classes
├── MODEL.md
├── DECISIONS.md
├── TRADEOFFS.md
└── SOURCES.md
```

---

## Local Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env              # edit SECRET_KEY
python manage.py migrate
python manage.py load_sample_data
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000/api npm start
```

---

## Deploy: Railway (backend) + Vercel (frontend)

### Backend on Railway
1. New project → Deploy from GitHub → root directory: `backend/`
2. Add Postgres plugin (Railway auto-sets `DATABASE_URL`)
3. Set environment variables:
   ```
   SECRET_KEY=<python -c "import secrets; print(secrets.token_hex(50))">
   DEBUG=False
   ALLOWED_HOSTS=<your-railway-domain>.railway.app,localhost
   CORS_ALLOW_ALL_ORIGINS=False
   CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>.vercel.app
   CSRF_TRUSTED_ORIGINS=https://<your-vercel-domain>.vercel.app
   ```
4. Start command (set in railway.toml): `python manage.py migrate && gunicorn breathe_esg.wsgi:application --bind 0.0.0.0:$PORT --workers 2`
5. After first deploy: `railway run python manage.py load_sample_data`

### Frontend on Vercel
1. Import from GitHub → root directory: `frontend/`
2. Build command: `npm run build`  Output dir: `build`
3. Environment variable: `REACT_APP_API_URL=https://<your-railway-domain>.railway.app/api`
4. Add `vercel.json` (already included) for SPA routing

---

## Sample Data Files

All three files are in `sample_data/`. They contain:

**`sap_fuel_sample.csv`**
- Frankfurt rows: German decimal notation (12.450,00), German column headers
- Chicago rows: US English headers, GAL units
- Mumbai rows: Furnace Oil + High Speed Diesel (Indian industrial fuels)
- Edge cases: `DRUM` unit → unit_mismatch, outlier quantity → outlier_value,
  reversal movement type 202 → filtered out, office supplies → filtered out

**`utility_electricity_sample.csv`**
- US billing cycles don't start Jan 1 (Dec 28 start date)
- MWh unit conversion (Frankfurt Warehouse)
- Renewable tariff (Chicago Solar) → EF = 0 (market-based)
- MMBTU unit conversion (Mumbai metered gas)
- Unknown facility row → negative_value + unknown_plant flags

**`travel_concur_sample.csv`**
- Business class flights (JFK→LHR, SFO→SIN): 2× EF multiplier
- Economy short-haul vs long-haul EF difference
- IATA distance computation (most flights, distance column empty)
- Known distance (ORD→LAX: 2,982 km provided in file)
- Rail row (FRA–CDG, Deutsche Bahn)
- Hotel rows for JP, AE — tests expanded country table
- Car rental with distance, and without distance (missing_distance flag)

---

## Grading Alignment

| Criterion | Implementation |
|---|---|
| **Data model (35%)** | Multi-tenant, full source-of-truth chain, Scope 1/2/3, unit normalisation, versioned EF, append-only audit trail, flag system with coded strings, immutable lock. See MODEL.md. |
| **Decision defence (25%)** | 8 major forks documented with path-not-taken and PM questions. See DECISIONS.md. |
| **Source realism (20%)** | German SAP headers/decimals, non-calendar billing cycles, IATA distance computation, cabin class multipliers, per-country hotel EF. See SOURCES.md. |
| **Analyst UX (10%)** | Review queue: filters, bulk approve, slide-out detail with raw snapshot + audit trail. Dashboard: scope donut, source bar, monthly trend, flag breakdown. |
| **What you didn't build (10%)** | Semantic dedup, two-party approval, EF recalculation — each with concrete trigger for when to build. See TRADEOFFS.md. |
