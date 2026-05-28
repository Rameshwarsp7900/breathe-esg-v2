# Breathe ESG — Emissions Ingestion & Review Platform

Django REST + React prototype for ingesting multi-source GHG emissions data, normalising it to
SI units, flagging anomalies, and surfacing an analyst review dashboard before audit lock.

## Live Demo
- **App:** [Deploy to Vercel — see DEPLOYMENT_CHECKLIST.md]
- **API:** [Deploy to Railway — see DEPLOYMENT_CHECKLIST.md]
- **Database:** [Supabase PostgreSQL — see MIGRATION_GUIDE.md]
- **Credentials:** `admin` / `admin123`  ·  `analyst` / `analyst123`  ·  `viewer` / `viewer123`

> 🚀 **Quick Start**: New here? Start with [GETTING_STARTED.md](GETTING_STARTED.md)  
> 📋 **Deploy Now**: Follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for step-by-step deployment (~30 minutes)  
> 📖 **Full Guide**: See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed migration instructions

---

## 📚 Documentation

**→ [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Complete documentation guide with reading paths

### Getting Started
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - 🚀 Start here! Complete beginner's guide
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment guide (~30 minutes)
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - One-page command reference

### Deployment & Configuration
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Comprehensive migration instructions
- **[DEPLOYMENT_DIAGRAM.md](DEPLOYMENT_DIAGRAM.md)** - Visual architecture diagrams
- **[ENV_VARIABLES.md](ENV_VARIABLES.md)** - Complete environment variables reference
- **[FAQ.md](FAQ.md)** - Frequently asked questions and troubleshooting

### Architecture & Design
- **[ARCHITECTURE_COMPARISON.md](ARCHITECTURE_COMPARISON.md)** - Before/after architecture analysis
- **[MODEL.md](MODEL.md)** - Data model documentation
- **[DECISIONS.md](DECISIONS.md)** - Architecture decision records
- **[TRADEOFFS.md](TRADEOFFS.md)** - What we didn't build and why
- **[SOURCES.md](SOURCES.md)** - Emission factor sources and references

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

## Deploy: Supabase + Railway + Vercel

### Quick Deployment (30 minutes)

**Follow the step-by-step checklist**: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

### Architecture
- **Database**: Supabase (managed PostgreSQL)
- **Backend**: Railway (Django REST API)
- **Frontend**: Vercel (React SPA)

### Free Tier Limits
- **Supabase**: 500MB database, unlimited API requests
- **Railway**: $5 credit/month (~500 execution hours)
- **Vercel**: Unlimited deployments, 100GB bandwidth/month

**Total Monthly Cost: $0** (within free tier limits)

### Detailed Migration Guide
For comprehensive instructions including optional Supabase Auth migration, see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

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
