# Migration Guide: Supabase + Vercel + Railway

This guide walks you through migrating the Breathe ESG application to use:
- **Supabase** (PostgreSQL database with authentication)
- **Vercel** (Frontend deployment)
- **Railway** (Backend deployment - free tier available)

---

## Overview

### Current Stack
- Django REST Framework backend with SQLite/PostgreSQL
- React frontend
- Token-based authentication

### Target Stack
- Django REST Framework backend → **Railway** (free tier: 500 hours/month, $5 credit)
- PostgreSQL database → **Supabase** (free tier: 500MB database, unlimited API requests)
- React frontend → **Vercel** (free tier: unlimited deployments)
- Authentication → Keep Django auth OR migrate to Supabase Auth

---

## Phase 1: Setup Supabase Database

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project:
   - Project name: `breathe-esg`
   - Database password: (save this securely)
   - Region: Choose closest to your users
3. Wait for project to provision (~2 minutes)

### 1.2 Get Database Connection String

From your Supabase project dashboard:
1. Go to **Settings** → **Database**
2. Find **Connection string** → **URI** format
3. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### 1.3 Update Backend Configuration

Update `backend/.env`:
```env
# Supabase Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,.railway.app

# CORS (will update after Vercel deployment)
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

### 1.4 Test Local Connection

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py load_sample_data
python manage.py runserver
```

---

## Phase 2: Deploy Backend to Railway

### 2.1 Prepare Backend for Railway

Railway automatically detects Django projects. Ensure these files exist:
- ✅ `backend/requirements.txt` (already exists)
- ✅ `backend/Procfile` (already exists)
- ✅ `backend/railway.toml` (already exists)

### 2.2 Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Configure:
   - **Root Directory**: `backend`
   - Railway will auto-detect Django
5. Add environment variables in Railway dashboard:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   SECRET_KEY=<generate-new-secret-key>
   DEBUG=False
   ALLOWED_HOSTS=.railway.app
   CORS_ALLOW_ALL_ORIGINS=False
   ```
6. Deploy! Railway will:
   - Install dependencies
   - Run migrations
   - Start gunicorn server

### 2.3 Load Sample Data

After first deployment:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run command in Railway environment
railway run python manage.py load_sample_data
```

### 2.4 Get Backend URL

Your backend will be available at:
```
https://[your-project].railway.app
```

Save this URL for frontend configuration.

---

## Phase 3: Deploy Frontend to Vercel

### 3.1 Update Frontend API Configuration

Update `frontend/.env.production`:
```env
REACT_APP_API_URL=https://[your-railway-project].railway.app/api
```

### 3.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
5. Add environment variable:
   ```
   REACT_APP_API_URL=https://[your-railway-project].railway.app/api
   ```
6. Deploy!

### 3.3 Get Frontend URL

Your frontend will be available at:
```
https://[your-project].vercel.app
```

---

## Phase 4: Update CORS Configuration

### 4.1 Update Railway Environment Variables

Go to Railway dashboard and update:
```env
CORS_ALLOWED_ORIGINS=https://[your-vercel-project].vercel.app
CSRF_TRUSTED_ORIGINS=https://[your-vercel-project].vercel.app
ALLOWED_HOSTS=.railway.app,[your-vercel-project].vercel.app
```

### 4.2 Redeploy Backend

Railway will automatically redeploy when you update environment variables.

---

## Phase 5: Optional - Migrate to Supabase Auth

If you want to use Supabase's built-in authentication instead of Django auth:

### 5.1 Enable Supabase Auth

In Supabase dashboard:
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)

### 5.2 Update Backend

Install Supabase Python client:
```bash
pip install supabase
```

Add to `requirements.txt`:
```
supabase==2.3.4
```

### 5.3 Create Auth Middleware

Create `backend/core/supabase_auth.py`:
```python
from supabase import create_client
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)

class SupabaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        try:
            user = supabase.auth.get_user(token)
            return (user, None)
        except Exception as e:
            raise AuthenticationFailed('Invalid token')
```

### 5.4 Update Settings

Add to `backend/breathe_esg/settings.py`:
```python
SUPABASE_URL = config('SUPABASE_URL')
SUPABASE_KEY = config('SUPABASE_ANON_KEY')

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.supabase_auth.SupabaseAuthentication',
    ],
    # ... rest of config
}
```

### 5.5 Update Frontend

Install Supabase JS client:
```bash
cd frontend
npm install @supabase/supabase-js
```

Update `frontend/src/context/AuthContext.js` to use Supabase auth.

---

## Cost Breakdown (Free Tiers)

### Supabase (Free Tier)
- ✅ 500MB database storage
- ✅ Unlimited API requests
- ✅ 50,000 monthly active users
- ✅ 2GB file storage
- ✅ Social OAuth providers

### Railway (Free Tier)
- ✅ $5 credit per month
- ✅ ~500 execution hours/month
- ✅ 512MB RAM, 1GB disk
- ⚠️ Sleeps after 30min inactivity (can upgrade to prevent)

### Vercel (Free Tier)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Global CDN

**Total Monthly Cost: $0** (within free tier limits)

---

## Monitoring & Maintenance

### Database Backups (Supabase)
- Free tier: Daily backups (7-day retention)
- Paid tier: Point-in-time recovery

### Application Logs
- **Railway**: View logs in dashboard or via CLI
- **Vercel**: View deployment and function logs in dashboard

### Performance Monitoring
- **Supabase**: Database performance metrics in dashboard
- **Railway**: CPU/Memory usage in dashboard
- **Vercel**: Web vitals and analytics

---

## Troubleshooting

### Database Connection Issues
```bash
# Test connection from local machine
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### CORS Errors
- Ensure `CORS_ALLOWED_ORIGINS` includes your Vercel URL
- Check `CSRF_TRUSTED_ORIGINS` includes your Vercel URL
- Verify `ALLOWED_HOSTS` includes both Railway and Vercel domains

### Railway Deployment Fails
- Check build logs in Railway dashboard
- Verify `requirements.txt` includes all dependencies
- Ensure `DATABASE_URL` is set correctly

### Vercel Build Fails
- Check build logs in Vercel dashboard
- Verify `REACT_APP_API_URL` is set
- Ensure `package.json` scripts are correct

---

## Next Steps

1. ✅ Create Supabase project and get connection string
2. ✅ Test local backend with Supabase database
3. ✅ Deploy backend to Railway
4. ✅ Deploy frontend to Vercel
5. ✅ Update CORS configuration
6. ✅ Test end-to-end flow
7. 🔄 (Optional) Migrate to Supabase Auth
8. 📊 Monitor usage and performance

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Django on Railway**: https://docs.railway.app/guides/django
- **React on Vercel**: https://vercel.com/guides/deploying-react-with-vercel

