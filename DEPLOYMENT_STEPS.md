# Deployment Steps - Visual Checklist

Quick visual guide for deploying to Railway and Vercel.

---

## ✅ Pre-Deployment Checklist

- [x] Code pushed to GitHub ✅
- [x] Supabase database connected ✅
- [ ] Railway account created
- [ ] Vercel account created

---

## 🚂 Railway Backend Deployment

### 1️⃣ Create Account & Project (2 min)

```
1. Go to railway.app
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose: Rameshwarsp7900/breathe-esg-v2
```

### 2️⃣ Configure Settings (2 min)

```
Root Directory: backend
```

### 3️⃣ Add Environment Variables (3 min)

Copy-paste these into Railway Variables:

```env
DATABASE_URL=postgresql://postgres.anacfhpjjfjiuucmpack:xGuPSr0R7jvR9VwV@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
SECRET_KEY=xGuPSr0R7jvR9VwV
DEBUG=False
ALLOWED_HOSTS=.railway.app
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

### 4️⃣ Deploy (3 min)

```
1. Click "Deploy"
2. Wait for build (~3 minutes)
3. Copy your Railway URL
```

**Your Railway URL**: `_______________________________`

### 5️⃣ Load Sample Data (2 min)

```bash
npm install -g @railway/cli
railway login
railway link
railway run python manage.py load_sample_data
```

---

## ▲ Vercel Frontend Deployment

### 1️⃣ Create Account & Import (2 min)

```
1. Go to vercel.com
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Import: Rameshwarsp7900/breathe-esg-v2
```

### 2️⃣ Configure Settings (1 min)

```
Framework: Create React App
Root Directory: frontend
Build Command: npm run build
Output Directory: build
```

### 3️⃣ Add Environment Variable (1 min)

```
Key: REACT_APP_API_URL
Value: https://YOUR-RAILWAY-URL.railway.app/api
```

⚠️ Replace `YOUR-RAILWAY-URL` with actual Railway URL from above!

### 4️⃣ Deploy (2 min)

```
1. Click "Deploy"
2. Wait for build (~2 minutes)
3. Copy your Vercel URL
```

**Your Vercel URL**: `_______________________________`

---

## 🔗 Connect Frontend & Backend

### Update Railway CORS (2 min)

Go to Railway → Variables → Update:

```env
CORS_ALLOWED_ORIGINS=https://YOUR-VERCEL-URL.vercel.app
CSRF_TRUSTED_ORIGINS=https://YOUR-VERCEL-URL.vercel.app
ALLOWED_HOSTS=.railway.app,YOUR-VERCEL-URL.vercel.app
```

⚠️ Replace `YOUR-VERCEL-URL` with actual Vercel URL!

Wait ~2 minutes for Railway to redeploy.

---

## ✅ Test Deployment

### Test Backend
```
Visit: https://your-railway-url.railway.app/api/
Expected: API root or 404 (not 500)
```

### Test Frontend
```
Visit: https://your-vercel-url.vercel.app
Login: admin / admin123
Expected: Dashboard with data
```

---

## 🎉 Deployment Complete!

Your application is now live:

- **Frontend**: https://your-vercel-url.vercel.app
- **Backend**: https://your-railway-url.railway.app
- **Database**: Supabase (connected)

**Total Time**: ~20 minutes

---

## 🆘 Quick Troubleshooting

### CORS Error
```
1. Check CORS_ALLOWED_ORIGINS matches Vercel URL exactly
2. No trailing slashes
3. Wait for Railway redeploy
4. Hard refresh browser (Ctrl+Shift+R)
```

### Railway Build Failed
```
1. Check Railway logs
2. Verify root directory is "backend"
3. Verify all environment variables are set
```

### Vercel Build Failed
```
1. Check Vercel logs
2. Verify root directory is "frontend"
3. Verify REACT_APP_API_URL is set
```

### Can't Login
```
1. Check CORS settings in Railway
2. Test backend URL directly
3. Check browser console for errors
```

---

## 📖 Detailed Guide

For step-by-step instructions with screenshots, see:
**[DEPLOY_NOW.md](DEPLOY_NOW.md)**

---

**Ready? Let's deploy!** 🚀

Start here: **https://railway.app**
