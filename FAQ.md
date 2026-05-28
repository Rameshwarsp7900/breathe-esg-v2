# Frequently Asked Questions (FAQ)

Common questions about deploying and using Breathe ESG with Supabase, Railway, and Vercel.

---

## General Questions

### Q: Why use Supabase instead of Railway's built-in PostgreSQL?

**A:** Supabase offers several advantages:
- **Free tier is more generous**: 500MB database vs Railway's limited free storage
- **Built-in features**: Authentication, real-time subscriptions, storage, and edge functions
- **Better dashboard**: Easy-to-use SQL editor, table viewer, and API documentation
- **Separate billing**: Database costs separate from compute, more predictable
- **Future-proof**: Easy to add Supabase Auth, Storage, or Realtime later

You can still use Railway's PostgreSQL if you prefer - just use Railway's `DATABASE_URL` instead.

### Q: Can I use MongoDB instead of PostgreSQL?

**A:** The current Django models are designed for PostgreSQL (relational database). To use MongoDB:
1. You'd need to rewrite models using `djongo` or `mongoengine`
2. Lose Django's powerful ORM features and migrations
3. Lose PostgreSQL-specific features (JSON fields, full-text search, etc.)

**Recommendation**: Stick with PostgreSQL/Supabase. It's better suited for this structured data.

### Q: What's the total monthly cost?

**A:** Within free tier limits: **$0/month**

Free tier includes:
- **Supabase**: 500MB database, unlimited API requests
- **Railway**: $5 credit (~500 execution hours)
- **Vercel**: Unlimited deployments, 100GB bandwidth

If you exceed limits:
- **Railway**: ~$0.01/hour after free credit
- **Supabase**: $25/month for Pro (2GB database, daily backups)
- **Vercel**: $20/month for Pro (unlimited bandwidth)

---

## Deployment Questions

### Q: Railway says "Application failed to respond"

**A:** Common causes:
1. **Database connection failed**: Check `DATABASE_URL` is correct
2. **Migrations failed**: Check Railway logs for migration errors
3. **Port binding issue**: Ensure Procfile uses `$PORT` variable
4. **Dependencies missing**: Verify `requirements.txt` is complete

**Solution**:
```bash
# Check Railway logs
railway logs

# Test locally first
python manage.py check --deploy
```

### Q: Vercel build fails with "Module not found"

**A:** Common causes:
1. **Wrong root directory**: Should be `frontend`, not root
2. **Missing dependencies**: Run `npm install` locally first
3. **Node version mismatch**: Vercel uses Node 18 by default

**Solution**:
- Verify `package.json` has all dependencies
- Check Vercel build logs for specific missing module
- Add `.nvmrc` file to specify Node version if needed

### Q: CORS errors in production but works locally

**A:** This is the most common issue. Check:

1. **Backend `CORS_ALLOWED_ORIGINS`** must include your Vercel URL:
   ```env
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
   ⚠️ No trailing slash!

2. **Backend `CSRF_TRUSTED_ORIGINS`** must also include Vercel URL:
   ```env
   CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app
   ```

3. **Frontend `REACT_APP_API_URL`** must include `/api`:
   ```env
   REACT_APP_API_URL=https://your-backend.railway.app/api
   ```

4. **Redeploy backend** after changing environment variables

### Q: How do I update environment variables?

**Railway**:
1. Go to project dashboard
2. Click "Variables" tab
3. Add/edit variables
4. Railway auto-redeploys

**Vercel**:
1. Go to project settings
2. Click "Environment Variables"
3. Add/edit variables
4. Redeploy from "Deployments" tab

### Q: Can I use a custom domain?

**Yes!**

**Vercel** (Frontend):
1. Go to project settings → Domains
2. Add your domain (e.g., `app.mycompany.com`)
3. Update DNS records as instructed
4. Update Railway `CORS_ALLOWED_ORIGINS` with new domain

**Railway** (Backend):
1. Go to project settings → Networking
2. Add custom domain (e.g., `api.mycompany.com`)
3. Update DNS records
4. Update Vercel `REACT_APP_API_URL` with new domain

---

## Database Questions

### Q: How do I backup my Supabase database?

**A:** Supabase free tier includes automatic daily backups (7-day retention).

**Manual backup**:
```bash
# Using pg_dump
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > backup.sql

# Restore
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < backup.sql
```

**Upgrade to Pro** for:
- Point-in-time recovery
- 30-day backup retention
- Automated backups every 6 hours

### Q: How do I view/edit data in Supabase?

**A:** Multiple options:

1. **Supabase Dashboard** (easiest):
   - Go to Table Editor
   - View/edit data in spreadsheet-like interface

2. **SQL Editor**:
   - Go to SQL Editor in Supabase dashboard
   - Run custom queries

3. **Django Admin**:
   - Visit `https://your-backend.railway.app/admin/`
   - Login with superuser credentials

4. **psql** (command line):
   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

### Q: Can I connect to Supabase from my local machine?

**Yes!** Use the connection string from Supabase dashboard:

```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Or in Django
# Update backend/.env with DATABASE_URL
python manage.py migrate
python manage.py runserver
```

### Q: How do I reset the database?

**⚠️ Warning**: This deletes all data!

**Option 1: Drop and recreate tables** (preserves database):
```bash
# Via Railway CLI
railway run python manage.py flush

# Or via SQL
psql "postgresql://..." -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

**Option 2: Create new Supabase project**:
1. Create new project in Supabase
2. Update `DATABASE_URL` in Railway
3. Redeploy

---

## Authentication Questions

### Q: How do I create new users?

**Option 1: Django Admin** (recommended):
1. Visit `https://your-backend.railway.app/admin/`
2. Go to Users → Add user
3. Set username, password, and permissions

**Option 2: Django shell**:
```bash
railway run python manage.py shell

>>> from django.contrib.auth.models import User
>>> User.objects.create_user('newuser', 'email@example.com', 'password123')
```

**Option 3: API endpoint** (if you build one):
```javascript
POST /api/auth/register/
{
  "username": "newuser",
  "password": "password123",
  "email": "email@example.com"
}
```

### Q: Should I migrate to Supabase Auth?

**Current setup**: Django's built-in authentication (token-based)

**Supabase Auth benefits**:
- Social OAuth (Google, GitHub, etc.)
- Magic links (passwordless login)
- Email verification
- Password reset flows
- Row-level security (RLS)

**When to migrate**:
- ✅ You need social login
- ✅ You want passwordless authentication
- ✅ You need email verification
- ✅ You want to use Supabase RLS

**When to keep Django auth**:
- ✅ Current setup works fine
- ✅ You have custom user models
- ✅ You need Django's permission system
- ✅ Simpler for your use case

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) Phase 5 for Supabase Auth migration steps.

### Q: How do I reset a user's password?

**Django Admin**:
1. Go to admin panel
2. Users → Select user
3. Click "Change password"

**Django shell**:
```bash
railway run python manage.py shell

>>> from django.contrib.auth.models import User
>>> user = User.objects.get(username='admin')
>>> user.set_password('newpassword123')
>>> user.save()
```

---

## Performance Questions

### Q: Railway app goes to sleep after 30 minutes

**A:** This is normal on Railway's free tier.

**Solutions**:
1. **Upgrade to Hobby plan** ($5/month): Prevents sleeping
2. **Use a ping service**: Keep app awake (e.g., UptimeRobot)
3. **Accept the sleep**: First request after sleep takes ~30 seconds

**Note**: Sleeping saves your free credit for actual usage.

### Q: How do I make the app faster?

**Backend optimizations**:
1. **Add database indexes**: Already included in models
2. **Enable query caching**: Add Redis (Railway add-on)
3. **Optimize queries**: Use `select_related()` and `prefetch_related()`
4. **Upgrade Railway plan**: More CPU/RAM

**Frontend optimizations**:
1. **Enable Vercel caching**: Already configured
2. **Optimize images**: Use WebP format
3. **Code splitting**: Use React.lazy()
4. **CDN**: Vercel provides global CDN automatically

**Database optimizations**:
1. **Upgrade Supabase plan**: More connections, better performance
2. **Add indexes**: For frequently queried fields
3. **Use connection pooling**: Already enabled in Django

### Q: How many users can the free tier handle?

**Realistic estimates**:
- **Concurrent users**: 10-50 (Railway free tier)
- **Daily active users**: 100-500
- **Database records**: Millions (500MB = ~1M emission records)
- **API requests**: Unlimited (Supabase)

**Bottlenecks**:
1. **Railway compute**: 512MB RAM, shared CPU
2. **Database connections**: 60 max on Supabase free tier
3. **Railway execution hours**: 500 hours/month

**When to upgrade**:
- More than 50 concurrent users → Railway Hobby ($5/month)
- More than 500MB data → Supabase Pro ($25/month)
- Need 99.9% uptime → Both paid tiers

---

## Development Questions

### Q: How do I run this locally?

**Quick start**:
```bash
# Clone repository
git clone <your-repo-url>
cd breathe-esg-v2

# Run setup script
bash setup-local.sh  # Linux/Mac
setup-local.bat      # Windows

# Or manual setup:
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py load_sample_data
python manage.py runserver

# In another terminal:
cd frontend
npm install
npm start
```

See [README.md](README.md) for detailed local setup instructions.

### Q: How do I add new emission factors?

**Option 1: Django Admin**:
1. Visit `/admin/core/emissionfactor/`
2. Click "Add emission factor"
3. Fill in details and save

**Option 2: Update constants.py**:
1. Edit `backend/ingestion/parsers/constants.py`
2. Add new factors to `EMISSION_FACTORS` dict
3. Redeploy

**Option 3: API** (if you build an endpoint):
```javascript
POST /api/emission-factors/
{
  "category": "fuel",
  "substance": "biodiesel",
  "unit": "liter",
  "kg_co2e": 2.5,
  "source": "IPCC AR6",
  "effective_from": "2024-01-01"
}
```

### Q: How do I add support for a new data source?

1. **Create parser**: `backend/ingestion/parsers/new_source_parser.py`
2. **Extend base parser**: Inherit from `BaseParser`
3. **Add source type**: Update `IngestionBatch.SOURCE_CHOICES`
4. **Update views**: Add to `ingestion/views.py`
5. **Test with sample data**: Create sample CSV
6. **Update frontend**: Add to upload form options

See existing parsers (`sap_parser.py`, `utility_parser.py`) as examples.

### Q: Can I use this with Docker?

**Yes!** Create `Dockerfile` in backend:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD python manage.py migrate && gunicorn breathe_esg.wsgi:application --bind 0.0.0.0:$PORT
```

Railway and other platforms support Docker deployments.

---

## Troubleshooting

### Q: "DisallowedHost at /"

**Problem**: Django rejects the request  
**Solution**: Add domain to `ALLOWED_HOSTS` in Railway variables

### Q: "CSRF verification failed"

**Problem**: CSRF token mismatch  
**Solution**: Add frontend URL to `CSRF_TRUSTED_ORIGINS`

### Q: "No such table: core_tenant"

**Problem**: Migrations not run  
**Solution**: 
```bash
railway run python manage.py migrate
```

### Q: "Module not found: Can't resolve 'axios'"

**Problem**: Frontend dependencies not installed  
**Solution**:
```bash
cd frontend
npm install
```

### Q: "Connection refused" when accessing API

**Problem**: Backend not running or wrong URL  
**Solution**:
1. Check Railway deployment status
2. Verify `REACT_APP_API_URL` in Vercel
3. Test backend URL directly in browser

---

## Getting Help

### Documentation
- **This project**: See [README.md](README.md), [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md), [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Supabase**: https://supabase.com/docs
- **Railway**: https://docs.railway.app
- **Vercel**: https://vercel.com/docs
- **Django**: https://docs.djangoproject.com

### Community Support
- **Supabase Discord**: https://discord.supabase.com
- **Railway Discord**: https://discord.gg/railway
- **Django Forum**: https://forum.djangoproject.com

### Debugging Tips
1. **Check logs first**: Railway and Vercel dashboards
2. **Test locally**: Reproduce issue on local machine
3. **Verify environment variables**: Most issues are config-related
4. **Check network tab**: Browser DevTools for API errors
5. **Read error messages**: They usually tell you what's wrong

---

## Best Practices

### Security
- ✅ Use strong `SECRET_KEY` in production
- ✅ Set `DEBUG=False` in production
- ✅ Restrict `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
- ✅ Keep `.env` files out of Git
- ✅ Use HTTPS in production (automatic on Vercel/Railway)
- ✅ Regularly update dependencies

### Performance
- ✅ Use database indexes (already included)
- ✅ Enable query caching for repeated queries
- ✅ Optimize images and assets
- ✅ Use CDN for static files (Vercel provides this)
- ✅ Monitor database query performance

### Maintenance
- ✅ Regular database backups (automatic on Supabase)
- ✅ Monitor error logs (Railway/Vercel dashboards)
- ✅ Keep dependencies updated
- ✅ Test before deploying to production
- ✅ Document any custom configuration

---

## Quick Reference

### Useful Commands

```bash
# Railway CLI
railway login
railway link
railway run <command>
railway logs
railway variables

# Django Management
python manage.py migrate
python manage.py createsuperuser
python manage.py load_sample_data
python manage.py check --deploy

# Database
psql "postgresql://..."
pg_dump "postgresql://..." > backup.sql

# Frontend
npm install
npm start
npm run build
```

### Useful URLs

- **Supabase Dashboard**: https://app.supabase.com
- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Django Admin**: `https://your-backend.railway.app/admin/`
- **API Root**: `https://your-backend.railway.app/api/`

---

**Still have questions?** Check the documentation links above or open an issue in the repository.
