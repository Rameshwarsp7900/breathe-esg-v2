#!/bin/bash
# Local development setup script for Breathe ESG

echo "🚀 Breathe ESG - Local Development Setup"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env from .env.example..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please update backend/.env with your Supabase DATABASE_URL"
    echo ""
fi

# Backend setup
echo "🔧 Setting up backend..."
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Run migrations
echo "Running database migrations..."
python manage.py migrate

# Load sample data
echo "Loading sample data..."
python manage.py load_sample_data

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "To start the backend server:"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  python manage.py runserver"
echo ""

# Frontend setup
cd ../frontend

echo "🔧 Setting up frontend..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install
fi

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "To start the frontend server:"
echo "  cd frontend"
echo "  npm start"
echo ""

echo "=========================================="
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your Supabase DATABASE_URL"
echo "2. Start backend: cd backend && python manage.py runserver"
echo "3. Start frontend: cd frontend && npm start"
echo "4. Visit http://localhost:3000"
echo ""
echo "Default credentials:"
echo "  Admin:   admin / admin123"
echo "  Analyst: analyst / analyst123"
echo "  Viewer:  viewer / viewer123"
echo ""
