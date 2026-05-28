# Deploy to Railway & Vercel - Step by Step

Your code is now on GitHub! Let's deploy to Railway (backend) and Vercel (frontend).

**Repository**: https://github.com/Rameshwarsp7900/breathe-esg-v2

---

## 🚂 Part 1: Deploy Backend to Railway (10 minutes)

### Step 1: Create Railway Account

1. Go to **https://railway.app**
2. Click **"Start a New Project"** or **"Login"**
3. Sign in with **GitHub** (recommended)
4. Authorize Railway to access your repositories

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **`Rameshwarsp7900/breathe-esg-v2`**
4. Railway will detect Django automatically ✅

### Step 3: Configure Root Directory

1. In the project settings, find **"Root Directory"**
2. Set it to: **`backend`**
3. Railway will now look in the backend folder

### Step 4: Add Environment Variables

Click **"Variables"** tab and add these:

```env
DATABASE_URL=postgresql://postgres.anacfhpjjfjiuucmpack:xGuPSr0R7jvR9VwV@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

SECRET_KEY=xGuPSr0R7jvR9VwV

DEBUG=False

ALLOWED_HOSTS=.railway.app

CORS_ALLOW_ALL_ORIGINS=False

CORS_ALLOWED_ORIGINS=http://localhost:3000

CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

**Note**: We'll update CORS settings after Vercel deployment.

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait 3-5 minutes for build
3. Check logs for any errors
4. Once deployed, you'll see a URL like: `https://breathe-esg-production.up.railway.app`

### Step 6: Copy Your Railway URL

**Your Railway URL**: `https://_____________________.railway.app`

(Save this - you'll need it for Vercel!)

### Step 7: Load Sample Data

Install Railway CLI:
```bash
npm install -g @railway/cli
```

Login and link:
```bash
railway login
railway link
```

Load sample data:
```bash
railway run python manage.py load_sample_data
```

### Step 8: Test Backend

Visit your Railway URL + `/api/`:
```
https://your-project.railway.app/api/
```

You should see the API root or a 404 (not a 500 error).

---

## ▲ Part 2: Deploy Frontend to Vercel (5 minutes)

### Step 1: Create Vercel Account

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Sign up with **GitHub** (recommended)
4. Authorize Vercel to access your repositories

### Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Find **`Rameshwarsp7900/breathe-esg-v2`**
3. Click **"Import"**

### Step 3: Configure Project

**Framework Preset**: Create React App (auto-detected)

**Root Directory**: Click **"Edit"** and set to: **`frontend`**

**Build Command**: `npm run build` (default)

**Output Directory**: `build` (default)

### Step 4: Add Environment Variable

Click **"Environment Variables"** and add:

**Key**: `REACT_APP_API_URL`

**Value**: `https://YOUR-RAILWAY-URL.railway.app/api`

(Use the Railway URL from Part 1, Step 6)

**Example**:
```
REACT_APP_API_URL=https://breathe-esg-production.up.railway.app/api
```

⚠️ **Important**: No trailing slash after `/api`!

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Once deployed, you'll see a URL like: `https://breathe-esg-v2.vercel.app`

### Step 6: Copy Your Vercel URL

**Your Vercel URL**: `https://_____________________.vercel.app`

(Save this - you'll need it for CORS!)

---

## 🔗 Part 3: Connect Frontend & Backend (5 minutes)

### Step 1: Update Railway CORS Settings

Go back to **Railway** → Your project → **Variables** tab

Update these variables:

```env
CORS_ALLOWED_ORIGINS=https://YOUR-VERCEL-URL.vercel.app

CSRF_TRUSTED_ORIGINS=https://YOUR-VERCEL-URL.vercel.app

ALLOWED_HOSTS=.railway.app,YOUR-VERCEL-URL.vercel.app
```

**Example**:
```env
CORS_ALLOWED_ORIGINS=https://breathe-esg-v2.vercel.app
CSRF_TRUSTED_ORIGINS=https://breathe-esg-v2.vercel.app
ALLOWED_HOSTS=.railway.app,breathe-esg-v2.vercel.app
```

⚠️ **Important**: No `https://` in ALLOWED_HOSTS, no trailing slashes!

### Step 2: Redeploy Backend

Railway will automatically redeploy when you update variables.

Wait ~2 minutes for redeployment.

---

## ✅ Part 4: Test Your Deployment

### Test Backend

Visit: `https://your-railway-url.railway.app/api/`

You should see the API root.

### Test Frontend

1. Visit: `https://your-vercel-url.vercel.app`
2. You should see the login page
3. Login with:
   - Username: **`admin`**
   - Password: **`admin123`**
4. You should see the dashboard with data!

### Test Full Flow

1. Go to **"Ingest Data"** page
2. Upload a sample CSV from `sample_data/`
3. Check processing completes
4. View records in **"Review Queue"**
5. Approve a record
6. Check **"Dashboard"** updates

---

## 🎉 Success Checklist

- [ ] Railway backend deployed and accessible
- [ ] Vercel frontend deployed and accessible
- [ ] Can login to the application
- [ ] Dashboard shows data
- [ ] Can upload files
- [ ] Can review and approve records
- [ ] CORS errors resolved

---

## 🆘 Troubleshooting

### Railway Build Fails

**Check**:
- Root directory is set to `backend`
- All environment variables are set
- Check Railway logs for specific error

**Solution**:
```bash
# Check logs
railway logs
```

### Vercel Build Fails

**Check**:
- Root directory is set to `frontend`
- `REACT_APP_API_URL` is set correctly
- No trailing slash in API URL

**Solution**: Check Vercel deployment logs

### CORS Errors in Browser

**Symptoms**: 
- Can't login
- API requests fail
- Console shows CORS errors

**Solution**:
1. Verify `CORS_ALLOWED_ORIGINS` in Railway matches Vercel URL exactly
2. Verify `CSRF_TRUSTED_ORIGINS` in Railway matches Vercel URL exactly
3. No trailing slashes!
4. Wait for Railway to redeploy (~2 minutes)
5. Hard refresh browser (Ctrl+Shift+R)

### "Application Error" on Railway

**Check**:
- Database connection is working
- All environment variables are set
- Check Railway logs

**Solution**:
```bash
railway logs
```

### Frontend Shows "Network Error"

**Check**:
- `REACT_APP_API_URL` in Vercel is correct
- Railway backend is running
- CORS is configured correctly

**Solution**: Test backend URL directly in browser

---

## 📊 Your Deployment URLs

Fill these in after deployment:

| Service | URL | Status |
|---------|-----|--------|
| **GitHub** | https://github.com/Rameshwarsp7900/breathe-esg-v2 | ✅ Pushed |
| **Supabase** | `db.anacfhpjjfjiuucmpack.supabase.co` | ✅ Connected |
| **Railway** | `https://________________.railway.app` | ⏳ Deploy now |
| **Vercel** | `https://________________.vercel.app` | ⏳ Deploy now |

---

## 🎯 Quick Commands

### Railway CLI
```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Load sample data
railway run python manage.py load_sample_data

# View logs
railway logs

# View variables
railway variables
```

### Update Code
```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin master

# Railway and Vercel auto-deploy!
```

---

## 💰 Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| **Supabase** | Free | $0/month |
| **Railway** | Free ($5 credit) | $0/month |
| **Vercel** | Free | $0/month |
| **Total** | | **$0/month** |

---

## 🚀 Next Steps

After successful deployment:

1. ✅ Change default passwords
2. ✅ Add your team members
3. ✅ Import real data
4. ✅ Customize branding
5. ✅ Set up monitoring
6. ✅ Add custom domain (optional)

---

## 📖 Additional Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Project FAQ**: [FAQ.md](FAQ.md)
- **Quick Reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

**Ready to deploy?** Start with Part 1: Railway Backend! 🚂

**Estimated total time**: 20 minutes

**Let's go!** 🚀
