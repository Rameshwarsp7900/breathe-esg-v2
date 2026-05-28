@echo off
REM Local development setup script for Breathe ESG (Windows)

echo.
echo 🚀 Breathe ESG - Local Development Setup
echo ==========================================
echo.

REM Check if .env exists
if not exist backend\.env (
    echo 📝 Creating backend\.env from .env.example...
    copy backend\.env.example backend\.env
    echo ⚠️  Please update backend\.env with your Supabase DATABASE_URL
    echo.
)

REM Backend setup
echo 🔧 Setting up backend...
cd backend

REM Check if virtual environment exists
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Run migrations
echo Running database migrations...
python manage.py migrate

REM Load sample data
echo Loading sample data...
python manage.py load_sample_data

echo.
echo ✅ Backend setup complete!
echo.
echo To start the backend server:
echo   cd backend
echo   venv\Scripts\activate.bat
echo   python manage.py runserver
echo.

REM Frontend setup
cd ..\frontend

echo 🔧 Setting up frontend...

REM Check if node_modules exists
if not exist node_modules (
    echo Installing Node dependencies...
    call npm install
)

echo.
echo ✅ Frontend setup complete!
echo.
echo To start the frontend server:
echo   cd frontend
echo   npm start
echo.

cd ..

echo ==========================================
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Update backend\.env with your Supabase DATABASE_URL
echo 2. Start backend: cd backend ^&^& python manage.py runserver
echo 3. Start frontend: cd frontend ^&^& npm start
echo 4. Visit http://localhost:3000
echo.
echo Default credentials:
echo   Admin:   admin / admin123
echo   Analyst: analyst / analyst123
echo   Viewer:  viewer / viewer123
echo.

pause
