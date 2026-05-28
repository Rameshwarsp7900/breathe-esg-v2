@echo off
REM Interactive Supabase connection setup script for Windows

echo ================================================================
echo      Breathe ESG - Supabase Connection Setup
echo ================================================================
echo.

REM Check if backend\.env exists
if not exist backend\.env (
    echo Creating backend\.env from .env.example...
    copy backend\.env.example backend\.env
)

echo Let's connect to Supabase!
echo.
echo First, you need to create a Supabase project:
echo 1. Go to https://supabase.com
echo 2. Sign up/Sign in
echo 3. Create a new project
echo 4. Wait for provisioning (~2 minutes)
echo.
pause

echo.
echo Now, let's get your connection details:
echo 1. In Supabase dashboard, go to Settings -^> Database
echo 2. Find 'Connection string' section
echo 3. Select 'URI' tab
echo 4. Copy the connection string
echo.
echo It should look like:
echo postgresql://postgres:[YOUR-PASSWORD]@db.abc123xyz.supabase.co:5432/postgres
echo.

set /p DATABASE_URL="Enter your Supabase connection string: "

REM Validate the connection string
echo %DATABASE_URL% | findstr /C:"postgresql://" >nul
if errorlevel 1 (
    echo.
    echo Invalid connection string. It should start with 'postgresql://'
    pause
    exit /b 1
)

echo.
echo Connection string received!
echo.

REM Update backend\.env
echo Updating backend\.env...

REM Create a temporary file
set "temp_file=%TEMP%\env_temp.txt"

REM Read and update the .env file
(
    for /f "usebackq delims=" %%a in ("backend\.env") do (
        echo %%a | findstr /C:"DATABASE_URL=" >nul
        if errorlevel 1 (
            echo %%a
        ) else (
            echo DATABASE_URL=%DATABASE_URL%
        )
    )
) > "%temp_file%"

REM Replace the original file
move /y "%temp_file%" backend\.env >nul

echo backend\.env updated!
echo.

REM Test connection
echo Testing database connection...
echo.

cd backend

REM Check if virtual environment exists
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -q -r requirements.txt

REM Test connection with migrations
echo.
echo Running database migrations...
python manage.py migrate

if %errorlevel% equ 0 (
    echo.
    echo Successfully connected to Supabase!
    echo.
    
    REM Ask if user wants to load sample data
    set /p load_data="Do you want to load sample data? (y/n): "
    
    if /i "%load_data%"=="y" (
        echo.
        echo Loading sample data...
        python manage.py load_sample_data
        echo.
        echo Sample data loaded!
    )
    
    echo.
    echo ================================================================
    echo                    Setup Complete!
    echo ================================================================
    echo.
    echo Your Django application is now connected to Supabase!
    echo.
    echo Next steps:
    echo 1. Start the backend:  python manage.py runserver
    echo 2. Start the frontend: cd ..\frontend ^&^& npm start
    echo 3. Visit: http://localhost:3000
    echo 4. Login with: admin / admin123
    echo.
    echo For more information, see SUPABASE_SETUP.md
    echo.
    
    REM Ask if user wants to start the server
    set /p start_server="Do you want to start the Django server now? (y/n): "
    
    if /i "%start_server%"=="y" (
        echo.
        echo Starting Django server...
        echo Visit: http://localhost:8000/api/
        echo.
        python manage.py runserver
    )
) else (
    echo.
    echo Connection failed!
    echo.
    echo Troubleshooting:
    echo 1. Verify your connection string is correct
    echo 2. Check your database password
    echo 3. Ensure your Supabase project is active
    echo 4. Test with: psql "%DATABASE_URL%"
    echo.
    echo See SUPABASE_SETUP.md for detailed troubleshooting
)

cd ..
pause
