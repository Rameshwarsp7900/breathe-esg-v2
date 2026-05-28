# Deployment Checklist

Use this checklist to deploy Breathe ESG to Supabase + Railway + Vercel.

---

## ☐ Phase 1: Supabase Setup (5 minutes)

### Create Supabase Project
- [ ] Go to [supabase.com](https://supabase.com) and sign up
- [ ] Click "New Project"
- [ ] Enter project details:
  - Name: `breathe-esg`
  - Database Password: _________________ (save this!)
  - Region: _________________ (choose closest to users)
- [ ] Click "Create new project" and wait ~2 minutes

### Get Connection Details
- [ ] Go to **Settings** → **Database**
- [ ] Copy **Connection string** (URI format)
- [ ] Save connection string: _________________________________

### Test Local Connection
```bash
cd backend
# Update .env with DATABASE_URL from Supabase
python manage.py migrate
python manage.py load_sample_data
python manage.py runserver
# Test at http://localhost:8000/api/
```

- [ ] Migrations successful
- [ ] Sample data loaded
- [ ] API responding

---

## ☐ Phase 2: Railway Backend Deployment (10 minutes)

### Prepare Railway Account
- [ ] Go to [railway.app](https://railway.app)
- [ ] Sign up with GitHub
- [ ] Authorize Railway to access your repository

### Create New Project
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose your `breathe-esg-v2` repository
- [ ] Railway auto-detects Django ✓

### Configure Environment Variables
Go to **Variables** tab and add:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SECRET_KEY=<generate-with-python-command-below>
DEBUG=False
ALLOWED_HOSTS=.railway.app
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

Generate SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_hex(50))"
```

- [ ] All environment variables added
- [ ] SECRET_KEY generated and added
- [ ] DATABASE_URL from Supabase added

### Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete (~3-5 minutes)
- [ ] Check logs for errors
- [ ] Copy Railway URL: _________________________________

### Load Sample Data
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Load sample data
railway run python manage.py load_sample_data
```

- [ ] Railway CLI installed
- [ ] Sample data loaded successfully

### Test Backend
- [ ] Visit `https://[your-project].railway.app/api/`
- [ ] Should see API root or 404 (not 500 error)
- [ ] Test login endpoint: `POST /api/auth/login/`

---

## ☐ Phase 3: Vercel Frontend Deployment (5 minutes)

### Prepare Vercel Account
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign up with GitHub
- [ ] Authorize Vercel to access your repository

### Create New Project
- [ ] Click "Add New" → "Project"
- [ ] Import your `breathe-esg-v2` repository
- [ ] Configure:
  - Framework Preset: **Create React App**
  - Root Directory: `frontend`
  - Build Command: `npm run build`
  - Output Directory: `build`

### Add Environment Variable
- [ ] Add environment variable:
  ```
  REACT_APP_API_URL=https://[your-railway-project].railway.app/api
  ```
- [ ] Replace `[your-railway-project]` with actual Railway URL

### Deploy
- [ ] Click "Deploy"
- [ ] Wait for build (~2-3 minutes)
- [ ] Copy Vercel URL: _________________________________

### Test Frontend
- [ ] Visit your Vercel URL
- [ ] Should see login page
- [ ] Try logging in (will fail due to CORS - fix next)

---

## ☐ Phase 4: Update CORS Configuration (2 minutes)

### Update Railway Environment Variables
Go back to Railway dashboard → **Variables** tab:

- [ ] Update `CORS_ALLOWED_ORIGINS`:
  ```
  https://[your-vercel-project].vercel.app
  ```
- [ ] Update `CSRF_TRUSTED_ORIGINS`:
  ```
  https://[your-vercel-project].vercel.app
  ```
- [ ] Update `ALLOWED_HOSTS`:
  ```
  .railway.app,[your-vercel-project].vercel.app
  ```

### Redeploy
- [ ] Railway will auto-redeploy with new variables
- [ ] Wait for deployment to complete

---

## ☐ Phase 5: End-to-End Testing (5 minutes)

### Test Authentication
- [ ] Visit Vercel URL
- [ ] Login with: `admin` / `admin123`
- [ ] Should redirect to dashboard

### Test Dashboard
- [ ] Dashboard loads with charts
- [ ] Scope breakdown shows data
- [ ] Monthly trend displays

### Test Data Ingestion
- [ ] Go to "Ingest Data" page
- [ ] Upload sample file from `sample_data/`
- [ ] Check processing completes
- [ ] Verify records appear in Review Queue

### Test Review Queue
- [ ] Filter by status
- [ ] Click on a record to view details
- [ ] Approve a record
- [ ] Check audit trail updates

### Test Batch History
- [ ] View uploaded batches
- [ ] Check SHA-256 checksums
- [ ] Verify processing logs

---

## ☐ Phase 6: Production Hardening (Optional)

### Security
- [ ] Enable Railway's "Always On" (prevents sleep, requires paid plan)
- [ ] Set up custom domain on Vercel (optional)
- [ ] Enable Supabase database backups (automatic on free tier)
- [ ] Review Django security checklist: `python manage.py check --deploy`

### Monitoring
- [ ] Set up Railway alerts for errors
- [ ] Monitor Supabase database usage
- [ ] Check Vercel analytics

### Documentation
- [ ] Update README.md with live URLs
- [ ] Document any custom configuration
- [ ] Share credentials with team

---

## 📊 Deployment Summary

Fill in after completion:

| Service | URL | Status |
|---------|-----|--------|
| **Supabase Database** | `db.[PROJECT-REF].supabase.co` | ☐ Active |
| **Railway Backend** | `https://________________.railway.app` | ☐ Active |
| **Vercel Frontend** | `https://________________.vercel.app` | ☐ Active |

### Credentials
- Admin: `admin` / `admin123`
- Analyst: `analyst` / `analyst123`
- Viewer: `viewer` / `viewer123`

### Free Tier Limits
- **Supabase**: 500MB database, unlimited API requests
- **Railway**: $5 credit/month (~500 hours)
- **Vercel**: Unlimited deployments, 100GB bandwidth/month

---

## 🆘 Troubleshooting

### Railway build fails
- Check `backend/requirements.txt` is complete
- Verify `Procfile` exists
- Check Railway logs for specific error

### CORS errors in browser
- Verify `CORS_ALLOWED_ORIGINS` matches Vercel URL exactly
- Check `CSRF_TRUSTED_ORIGINS` is set
- Ensure no trailing slashes in URLs

### Database connection fails
- Test connection string locally first
- Verify Supabase project is active
- Check Railway environment variables

### Frontend can't reach backend
- Verify `REACT_APP_API_URL` in Vercel
- Check Railway backend is running
- Test backend URL directly in browser

---

## ✅ Deployment Complete!

Once all checkboxes are complete, your application is live on:
- **Frontend**: Vercel (global CDN)
- **Backend**: Railway (auto-scaling)
- **Database**: Supabase (managed PostgreSQL)

**Total setup time**: ~30 minutes
**Monthly cost**: $0 (free tier)

Share your live URLs in the README.md!
