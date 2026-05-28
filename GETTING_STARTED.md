# Getting Started with Breathe ESG

Welcome! This guide will help you get Breathe ESG up and running in 30 minutes.

---

## 🎯 What You'll Build

A production-ready emissions tracking platform with:
- **Frontend**: React app on Vercel (global CDN)
- **Backend**: Django REST API on Railway
- **Database**: PostgreSQL on Supabase

**Total cost**: $0/month (free tier)

---

## 📋 Prerequisites

### Required
- [ ] GitHub account (for deployments)
- [ ] Git installed locally
- [ ] Python 3.9+ installed
- [ ] Node.js 16+ installed

### Accounts to Create (all free)
- [ ] [Supabase](https://supabase.com) - Database
- [ ] [Railway](https://railway.app) - Backend hosting
- [ ] [Vercel](https://vercel.com) - Frontend hosting

**Time to create accounts**: ~5 minutes

---

## 🚀 Quick Start (30 Minutes)

### Option 1: Follow the Checklist (Recommended)

**Best for**: First-time deployment

1. Open [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
2. Follow each checkbox step-by-step
3. Fill in URLs as you go
4. Test at the end

**Estimated time**: 30 minutes

---

### Option 2: Express Setup (For Experienced Users)

**Best for**: Developers familiar with these platforms

#### Step 1: Database (5 min)
```bash
# 1. Create Supabase project at supabase.com
# 2. Copy DATABASE_URL from Settings → Database
# 3. Save it for next steps
```

#### Step 2: Backend (10 min)
```bash
# 1. Push code to GitHub
git push origin main

# 2. Go to railway.app
# 3. New Project → Deploy from GitHub
# 4. Add environment variables:
DATABASE_URL=<from-supabase>
SECRET_KEY=<generate-new>
DEBUG=False
ALLOWED_HOSTS=.railway.app
CORS_ALLOW_ALL_ORIGINS=False

# 5. Deploy and copy Railway URL
```

#### Step 3: Frontend (10 min)
```bash
# 1. Go to vercel.com
# 2. Import GitHub repository
# 3. Root directory: frontend
# 4. Add environment variable:
REACT_APP_API_URL=https://<railway-url>/api

# 5. Deploy and copy Vercel URL
```

#### Step 4: Update CORS (5 min)
```bash
# 1. Go back to Railway
# 2. Update variables:
CORS_ALLOWED_ORIGINS=https://<vercel-url>
CSRF_TRUSTED_ORIGINS=https://<vercel-url>

# 3. Railway auto-redeploys
# 4. Test your app!
```

---

## 🏠 Local Development

### Quick Setup

```bash
# Clone repository
git clone <your-repo-url>
cd breathe-esg-v2

# Run setup script
bash setup-local.sh  # Linux/Mac
setup-local.bat      # Windows
```

### Manual Setup

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your Supabase DATABASE_URL

# Run migrations
python manage.py migrate

# Load sample data
python manage.py load_sample_data

# Start server
python manage.py runserver
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env.local

# Start development server
npm start
```

#### Test
- Backend: http://localhost:8000/api/
- Frontend: http://localhost:3000
- Login: `admin` / `admin123`

---

## 📖 Documentation Guide

### Start Here
1. **[GETTING_STARTED.md](GETTING_STARTED.md)** ← You are here
2. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Deploy to production

### Reference
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Detailed migration steps
- **[ENV_VARIABLES.md](ENV_VARIABLES.md)** - All environment variables explained
- **[FAQ.md](FAQ.md)** - Common questions and troubleshooting

### Architecture
- **[ARCHITECTURE_COMPARISON.md](ARCHITECTURE_COMPARISON.md)** - Why this architecture?
- **[MODEL.md](MODEL.md)** - Database schema
- **[DECISIONS.md](DECISIONS.md)** - Design decisions

---

## 🎓 Learning Path

### Day 1: Local Development
- [ ] Clone repository
- [ ] Run setup script
- [ ] Explore the application
- [ ] Upload sample data
- [ ] Review code structure

### Day 2: Deploy to Production
- [ ] Create Supabase account
- [ ] Create Railway account
- [ ] Create Vercel account
- [ ] Follow deployment checklist
- [ ] Test production deployment

### Day 3: Customize
- [ ] Add your company logo
- [ ] Customize emission factors
- [ ] Add new data sources
- [ ] Configure user roles
- [ ] Set up monitoring

---

## 🔧 Common Tasks

### Add a New User
```bash
# Via Django admin
# 1. Visit https://your-backend.railway.app/admin/
# 2. Go to Users → Add user
# 3. Set username and password

# Or via Railway CLI
railway run python manage.py createsuperuser
```

### Upload Sample Data
```bash
# Local
python manage.py load_sample_data

# Production
railway run python manage.py load_sample_data
```

### View Database
```bash
# Option 1: Supabase Dashboard
# Go to Table Editor in Supabase

# Option 2: psql
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Option 3: Django Admin
# Visit https://your-backend.railway.app/admin/
```

### Check Logs
```bash
# Railway (backend)
railway logs

# Vercel (frontend)
# Go to Vercel dashboard → Deployments → View logs

# Local
# Check terminal output
```

---

## 🆘 Troubleshooting

### "Can't connect to database"
```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Check DATABASE_URL in .env
# Verify Supabase project is active
```

### "CORS error in browser"
```bash
# Check Railway environment variables:
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-vercel-app.vercel.app

# No trailing slashes!
# Redeploy after changing
```

### "Module not found"
```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### "Railway app not responding"
```bash
# Check Railway logs
railway logs

# Verify environment variables
railway variables

# Check if app is sleeping (free tier)
# First request after sleep takes ~30 seconds
```

### More Help
See [FAQ.md](FAQ.md) for detailed troubleshooting.

---

## 📊 What's Included

### Sample Data
- **SAP Fuel Data**: German/US formats, edge cases
- **Utility Bills**: Multi-meter, renewable tariffs
- **Travel Data**: Flights, hotels, car rentals

Location: `sample_data/` directory

### Pre-configured Users
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin (full access) |
| analyst | analyst123 | Analyst (review data) |
| viewer | viewer123 | Viewer (read-only) |

### Features
- ✅ Multi-source data ingestion
- ✅ Automatic unit conversion
- ✅ Anomaly detection
- ✅ Review workflow
- ✅ Audit trail
- ✅ Dashboard with charts
- ✅ Batch history
- ✅ Emission factor reference

---

## 🎯 Next Steps

### Immediate
1. ✅ Complete local setup
2. ✅ Explore the application
3. ✅ Upload sample data
4. ✅ Review documentation

### This Week
1. ✅ Deploy to production
2. ✅ Test all features
3. ✅ Customize for your needs
4. ✅ Add your team members

### This Month
1. ✅ Import real data
2. ✅ Train your team
3. ✅ Set up monitoring
4. ✅ Plan enhancements

---

## 💡 Tips for Success

### Development
- ✅ Always test locally first
- ✅ Use version control (Git)
- ✅ Keep dependencies updated
- ✅ Read error messages carefully
- ✅ Check logs when debugging

### Deployment
- ✅ Follow the checklist step-by-step
- ✅ Save all URLs and credentials
- ✅ Test after each phase
- ✅ Update CORS settings last
- ✅ Monitor free tier usage

### Production
- ✅ Use strong passwords
- ✅ Set DEBUG=False
- ✅ Enable automatic backups
- ✅ Monitor error logs
- ✅ Plan for scaling

---

## 📞 Getting Help

### Documentation
- **Quick Start**: This file
- **Deployment**: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Troubleshooting**: [FAQ.md](FAQ.md)
- **Configuration**: [ENV_VARIABLES.md](ENV_VARIABLES.md)

### External Resources
- **Supabase Docs**: https://supabase.com/docs
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Django Docs**: https://docs.djangoproject.com

### Community
- **Supabase Discord**: https://discord.supabase.com
- **Railway Discord**: https://discord.gg/railway

---

## ✅ Checklist

Before you start:
- [ ] Python 3.9+ installed
- [ ] Node.js 16+ installed
- [ ] Git installed
- [ ] GitHub account created
- [ ] Code editor ready (VS Code recommended)

For deployment:
- [ ] Supabase account created
- [ ] Railway account created
- [ ] Vercel account created
- [ ] Repository pushed to GitHub

---

## 🎉 Ready to Start?

Choose your path:

**New to deployment?**
→ Follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

**Want to understand the architecture?**
→ Read [ARCHITECTURE_COMPARISON.md](ARCHITECTURE_COMPARISON.md)

**Need detailed instructions?**
→ See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

**Have questions?**
→ Check [FAQ.md](FAQ.md)

**Ready to code?**
→ Run `bash setup-local.sh` and start developing!

---

**Welcome to Breathe ESG!** 🌱

Let's build something great together.
