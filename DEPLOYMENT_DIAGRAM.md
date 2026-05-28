# Deployment Architecture Diagram

Visual guide to understanding the Breathe ESG deployment architecture.

---

## 🌐 Production Architecture

```
                                    ┌─────────────────────────────────┐
                                    │         END USERS               │
                                    │    (Browsers, Mobile Apps)      │
                                    └────────────┬────────────────────┘
                                                 │
                                                 │ HTTPS
                                                 │
                    ┌────────────────────────────┴────────────────────────────┐
                    │                                                         │
                    │                                                         │
         ┌──────────▼──────────┐                              ┌──────────────▼─────────┐
         │                     │                              │                        │
         │   VERCEL (CDN)      │                              │   VERCEL (CDN)         │
         │   Edge Location 1   │                              │   Edge Location N      │
         │   (New York)        │                              │   (Singapore)          │
         │                     │                              │                        │
         │   - React SPA       │                              │   - React SPA          │
         │   - Static Assets   │                              │   - Static Assets      │
         │   - Auto HTTPS      │                              │   - Auto HTTPS         │
         │                     │                              │                        │
         └──────────┬──────────┘                              └────────────┬───────────┘
                    │                                                      │
                    └──────────────────────┬───────────────────────────────┘
                                           │
                                           │ API Requests
                                           │ (Authorization: Token xxx)
                                           │
                                  ┌────────▼────────┐
                                  │                 │
                                  │   RAILWAY       │
                                  │   (US-West)     │
                                  │                 │
                                  │  Django Backend │
                                  │  ┌───────────┐  │
                                  │  │ Gunicorn  │  │
                                  │  │ Workers   │  │
                                  │  │ (2 procs) │  │
                                  │  └─────┬─────┘  │
                                  │        │        │
                                  │  ┌─────▼─────┐  │
                                  │  │  Django   │  │
                                  │  │  REST API │  │
                                  │  └─────┬─────┘  │
                                  │        │        │
                                  │  ┌─────▼─────┐  │
                                  │  │  Business │  │
                                  │  │  Logic    │  │
                                  │  │  Parsers  │  │
                                  │  └─────┬─────┘  │
                                  │        │        │
                                  └────────┼────────┘
                                           │
                                           │ PostgreSQL
                                           │ Connection Pool
                                           │
                                  ┌────────▼────────┐
                                  │                 │
                                  │   SUPABASE      │
                                  │   (US-East)     │
                                  │                 │
                                  │  PostgreSQL 15  │
                                  │  ┌───────────┐  │
                                  │  │ Database  │  │
                                  │  │ - Tenants │  │
                                  │  │ - Users   │  │
                                  │  │ - Records │  │
                                  │  │ - Batches │  │
                                  │  └───────────┘  │
                                  │                 │
                                  │  ┌───────────┐  │
                                  │  │  Backups  │  │
                                  │  │  (Daily)  │  │
                                  │  └───────────┘  │
                                  │                 │
                                  └─────────────────┘
```

---

## 🔄 Request Flow

### 1. User Login

```
┌──────┐     ┌────────┐     ┌─────────┐     ┌──────────┐
│ User │────▶│ Vercel │────▶│ Railway │────▶│ Supabase │
└──────┘     └────────┘     └─────────┘     └──────────┘
   │             │               │                │
   │ 1. Enter    │               │                │
   │ credentials │               │                │
   │             │               │                │
   │             │ 2. POST       │                │
   │             │ /api/auth/    │                │
   │             │ login/        │                │
   │             │               │                │
   │             │               │ 3. SELECT      │
   │             │               │ FROM auth_user │
   │             │               │                │
   │             │               │ 4. User data   │
   │             │               │◀───────────────│
   │             │               │                │
   │             │ 5. Generate   │                │
   │             │ auth token    │                │
   │             │               │                │
   │             │ 6. Return     │                │
   │             │ token         │                │
   │             │◀──────────────│                │
   │             │               │                │
   │ 7. Store    │               │                │
   │ token in    │               │                │
   │ localStorage│               │                │
   │◀────────────│               │                │
```

### 2. Dashboard Load

```
┌──────┐     ┌────────┐     ┌─────────┐     ┌──────────┐
│ User │────▶│ Vercel │────▶│ Railway │────▶│ Supabase │
└──────┘     └────────┘     └─────────┘     └──────────┘
   │             │               │                │
   │ 1. Visit    │               │                │
   │ /dashboard  │               │                │
   │             │               │                │
   │             │ 2. Serve      │                │
   │             │ React SPA     │                │
   │◀────────────│               │                │
   │             │               │                │
   │ 3. GET      │               │                │
   │ /api/stats/ │               │                │
   │ (with token)│               │                │
   │────────────▶│               │                │
   │             │               │                │
   │             │ 4. Forward    │                │
   │             │ request       │                │
   │             │──────────────▶│                │
   │             │               │                │
   │             │               │ 5. Aggregate   │
   │             │               │ queries        │
   │             │               │───────────────▶│
   │             │               │                │
   │             │               │ 6. Results     │
   │             │               │◀───────────────│
   │             │               │                │
   │             │ 7. JSON       │                │
   │             │ response      │                │
   │             │◀──────────────│                │
   │             │               │                │
   │ 8. Render   │               │                │
   │ charts      │               │                │
   │◀────────────│               │                │
```

### 3. File Upload

```
┌──────┐     ┌────────┐     ┌─────────┐     ┌──────────┐
│ User │────▶│ Vercel │────▶│ Railway │────▶│ Supabase │
└──────┘     └────────┘     └─────────┘     └──────────┘
   │             │               │                │
   │ 1. Select   │               │                │
   │ CSV file    │               │                │
   │             │               │                │
   │ 2. POST     │               │                │
   │ /api/       │               │                │
   │ ingestion/  │               │                │
   │ upload/     │               │                │
   │────────────▶│               │                │
   │             │               │                │
   │             │ 3. Forward    │                │
   │             │ multipart     │                │
   │             │──────────────▶│                │
   │             │               │                │
   │             │               │ 4. Save file   │
   │             │               │ to disk        │
   │             │               │                │
   │             │               │ 5. Parse CSV   │
   │             │               │                │
   │             │               │ 6. INSERT      │
   │             │               │ records        │
   │             │               │───────────────▶│
   │             │               │                │
   │             │               │ 7. Confirm     │
   │             │               │◀───────────────│
   │             │               │                │
   │             │ 8. Return     │                │
   │             │ batch_id      │                │
   │             │◀──────────────│                │
   │             │               │                │
   │ 9. Show     │               │                │
   │ success     │               │                │
   │◀────────────│               │                │
```

---

## 🗄️ Database Schema (Simplified)

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE DATABASE                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────────┐
│   Tenant     │         │   auth_user      │
├──────────────┤         ├──────────────────┤
│ id (UUID)    │         │ id               │
│ name         │         │ username         │
│ slug         │         │ password         │
│ created_at   │         │ email            │
└──────┬───────┘         └────────┬─────────┘
       │                          │
       │                          │
       │         ┌────────────────┴──────────────┐
       │         │                               │
       │    ┌────▼──────────┐         ┌─────────▼────────┐
       │    │ TenantMember  │         │  EmissionFactor  │
       │    ├───────────────┤         ├──────────────────┤
       │    │ user_id (FK)  │         │ category         │
       │    │ tenant_id(FK) │         │ substance        │
       │    │ role          │         │ kg_co2e          │
       │    └───────────────┘         │ source           │
       │                              └──────────────────┘
       │
       │    ┌────────────────┐
       └───▶│ IngestionBatch │
            ├────────────────┤
            │ id (UUID)      │
            │ tenant_id (FK) │
            │ source_type    │
            │ status         │
            │ uploaded_by    │
            │ source_file    │
            │ checksum       │
            └────────┬───────┘
                     │
                     │
            ┌────────▼────────┐
            │ EmissionRecord  │
            ├─────────────────┤
            │ id (UUID)       │
            │ tenant_id (FK)  │
            │ batch_id (FK)   │
            │ scope           │
            │ category        │
            │ quantity_norm   │
            │ co2e_kg         │
            │ status          │
            │ flag_codes      │
            │ edit_history    │
            │ locked_at       │
            └─────────────────┘
```

---

## 🔐 Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                        │
└─────────────────────────────────────────────────────────────┘

1. TRANSPORT SECURITY
   ┌──────────────────────────────────────────┐
   │  All traffic over HTTPS (TLS 1.3)       │
   │  - Vercel: Auto SSL certificates         │
   │  - Railway: Auto SSL certificates        │
   │  - Supabase: Encrypted connections       │
   └──────────────────────────────────────────┘

2. AUTHENTICATION
   ┌──────────────────────────────────────────┐
   │  Token-based authentication              │
   │  - User logs in with credentials         │
   │  - Django generates auth token           │
   │  - Token stored in localStorage          │
   │  - Token sent in Authorization header    │
   └──────────────────────────────────────────┘

3. AUTHORIZATION
   ┌──────────────────────────────────────────┐
   │  Role-based access control               │
   │  - Admin: Full access                    │
   │  - Analyst: Review and approve           │
   │  - Viewer: Read-only                     │
   └──────────────────────────────────────────┘

4. DATA ISOLATION
   ┌──────────────────────────────────────────┐
   │  Multi-tenant architecture               │
   │  - Every query filtered by tenant_id     │
   │  - Users can only see their tenant data  │
   │  - Database-level isolation              │
   └──────────────────────────────────────────┘

5. CORS PROTECTION
   ┌──────────────────────────────────────────┐
   │  Cross-Origin Resource Sharing           │
   │  - Only Vercel domain allowed            │
   │  - CSRF token validation                 │
   │  - Credentials required                  │
   └──────────────────────────────────────────┘

6. AUDIT TRAIL
   ┌──────────────────────────────────────────┐
   │  Immutable audit log                     │
   │  - All changes tracked in edit_history   │
   │  - Locked records cannot be modified     │
   │  - SHA-256 checksums for files           │
   └──────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA INGESTION FLOW                      │
└─────────────────────────────────────────────────────────────┘

1. UPLOAD
   ┌──────────┐
   │ CSV File │
   └────┬─────┘
        │
        ▼
   ┌────────────────┐
   │ Vercel (React) │
   │ - File picker  │
   │ - Validation   │
   └────┬───────────┘
        │
        ▼

2. STORAGE
   ┌─────────────────┐
   │ Railway (Django)│
   │ - Save to disk  │
   │ - SHA-256 hash  │
   └────┬────────────┘
        │
        ▼

3. PARSING
   ┌─────────────────────┐
   │ Parser Selection    │
   │ - SAP Parser        │
   │ - Utility Parser    │
   │ - Travel Parser     │
   └────┬────────────────┘
        │
        ▼
   ┌─────────────────────┐
   │ Row Processing      │
   │ - Decode encoding   │
   │ - Parse dates       │
   │ - Convert units     │
   │ - Calculate CO2e    │
   │ - Detect anomalies  │
   └────┬────────────────┘
        │
        ▼

4. VALIDATION
   ┌─────────────────────┐
   │ Quality Checks      │
   │ - Unit mismatch?    │
   │ - Outlier value?    │
   │ - Missing data?     │
   │ - Negative value?   │
   └────┬────────────────┘
        │
        ▼

5. STORAGE
   ┌─────────────────────┐
   │ Supabase (Postgres) │
   │ - Insert batch      │
   │ - Insert records    │
   │ - Set flags         │
   └────┬────────────────┘
        │
        ▼

6. REVIEW
   ┌─────────────────────┐
   │ Analyst Review      │
   │ - Filter flagged    │
   │ - Approve/reject    │
   │ - Add notes         │
   └────┬────────────────┘
        │
        ▼

7. AUDIT LOCK
   ┌─────────────────────┐
   │ Final Lock          │
   │ - Immutable         │
   │ - Ready for audit   │
   └─────────────────────┘
```

---

## 🌍 Global Distribution

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                      │
└─────────────────────────────────────────────────────────────┘

        North America              Europe                Asia
        
    ┌─────────────┐          ┌─────────────┐      ┌─────────────┐
    │   Seattle   │          │   London    │      │   Tokyo     │
    │   (Edge)    │          │   (Edge)    │      │   (Edge)    │
    └──────┬──────┘          └──────┬──────┘      └──────┬──────┘
           │                        │                     │
    ┌──────▼──────┐          ┌──────▼──────┐      ┌──────▼──────┐
    │  New York   │          │  Frankfurt  │      │  Singapore  │
    │   (Edge)    │          │   (Edge)    │      │   (Edge)    │
    └──────┬──────┘          └──────┬──────┘      └──────┬──────┘
           │                        │                     │
           └────────────────────────┼─────────────────────┘
                                    │
                                    │ API Requests
                                    │
                          ┌─────────▼─────────┐
                          │   Railway (US)    │
                          │   Django Backend  │
                          └─────────┬─────────┘
                                    │
                          ┌─────────▼─────────┐
                          │  Supabase (US)    │
                          │  PostgreSQL DB    │
                          └───────────────────┘

Users get:
- Static assets from nearest edge location (< 50ms)
- API requests routed to Railway (100-200ms)
- Database queries via connection pool (20-50ms)
```

---

## 💰 Cost Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│                      FREE TIER LIMITS                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│   Service    │   Resource   │  Free Tier   │  Paid Tier   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│              │  Database    │   500 MB     │   8 GB       │
│  Supabase    │  Bandwidth   │  Unlimited   │  Unlimited   │
│              │  Backups     │  Daily (7d)  │  PITR (30d)  │
│              │  Cost        │   $0/mo      │   $25/mo     │
├──────────────┼──────────────┼──────────────┼──────────────┤
│              │  Compute     │  500 hrs/mo  │  Unlimited   │
│  Railway     │  RAM         │   512 MB     │   8 GB       │
│              │  Disk        │   1 GB       │   100 GB     │
│              │  Cost        │   $0/mo      │   $5/mo      │
├──────────────┼──────────────┼──────────────┼──────────────┤
│              │  Bandwidth   │  100 GB/mo   │  Unlimited   │
│  Vercel      │  Builds      │  Unlimited   │  Unlimited   │
│              │  Deployments │  Unlimited   │  Unlimited   │
│              │  Cost        │   $0/mo      │   $20/mo     │
└──────────────┴──────────────┴──────────────┴──────────────┘

Total Free Tier: $0/month
Total Paid Tier: $50/month (all services)
```

---

## 🔄 Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                           │
└─────────────────────────────────────────────────────────────┘

Developer                GitHub              Railway/Vercel
    │                       │                       │
    │  1. git commit        │                       │
    │──────────────────────▶│                       │
    │                       │                       │
    │  2. git push          │                       │
    │──────────────────────▶│                       │
    │                       │                       │
    │                       │  3. Webhook trigger   │
    │                       │──────────────────────▶│
    │                       │                       │
    │                       │  4. Clone repo        │
    │                       │◀──────────────────────│
    │                       │                       │
    │                       │  5. Install deps      │
    │                       │                       │
    │                       │  6. Run migrations    │
    │                       │     (Railway only)    │
    │                       │                       │
    │                       │  7. Build             │
    │                       │                       │
    │                       │  8. Deploy            │
    │                       │                       │
    │                       │  9. Health check      │
    │                       │                       │
    │  10. Deployment URL   │                       │
    │◀──────────────────────────────────────────────│
    │                       │                       │

Total time: 2-5 minutes
Zero downtime: Yes (rolling deployment)
Rollback: Instant (previous deployment)
```

---

## 📈 Scaling Path

```
┌─────────────────────────────────────────────────────────────┐
│                    SCALING STRATEGY                         │
└─────────────────────────────────────────────────────────────┘

Stage 1: Free Tier (0-100 users)
┌────────────────────────────────────────┐
│ Supabase: 500MB                        │
│ Railway: 512MB RAM, 500 hrs/mo         │
│ Vercel: 100GB bandwidth                │
│ Cost: $0/month                         │
└────────────────────────────────────────┘

Stage 2: Hobby ($5-30/month, 100-500 users)
┌────────────────────────────────────────┐
│ Supabase: 8GB database                 │
│ Railway: Always-on, 1GB RAM            │
│ Vercel: Free tier sufficient           │
│ Cost: $30/month                        │
└────────────────────────────────────────┘

Stage 3: Pro ($50-100/month, 500-2000 users)
┌────────────────────────────────────────┐
│ Supabase: Pro plan, PITR backups       │
│ Railway: 2GB RAM, faster CPU           │
│ Vercel: Pro plan for analytics         │
│ Cost: $70/month                        │
└────────────────────────────────────────┘

Stage 4: Scale ($200+/month, 2000+ users)
┌────────────────────────────────────────┐
│ Supabase: Team plan, dedicated CPU     │
│ Railway: Multiple instances, 8GB RAM   │
│ Vercel: Enterprise for SLA             │
│ Add: Redis cache, CDN optimization     │
│ Cost: $200-500/month                   │
└────────────────────────────────────────┘
```

---

## 🎯 Quick Reference

### URLs
- **Frontend**: `https://[project].vercel.app`
- **Backend**: `https://[project].railway.app`
- **Database**: `db.[project].supabase.co:5432`
- **Admin**: `https://[project].railway.app/admin/`

### Credentials
- Admin: `admin` / `admin123`
- Analyst: `analyst` / `analyst123`
- Viewer: `viewer` / `viewer123`

### Key Files
- Backend config: `backend/.env`
- Frontend config: `frontend/.env.local`
- Database migrations: `backend/core/migrations/`
- Sample data: `sample_data/*.csv`

---

**Ready to deploy?** Follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)!
