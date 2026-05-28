# Supabase Setup Guide

Follow these steps to connect your Breathe ESG application to Supabase.

---

## Step 1: Create Supabase Account & Project

### 1.1 Sign Up for Supabase

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"**
3. Sign up with GitHub (recommended) or email

### 1.2 Create a New Project

1. Click **"New Project"**
2. Fill in the details:
   - **Name**: `breathe-esg` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location (e.g., `US East`, `Europe West`)
   - **Pricing Plan**: Select **Free** tier
3. Click **"Create new project"**
4. Wait ~2 minutes for provisioning

---

## Step 2: Get Your Connection Details

### 2.1 Get Database Connection String

1. In your Supabase project dashboard, go to **Settings** (gear icon in sidebar)
2. Click **Database** in the left menu
3. Scroll to **Connection string** section
4. Select **URI** tab
5. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abc123xyz.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the password you created in Step 1.2

**Example:**
```
postgresql://postgres:mySecurePassword123@db.xyzabc123.supabase.co:5432/postgres
```

### 2.2 Get API Keys (Optional - for Supabase Auth later)

1. Go to **Settings** → **API**
2. Copy these values (save for later):
   - **Project URL**: `https://xyzabc123.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## Step 3: Update Your Local Configuration

### 3.1 Update backend/.env

Open `backend/.env` and update the `DATABASE_URL`:

```env
# Replace the SQLite URL with your Supabase PostgreSQL URL
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

# Keep other settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

**Important**: Replace:
- `YOUR_PASSWORD` with your actual database password
- `YOUR_PROJECT_REF` with your project reference (from the connection string)

---

## Step 4: Test the Connection

### 4.1 Install Dependencies (if not already done)

```bash
cd backend
pip install -r requirements.txt
```

### 4.2 Test Database Connection

```bash
# Run migrations to create tables in Supabase
python manage.py migrate
```

**Expected output:**
```
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, core, ingestion, sessions
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  ...
```

### 4.3 Load Sample Data

```bash
python manage.py load_sample_data
```

**Expected output:**
```
Creating tenants...
Creating users...
Loading emission factors...
...
Sample data loaded successfully!
```

### 4.4 Start the Server

```bash
python manage.py runserver
```

Visit: http://localhost:8000/api/

---

## Step 5: Verify in Supabase Dashboard

### 5.1 Check Tables

1. Go to your Supabase project dashboard
2. Click **Table Editor** in the sidebar
3. You should see tables like:
   - `auth_user`
   - `core_tenant`
   - `core_emissionrecord`
   - `core_ingestionbatch`
   - etc.

### 5.2 View Data

1. Click on any table (e.g., `core_tenant`)
2. You should see the sample data loaded
3. Try the **SQL Editor** to run queries:
   ```sql
   SELECT COUNT(*) FROM core_emissionrecord;
   ```

---

## Step 6: Test the Application

### 6.1 Start Frontend

```bash
cd frontend
npm install  # if not already done
npm start
```

### 6.2 Login

1. Visit: http://localhost:3000
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. You should see the dashboard with data!

---

## Troubleshooting

### Connection Refused

**Problem**: Can't connect to Supabase database

**Solutions**:
1. Verify the connection string is correct
2. Check your database password
3. Ensure your IP is not blocked (Supabase free tier allows all IPs)
4. Test connection with psql:
   ```bash
   psql "postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
   ```

### SSL Error

**Problem**: SSL connection error

**Solution**: Add `?sslmode=require` to your connection string:
```
postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require
```

### Migration Errors

**Problem**: Migrations fail

**Solutions**:
1. Check if database is empty (no conflicting tables)
2. Try running migrations one by one:
   ```bash
   python manage.py migrate core
   python manage.py migrate ingestion
   ```
3. Check Django logs for specific errors

### "Too Many Connections"

**Problem**: Connection pool exhausted

**Solution**: Supabase free tier has 60 connection limit. Close unused connections:
```bash
# In Django settings, add:
DATABASES = {
    'default': {
        ...
        'CONN_MAX_AGE': 600,  # Connection pooling
    }
}
```

---

## Next Steps

### For Local Development
✅ You're all set! Continue developing locally with Supabase as your database.

### For Production Deployment
Follow the deployment guides:
1. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Deploy to Railway + Vercel
2. Use the same Supabase database for production (or create a separate production project)

---

## Supabase Features You Can Use

### Current Setup
- ✅ PostgreSQL database
- ✅ Automatic backups (daily, 7-day retention)
- ✅ Table Editor UI
- ✅ SQL Editor
- ✅ Database monitoring

### Optional Features (for later)
- 🔄 **Supabase Auth** - Replace Django auth with Supabase authentication
- 🔄 **Storage** - Store uploaded CSV files in Supabase Storage
- 🔄 **Real-time** - Live updates for dashboard
- 🔄 **Edge Functions** - Serverless functions for processing

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) Phase 5 for Supabase Auth migration.

---

## Quick Reference

### Connection String Format
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### Common Commands
```bash
# Test connection
psql "postgresql://..."

# Run migrations
python manage.py migrate

# Load sample data
python manage.py load_sample_data

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### Supabase Dashboard URLs
- **Project Dashboard**: https://app.supabase.com/project/[PROJECT_REF]
- **Table Editor**: https://app.supabase.com/project/[PROJECT_REF]/editor
- **SQL Editor**: https://app.supabase.com/project/[PROJECT_REF]/sql
- **Database Settings**: https://app.supabase.com/project/[PROJECT_REF]/settings/database

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Project FAQ**: [FAQ.md](FAQ.md)

---

**You're now connected to Supabase!** 🎉

Your Django application is using Supabase PostgreSQL as the database. All data is stored in the cloud with automatic backups.
