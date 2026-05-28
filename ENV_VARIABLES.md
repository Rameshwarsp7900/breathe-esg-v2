# Environment Variables Reference

Complete reference for all environment variables used in Breathe ESG.

---

## Backend Environment Variables

### Required Variables

#### `DATABASE_URL`
**Description**: PostgreSQL connection string for Supabase database  
**Format**: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`  
**Where to get it**: Supabase Dashboard → Settings → Database → Connection String (URI)  
**Example**: `postgresql://postgres:mypassword@db.abc123xyz.supabase.co:5432/postgres`

#### `SECRET_KEY`
**Description**: Django secret key for cryptographic signing  
**Format**: Long random string (50+ characters)  
**How to generate**:
```bash
python -c "import secrets; print(secrets.token_hex(50))"
```
**Example**: `a1b2c3d4e5f6...` (100 characters)

#### `DEBUG`
**Description**: Enable/disable Django debug mode  
**Values**: `True` (development) or `False` (production)  
**Default**: `True`  
**Production**: Always set to `False`

#### `ALLOWED_HOSTS`
**Description**: Comma-separated list of allowed host/domain names  
**Format**: `domain1.com,domain2.com,.railway.app`  
**Local**: `localhost,127.0.0.1`  
**Production**: `.railway.app,your-custom-domain.com`

---

### CORS Configuration

#### `CORS_ALLOW_ALL_ORIGINS`
**Description**: Allow requests from any origin (development only)  
**Values**: `True` or `False`  
**Local**: `True`  
**Production**: `False`

#### `CORS_ALLOWED_ORIGINS`
**Description**: Comma-separated list of allowed frontend origins  
**Format**: `https://domain1.com,https://domain2.com`  
**Local**: `http://localhost:3000`  
**Production**: `https://your-vercel-project.vercel.app`

#### `CSRF_TRUSTED_ORIGINS`
**Description**: Comma-separated list of trusted origins for CSRF  
**Format**: Same as `CORS_ALLOWED_ORIGINS`  
**Local**: `http://localhost:3000`  
**Production**: `https://your-vercel-project.vercel.app`

---

### Optional Variables (Supabase Auth)

#### `SUPABASE_URL`
**Description**: Supabase project URL  
**Format**: `https://[PROJECT-REF].supabase.co`  
**Where to get it**: Supabase Dashboard → Settings → API → Project URL  
**Example**: `https://abc123xyz.supabase.co`

#### `SUPABASE_ANON_KEY`
**Description**: Supabase anonymous/public API key  
**Format**: Long JWT token  
**Where to get it**: Supabase Dashboard → Settings → API → anon/public key  
**Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## Frontend Environment Variables

### Required Variables

#### `REACT_APP_API_URL`
**Description**: Backend API base URL  
**Format**: `https://your-backend.com/api` (no trailing slash)  
**Local**: `http://localhost:8000/api`  
**Production**: `https://your-railway-project.railway.app/api`

---

## Environment Files

### Local Development

**Backend**: `backend/.env`
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SECRET_KEY=dev-insecure-key-change-in-production-now
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

**Frontend**: `frontend/.env.local` (create this file)
```env
REACT_APP_API_URL=http://localhost:8000/api
```

---

### Production (Railway)

Set these in Railway Dashboard → Variables tab:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SECRET_KEY=<generate-new-secret-key>
DEBUG=False
ALLOWED_HOSTS=.railway.app
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://your-vercel-project.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-vercel-project.vercel.app
```

---

### Production (Vercel)

Set these in Vercel Dashboard → Settings → Environment Variables:

```env
REACT_APP_API_URL=https://your-railway-project.railway.app/api
```

---

## Configuration by Environment

### Local Development
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase connection string |
| `SECRET_KEY` | Any string (use example value) |
| `DEBUG` | `True` |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` |
| `CORS_ALLOW_ALL_ORIGINS` | `True` |
| `REACT_APP_API_URL` | `http://localhost:8000/api` |

### Production (Railway + Vercel)
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase connection string |
| `SECRET_KEY` | Generated secure key |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `.railway.app` |
| `CORS_ALLOW_ALL_ORIGINS` | `False` |
| `CORS_ALLOWED_ORIGINS` | Vercel URL |
| `CSRF_TRUSTED_ORIGINS` | Vercel URL |
| `REACT_APP_API_URL` | Railway API URL |

---

## Security Best Practices

### ✅ DO
- Generate a new `SECRET_KEY` for production
- Set `DEBUG=False` in production
- Use HTTPS URLs in production
- Restrict `ALLOWED_HOSTS` to specific domains
- Restrict `CORS_ALLOWED_ORIGINS` to your frontend domain
- Keep `.env` files out of version control (already in `.gitignore`)

### ❌ DON'T
- Commit `.env` files to Git
- Use the same `SECRET_KEY` in development and production
- Set `DEBUG=True` in production
- Use `CORS_ALLOW_ALL_ORIGINS=True` in production
- Share your Supabase database password publicly
- Use weak or short secret keys

---

## Troubleshooting

### "DisallowedHost" error
**Problem**: Django rejects the request due to host mismatch  
**Solution**: Add the domain to `ALLOWED_HOSTS`

### CORS errors in browser console
**Problem**: Frontend can't make requests to backend  
**Solution**: 
1. Check `CORS_ALLOWED_ORIGINS` includes your frontend URL
2. Ensure no trailing slashes in URLs
3. Verify `CORS_ALLOW_ALL_ORIGINS=False` in production

### CSRF token errors
**Problem**: POST requests fail with CSRF error  
**Solution**: Add frontend URL to `CSRF_TRUSTED_ORIGINS`

### Database connection fails
**Problem**: Can't connect to Supabase  
**Solution**:
1. Verify `DATABASE_URL` is correct
2. Check Supabase project is active
3. Test connection with `psql` command

### Frontend can't reach backend
**Problem**: API requests fail or timeout  
**Solution**:
1. Verify `REACT_APP_API_URL` is correct
2. Check Railway backend is running
3. Test backend URL directly in browser

---

## Quick Reference

### Generate SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_hex(50))"
```

### Test Database Connection
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Check Django Configuration
```bash
python manage.py check --deploy
```

### View Current Environment (Railway)
```bash
railway variables
```

### Set Environment Variable (Railway)
```bash
railway variables set KEY=value
```

---

## Example Complete Setup

### Step 1: Create Supabase Project
1. Get `DATABASE_URL` from Supabase dashboard
2. Save password securely

### Step 2: Configure Local Backend
Create `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:mypass@db.abc123.supabase.co:5432/postgres
SECRET_KEY=dev-key-for-local-only
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=True
```

### Step 3: Configure Local Frontend
Create `frontend/.env.local`:
```env
REACT_APP_API_URL=http://localhost:8000/api
```

### Step 4: Test Locally
```bash
# Backend
cd backend
python manage.py migrate
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm start
```

### Step 5: Deploy to Railway
Add variables in Railway dashboard:
```env
DATABASE_URL=postgresql://postgres:mypass@db.abc123.supabase.co:5432/postgres
SECRET_KEY=<new-generated-key>
DEBUG=False
ALLOWED_HOSTS=.railway.app
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://my-app.vercel.app
CSRF_TRUSTED_ORIGINS=https://my-app.vercel.app
```

### Step 6: Deploy to Vercel
Add variable in Vercel dashboard:
```env
REACT_APP_API_URL=https://my-backend.railway.app/api
```

---

## Support

For more help:
- **Supabase Docs**: https://supabase.com/docs/guides/database
- **Railway Docs**: https://docs.railway.app/guides/variables
- **Vercel Docs**: https://vercel.com/docs/concepts/projects/environment-variables
- **Django Settings**: https://docs.djangoproject.com/en/4.2/ref/settings/
