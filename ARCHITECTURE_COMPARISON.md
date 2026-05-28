# Architecture Comparison

Understanding the migration from monolithic to distributed architecture.

---

## Before vs After

### Original Architecture (Monolithic)
```
┌─────────────────────────────────────┐
│         Single Server               │
│  ┌──────────────────────────────┐  │
│  │   Django Application         │  │
│  │   - REST API                 │  │
│  │   - Authentication           │  │
│  │   - Business Logic           │  │
│  │   - Static Files             │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │   SQLite/PostgreSQL          │  │
│  │   - All data in one DB       │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
         ↑
         │
    React Frontend
    (served separately)
```

**Pros**:
- Simple deployment
- Easy to debug
- Low latency (everything local)

**Cons**:
- Single point of failure
- Hard to scale
- Database and app compete for resources
- Manual backups required

---

### New Architecture (Distributed)

```
┌──────────────────────┐
│   Vercel (Frontend)  │
│   - React SPA        │
│   - Global CDN       │
│   - Auto-scaling     │
│   - HTTPS            │
└──────────┬───────────┘
           │
           │ HTTPS/API
           ↓
┌──────────────────────┐
│  Railway (Backend)   │
│  - Django REST API   │
│  - Authentication    │
│  - Business Logic    │
│  - File Processing   │
└──────────┬───────────┘
           │
           │ PostgreSQL
           ↓
┌──────────────────────┐
│  Supabase (Database) │
│  - PostgreSQL        │
│  - Auto backups      │
│  - Connection pool   │
│  - Dashboard         │
└──────────────────────┘
```

**Pros**:
- Each component scales independently
- Database isolated from compute
- Automatic backups (Supabase)
- Global CDN for frontend (Vercel)
- Better resource utilization
- Free tier for all components

**Cons**:
- More complex setup
- Network latency between services
- More moving parts to monitor
- Requires environment variable management

---

## Component Breakdown

### Frontend (Vercel)

**What it does**:
- Serves React application
- Handles routing (SPA)
- Provides global CDN
- Manages SSL certificates

**Why Vercel**:
- ✅ Best-in-class React deployment
- ✅ Automatic HTTPS
- ✅ Global edge network
- ✅ Zero-config deployment
- ✅ Generous free tier
- ✅ Git-based deployments

**Alternatives**:
- Netlify (similar features)
- Cloudflare Pages (faster edge)
- AWS Amplify (AWS ecosystem)
- GitHub Pages (static only)

---

### Backend (Railway)

**What it does**:
- Runs Django application
- Processes API requests
- Handles file uploads
- Executes business logic
- Manages authentication

**Why Railway**:
- ✅ Django-friendly (auto-detection)
- ✅ Simple deployment (Git push)
- ✅ Free tier ($5 credit/month)
- ✅ Easy environment variables
- ✅ Built-in logging
- ✅ No credit card required

**Alternatives**:
- Render (similar to Railway)
- Heroku (more expensive)
- AWS Elastic Beanstalk (complex)
- DigitalOcean App Platform (good alternative)
- Fly.io (edge deployment)

---

### Database (Supabase)

**What it does**:
- PostgreSQL database
- Connection pooling
- Automatic backups
- Database dashboard
- SQL editor

**Why Supabase**:
- ✅ Generous free tier (500MB)
- ✅ Automatic daily backups
- ✅ Excellent dashboard
- ✅ Built-in auth (optional)
- ✅ Real-time capabilities (optional)
- ✅ Storage and edge functions (optional)

**Alternatives**:
- Railway PostgreSQL (simpler, less features)
- Neon (serverless Postgres)
- PlanetScale (MySQL, not Postgres)
- AWS RDS (expensive)
- MongoDB Atlas (NoSQL, requires rewrite)

---

## Data Flow

### User Login Flow

```
1. User enters credentials in React form
   ↓
2. Frontend sends POST to Railway API
   POST https://backend.railway.app/api/auth/login/
   ↓
3. Django validates credentials against Supabase DB
   SELECT * FROM auth_user WHERE username=?
   ↓
4. Django generates auth token
   ↓
5. Token returned to frontend
   ↓
6. Frontend stores token in localStorage
   ↓
7. All subsequent requests include token
   Authorization: Token abc123...
```

### Data Ingestion Flow

```
1. User uploads CSV in React
   ↓
2. File sent to Railway API
   POST https://backend.railway.app/api/ingestion/upload/
   ↓
3. Django saves file to Railway disk
   /app/media/raw/2024/05/file.csv
   ↓
4. Parser processes CSV rows
   ↓
5. Records inserted into Supabase DB
   INSERT INTO core_emissionrecord (...)
   ↓
6. Response sent to frontend
   { batch_id: "...", status: "success" }
   ↓
7. Frontend polls for processing status
   GET /api/ingestion/batch/{id}/
```

### Dashboard Data Flow

```
1. User visits dashboard
   ↓
2. React requests stats from API
   GET https://backend.railway.app/api/dashboard/stats/
   ↓
3. Django queries Supabase
   SELECT scope, SUM(co2e_kg) FROM core_emissionrecord
   GROUP BY scope
   ↓
4. Aggregated data returned
   { scope_1: 1234, scope_2: 5678, ... }
   ↓
5. React renders charts with Recharts
```

---

## Cost Analysis

### Free Tier Limits

| Service | Storage | Compute | Bandwidth | Requests |
|---------|---------|---------|-----------|----------|
| **Supabase** | 500MB DB | N/A | Unlimited | Unlimited |
| **Railway** | 1GB disk | 500 hrs/mo | 100GB/mo | Unlimited |
| **Vercel** | 100GB | N/A | 100GB/mo | Unlimited |

### When You'll Need to Upgrade

**Supabase** ($25/month Pro):
- Database > 500MB (~1M emission records)
- Need point-in-time recovery
- Want more frequent backups
- Need more than 60 concurrent connections

**Railway** ($5/month Hobby):
- App sleeps after 30min inactivity
- Need more than 500 execution hours
- Want more RAM (512MB → 8GB)
- Need faster CPU

**Vercel** ($20/month Pro):
- Bandwidth > 100GB/month
- Need password-protected deployments
- Want advanced analytics
- Need more team members

### Cost Projection

| Users | Records | Monthly Cost |
|-------|---------|--------------|
| 1-50 | < 1M | **$0** (free tier) |
| 50-200 | 1M-5M | **$30** (Railway Hobby + Supabase Pro) |
| 200-1000 | 5M-20M | **$80** (All Pro tiers) |
| 1000+ | 20M+ | **$200+** (Scale tiers) |

---

## Performance Comparison

### Latency

**Monolithic** (single server):
- API request: ~50ms (local)
- Database query: ~5ms (local)
- Total: ~55ms

**Distributed** (Supabase + Railway + Vercel):
- Frontend (CDN): ~20ms (edge)
- API request: ~100ms (Railway)
- Database query: ~30ms (Supabase)
- Total: ~150ms

**Trade-off**: Slightly higher latency, but:
- Frontend served from edge (faster globally)
- Backend can scale independently
- Database has connection pooling
- Better reliability (no single point of failure)

### Throughput

**Monolithic**:
- Limited by single server resources
- Database and app compete for CPU/RAM
- ~100 concurrent users max

**Distributed**:
- Each component scales independently
- Railway: 512MB RAM (free) → 8GB (paid)
- Supabase: 60 connections (free) → 200 (paid)
- Vercel: Unlimited (CDN)
- ~500+ concurrent users (free tier)

---

## Reliability Comparison

### Uptime

**Monolithic**:
- Single point of failure
- Server restart = downtime
- Manual monitoring required
- ~95% uptime (self-hosted)

**Distributed**:
- Multiple redundant systems
- Railway: 99.9% SLA (paid)
- Supabase: 99.9% SLA (paid)
- Vercel: 99.99% SLA
- ~99.5% uptime (free tier)

### Disaster Recovery

**Monolithic**:
- Manual backups required
- Restore time: hours
- Data loss risk: high

**Distributed**:
- Supabase: Automatic daily backups
- Railway: Automatic deployments from Git
- Vercel: Instant rollback
- Restore time: minutes
- Data loss risk: low

---

## Development Workflow

### Monolithic

```bash
# Make changes
git commit -m "Update feature"

# Deploy
git push heroku main

# Wait for build
# Restart server
# Hope nothing breaks
```

### Distributed

```bash
# Make changes
git commit -m "Update feature"
git push origin main

# Automatic deployments:
# - Railway detects backend changes
# - Vercel detects frontend changes
# - Both deploy independently
# - Zero downtime
# - Instant rollback if needed
```

---

## Migration Path

### Phase 1: Database (Day 1)
```
Local SQLite → Supabase PostgreSQL
```
- Create Supabase project
- Update `DATABASE_URL`
- Run migrations
- Test locally

### Phase 2: Backend (Day 1-2)
```
Local Django → Railway
```
- Push to GitHub
- Connect Railway
- Set environment variables
- Deploy

### Phase 3: Frontend (Day 2)
```
Local React → Vercel
```
- Connect Vercel to GitHub
- Set `REACT_APP_API_URL`
- Deploy

### Phase 4: Configuration (Day 2)
```
Update CORS settings
Test end-to-end
```
- Update `CORS_ALLOWED_ORIGINS`
- Update `CSRF_TRUSTED_ORIGINS`
- Test all features

**Total time**: 2-3 days (including testing)

---

## When to Use Each Architecture

### Use Monolithic When:
- ✅ Prototyping / MVP
- ✅ Small team (1-2 developers)
- ✅ Low traffic (< 100 users)
- ✅ Simple deployment requirements
- ✅ Budget constraints (self-hosted)

### Use Distributed When:
- ✅ Production application
- ✅ Growing user base (> 100 users)
- ✅ Need high availability
- ✅ Want automatic backups
- ✅ Need to scale independently
- ✅ Want modern DevOps practices

---

## Summary

| Aspect | Monolithic | Distributed (Supabase + Railway + Vercel) |
|--------|------------|-------------------------------------------|
| **Setup Complexity** | ⭐ Simple | ⭐⭐⭐ Moderate |
| **Deployment** | ⭐⭐ Manual | ⭐⭐⭐⭐⭐ Automatic |
| **Scalability** | ⭐⭐ Limited | ⭐⭐⭐⭐⭐ Excellent |
| **Reliability** | ⭐⭐ Single point of failure | ⭐⭐⭐⭐ Redundant |
| **Cost (Free Tier)** | ⭐⭐⭐ Self-hosted | ⭐⭐⭐⭐⭐ $0/month |
| **Monitoring** | ⭐⭐ Manual | ⭐⭐⭐⭐ Built-in dashboards |
| **Backups** | ⭐⭐ Manual | ⭐⭐⭐⭐⭐ Automatic |
| **Global Performance** | ⭐⭐ Single region | ⭐⭐⭐⭐ CDN + edge |

**Recommendation**: Use the distributed architecture (Supabase + Railway + Vercel) for production deployments. The initial setup complexity is worth the long-term benefits in reliability, scalability, and maintainability.

---

## Next Steps

1. ✅ Read [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed instructions
2. ✅ Follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for step-by-step deployment
3. ✅ Check [FAQ.md](FAQ.md) for common questions
4. ✅ Review [ENV_VARIABLES.md](ENV_VARIABLES.md) for configuration reference

**Ready to deploy?** Start with the [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)!
