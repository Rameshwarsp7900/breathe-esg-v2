# Connect to Supabase - Quick Guide

**Choose your method:**

---

## 🚀 Method 1: Interactive Script (Easiest)

Run the automated setup script:

### Windows
```bash
connect-supabase.bat
```

### Linux/Mac
```bash
bash connect-supabase.sh
```

The script will:
1. ✅ Guide you through creating a Supabase project
2. ✅ Ask for your connection string
3. ✅ Update your `.env` file automatically
4. ✅ Test the connection
5. ✅ Load sample data (optional)
6. ✅ Start the server (optional)

**Time: 5 minutes**

---

## 📝 Method 2: Manual Setup

### Step 1: Create Supabase Project (2 minutes)

1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with GitHub or email
4. Click **"New Project"**
5. Fill in:
   - Name: `breathe-esg`
   - Password: (create a strong password - save it!)
   - Region: (choose closest to you)
6. Click **"Create new project"**
7. Wait ~2 minutes

### Step 2: Get Connection String (1 minute)

1. In Supabase dashboard, click **Settings** (⚙️ icon)
2. Click **Database** in left menu
3. Scroll to **Connection string**
4. Click **URI** tab
5. Copy the string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abc123xyz.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your actual password

### Step 3: Update Configuration (1 minute)

Open `backend/.env` and update:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

### Step 4: Test Connection (2 minutes)

```bash
cd backend

# Install dependencies (if not done)
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Load sample data
python manage.py load_sample_data

# Start server
python manage.py runserver
```

Visit: **http://localhost:8000/api/**

**Time: 6 minutes**

---

## ✅ Verify Connection

### Check in Supabase Dashboard

1. Go to **Table Editor** in Supabase
2. You should see tables:
   - `auth_user`
   - `core_tenant`
   - `core_emissionrecord`
   - `core_ingestionbatch`
   - etc.

### Check in Application

1. Start frontend: `cd frontend && npm start`
2. Visit: **http://localhost:3000**
3. Login: `admin` / `admin123`
4. You should see dashboard with data!

---

## 🆘 Troubleshooting

### "Connection refused"
- ✅ Check connection string is correct
- ✅ Verify password is correct
- ✅ Ensure Supabase project is active (not paused)

### "SSL required"
Add `?sslmode=require` to connection string:
```
postgresql://...postgres?sslmode=require
```

### "Too many connections"
This is rare on free tier. Close unused connections or wait a few minutes.

### Still having issues?
See detailed troubleshooting in **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**

---

## 📊 What You Get

### Supabase Free Tier
- ✅ 500MB PostgreSQL database
- ✅ Unlimited API requests
- ✅ Automatic daily backups (7-day retention)
- ✅ Table Editor UI
- ✅ SQL Editor
- ✅ Real-time monitoring
- ✅ 60 concurrent connections

### Cost
**$0/month** - Perfect for development and small production deployments

---

## 🎯 Next Steps

### For Local Development
✅ You're done! Continue developing with Supabase as your database.

### For Production Deployment
1. Keep using the same Supabase project, OR
2. Create a separate production Supabase project
3. Follow **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** to deploy to Railway + Vercel

---

## 📖 Additional Resources

- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Detailed setup guide
- **[FAQ.md](FAQ.md)** - Common questions
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Command reference
- **Supabase Docs**: https://supabase.com/docs

---

## 🎉 Success!

Once connected, your application will:
- ✅ Store all data in Supabase PostgreSQL
- ✅ Have automatic daily backups
- ✅ Be ready for production deployment
- ✅ Scale with your needs

**Happy coding!** 🚀
