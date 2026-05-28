#!/bin/bash
# Interactive Supabase connection setup script

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Breathe ESG - Supabase Connection Setup               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if backend/.env exists
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend/.env from .env.example..."
    cp backend/.env.example backend/.env
fi

echo "🔗 Let's connect to Supabase!"
echo ""
echo "First, you need to create a Supabase project:"
echo "1. Go to https://supabase.com"
echo "2. Sign up/Sign in"
echo "3. Create a new project"
echo "4. Wait for provisioning (~2 minutes)"
echo ""
read -p "Press Enter when your Supabase project is ready..."

echo ""
echo "Now, let's get your connection details:"
echo "1. In Supabase dashboard, go to Settings → Database"
echo "2. Find 'Connection string' section"
echo "3. Select 'URI' tab"
echo "4. Copy the connection string"
echo ""
echo "It should look like:"
echo "postgresql://postgres:[YOUR-PASSWORD]@db.abc123xyz.supabase.co:5432/postgres"
echo ""

read -p "Enter your Supabase connection string: " DATABASE_URL

# Validate the connection string
if [[ ! $DATABASE_URL =~ ^postgresql:// ]]; then
    echo "❌ Invalid connection string. It should start with 'postgresql://'"
    exit 1
fi

echo ""
echo "✅ Connection string received!"
echo ""

# Update backend/.env
echo "📝 Updating backend/.env..."

# Create a temporary file
temp_file=$(mktemp)

# Read the .env file and update DATABASE_URL
while IFS= read -r line; do
    if [[ $line =~ ^DATABASE_URL= ]]; then
        echo "DATABASE_URL=$DATABASE_URL" >> "$temp_file"
    else
        echo "$line" >> "$temp_file"
    fi
done < backend/.env

# Replace the original file
mv "$temp_file" backend/.env

echo "✅ backend/.env updated!"
echo ""

# Test connection
echo "🧪 Testing database connection..."
echo ""

cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Test connection with migrations
echo ""
echo "🔄 Running database migrations..."
python manage.py migrate

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully connected to Supabase!"
    echo ""
    
    # Ask if user wants to load sample data
    read -p "Do you want to load sample data? (y/n): " load_data
    
    if [ "$load_data" = "y" ] || [ "$load_data" = "Y" ]; then
        echo ""
        echo "📊 Loading sample data..."
        python manage.py load_sample_data
        echo ""
        echo "✅ Sample data loaded!"
    fi
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    Setup Complete! 🎉                      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Your Django application is now connected to Supabase!"
    echo ""
    echo "Next steps:"
    echo "1. Start the backend:  python manage.py runserver"
    echo "2. Start the frontend: cd ../frontend && npm start"
    echo "3. Visit: http://localhost:3000"
    echo "4. Login with: admin / admin123"
    echo ""
    echo "📖 For more information, see SUPABASE_SETUP.md"
    echo ""
    
    # Ask if user wants to start the server
    read -p "Do you want to start the Django server now? (y/n): " start_server
    
    if [ "$start_server" = "y" ] || [ "$start_server" = "Y" ]; then
        echo ""
        echo "🚀 Starting Django server..."
        echo "Visit: http://localhost:8000/api/"
        echo ""
        python manage.py runserver
    fi
else
    echo ""
    echo "❌ Connection failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Verify your connection string is correct"
    echo "2. Check your database password"
    echo "3. Ensure your Supabase project is active"
    echo "4. Test with: psql \"$DATABASE_URL\""
    echo ""
    echo "📖 See SUPABASE_SETUP.md for detailed troubleshooting"
fi
