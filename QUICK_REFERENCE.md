# Quick Reference Card

One-page reference for Breathe ESG deployment and management.

---

## 🚀 Deployment URLs

| Service | URL Pattern | Example |
|---------|-------------|---------|
| **Frontend** | `https://[project].vercel.app` | `https://breathe-esg.vercel.app` |
| **Backend** | `https://[project].railway.app` | `https://breathe-esg.railway.app` |
| **API** | `https://[project].railway.app/api/` | `https://breathe-esg.railway.app/api/` |
| **Admin** | `https://[project].railway.app/admin/` | `https://breathe-esg.railway.app/admin/` |
| **Database** | `db.[project].supabase.co:5432` | `db.abc123xyz.supabase.co:5432` |

---

## 🔑 Default Credentials

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| `admin` | `admin123` | Admin | Full access |
| `analyst` | `analyst123` | Analyst | Review & approve |
| `viewer` | `viewer123` | Viewer | Read-only |

⚠️ **Change these in production!**

---

## 📋 Essential Commands

### Local Development
```bash
# Setup
bash setup-local.sh              # Linux/Mac
setup-local.bat                  # Windows

# Backend
cd backend
python manage.py runserver       # Start server
python manage.py migrate         # Run migrations
python manage.py load_sample_data # Load sample data
python manage.py createsuperuser # Create admin user

# Frontend
cd frontend
npm start                        # Start dev server
npm run build                    # Production build
```

### Railway (Production)
```bash
# Install CLI
npm install -g @railway/cli

# Login & Link
railway login
railway link

# Commands
railway run python manage.py load_sample_data
railway logs                     # View logs
railway variables                # List env vars
railway variables set KEY=value  # Set env var
```

### Database
```bash
# Connect
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Backup
pg_dump "postgresql://..." > backup.sql

# Restore
psql "postgresql://..." < backup.sql
```

---

## 🔧 Environment Variables

### Backend (Railway)
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SECRET_KEY=<generate-with-python-command>
DEBUG=False
ALLOWED_HOSTS=.railway.app
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://[project].vercel.app
CSRF_TRUSTED_ORIGINS=https://[project].vercel.app
```

### Frontend (Vercel)
```env
REACT_APP_API_URL=https://[project].railway.app/api
```

### Generate SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_hex(50))"
```

---

## 📁 Project Structure

```
breathe-esg-v2/
├── backend/
│   ├── breathe_esg/        # Django project settings
│   ├── core/               # Main app (models, views, serializers)
│   ├── ingestion/          # Data ingestion & parsers
│   ├── manage.py
│   ├── requirements.txt
│   ├── Procfile           # Railway deployment
│   └── .env               # Local environment
├── frontend/
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── context/       # Auth context
│   ├── package.json
│   └── vercel.json        # Vercel config
├── sample_data/           # Sample CSV files
└── docs/                  # All documentation
```

---

## 🔍 Troubleshooting Quick Fixes

### CORS Error
```bash
# In Railway, update:
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-vercel-app.vercel.app
# No trailing slashes!
```

### Database Connection Failed
```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Check DATABASE_URL in Railway
railway variables
```

### Railway App Not Responding
```bash
# Check logs
railway logs

# App may be sleeping (free tier)
# First request takes ~30 seconds
```

### Vercel Build Failed
```bash
# Check build logs in Vercel dashboard
# Verify REACT_APP_API_URL is set
# Ensure root directory is "frontend"
```

---

## 📊 API Endpoints

### Authentication
```bash
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/
```

### Dashboard
```bash
GET /api/dashboard/stats/
GET /api/dashboard/trends/
```

### Ingestion
```bash
POST /api/ingestion/upload/
GET  /api/ingestion/batches/
GET  /api/ingestion/batch/{id}/
```

### Records
```bash
GET    /api/records/
GET    /api/records/{id}/
POST   /api/records/{id}/approve/
POST   /api/records/{id}/flag/
POST   /api/records/{id}/reject/
```

### Emission Factors
```bash
GET /api/emission-factors/
```

---

## 💰 Free Tier Limits

| Service | Limit | What Happens When Exceeded |
|---------|-------|----------------------------|
| **Supabase** | 500MB database | Need to upgrade to Pro ($25/mo) |
| **Railway** | 500 hours/month | App stops until next month or upgrade |
| **Vercel** | 100GB bandwidth | Need to upgrade to Pro ($20/mo) |

### Usage Monitoring
- **Supabase**: Dashboard → Settings → Usage
- **Railway**: Dashboard → Usage tab
- **Vercel**: Dashboard → Analytics → Usage

---

## 🔐 Security Checklist

- [ ] `DEBUG=False` in production
- [ ] Strong `SECRET_KEY` generated
- [ ] `ALLOWED_HOSTS` restricted to your domains
- [ ] `CORS_ALLOWED_ORIGINS` restricted to frontend
- [ ] HTTPS enabled (automatic on Vercel/Railway)
- [ ] Default passwords changed
- [ ] `.env` files not in Git
- [ ] Database password is strong
- [ ] Regular backups enabled

---

## 📈 Performance Tips

### Backend
- ✅ Use database indexes (already included)
- ✅ Enable query caching
- ✅ Optimize N+1 queries with `select_related()`
- ✅ Use pagination for large datasets

### Frontend
- ✅ Lazy load components with `React.lazy()`
- ✅ Optimize images (WebP format)
- ✅ Use CDN for static assets (automatic on Vercel)
- ✅ Enable browser caching

### Database
- ✅ Regular VACUUM (automatic on Supabase)
- ✅ Monitor slow queries
- ✅ Add indexes for frequently queried fields
- ✅ Use connection pooling (automatic)

---

## 🆘 Emergency Procedures

### Rollback Deployment
```bash
# Vercel: Go to Deployments → Previous deployment → Promote
# Railway: Go to Deployments → Previous deployment → Redeploy
```

### Restore Database
```bash
# From backup
psql "postgresql://..." < backup.sql

# From Supabase dashboard
# Go to Database → Backups → Restore
```

### Reset Application
```bash
# Clear all data (⚠️ DESTRUCTIVE)
railway run python manage.py flush

# Reload sample data
railway run python manage.py load_sample_data
```

---

## 📞 Support Resources

### Documentation
- [GETTING_STARTED.md](GETTING_STARTED.md) - Complete guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Step-by-step
- [FAQ.md](FAQ.md) - Troubleshooting
- [ENV_VARIABLES.md](ENV_VARIABLES.md) - Configuration

### External Help
- **Supabase**: https://supabase.com/docs
- **Railway**: https://docs.railway.app
- **Vercel**: https://vercel.com/docs
- **Django**: https://docs.djangoproject.com

### Community
- **Supabase Discord**: https://discord.supabase.com
- **Railway Discord**: https://discord.gg/railway

---

## ⚡ Quick Start (30 Minutes)

1. **Create accounts** (5 min)
   - Supabase, Railway, Vercel

2. **Deploy database** (5 min)
   - Create Supabase project
   - Copy DATABASE_URL

3. **Deploy backend** (10 min)
   - Connect Railway to GitHub
   - Set environment variables
   - Deploy

4. **Deploy frontend** (5 min)
   - Connect Vercel to GitHub
   - Set REACT_APP_API_URL
   - Deploy

5. **Configure CORS** (5 min)
   - Update Railway variables
   - Test application

**Full guide**: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

## 🎯 Common Tasks

### Add User
```bash
railway run python manage.py createsuperuser
# Or use Django admin at /admin/
```

### Upload Data
```bash
# Via UI: Go to Ingest Data page
# Via CLI: Use Django admin or API
```

### View Logs
```bash
# Railway
railway logs

# Vercel
# Dashboard → Deployments → View logs
```

### Update Code
```bash
git add .
git commit -m "Update feature"
git push origin main
# Auto-deploys to Railway and Vercel
```

---

## 📝 Useful SQL Queries

```sql
-- Count records by scope
SELECT scope, COUNT(*) FROM core_emissionrecord GROUP BY scope;

-- Total emissions by tenant
SELECT tenant_id, SUM(co2e_kg) FROM core_emissionrecord GROUP BY tenant_id;

-- Flagged records
SELECT * FROM core_emissionrecord WHERE status = 'flagged';

-- Recent batches
SELECT * FROM core_ingestionbatch ORDER BY uploaded_at DESC LIMIT 10;
```

---

## 🔄 Deployment Workflow

```
Developer → Git Push → GitHub → Webhook → Railway/Vercel → Deploy
                                                    ↓
                                            Health Check
                                                    ↓
                                            Live (2-5 min)
```

---

**Print this page for quick reference!** 📄

---

*Last updated: May 28, 2026*
