#!/bin/bash

# Database setup script for the coaching application
# This script initializes PostgreSQL with Docker and sets up the database

set -e

echo "🚀 Setting up coaching application database with PostgreSQL..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your configuration."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Stop existing containers if running
echo "🛑 Stopping existing database containers..."
docker-compose down --remove-orphans || true

# Start PostgreSQL services with Docker Compose
echo "🐘 Starting PostgreSQL services with Docker Compose..."
docker-compose up -d postgres postgres-shadow pgbouncer

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=60
counter=0
while ! docker-compose exec -T postgres pg_isready -U coaching_user -d coaching_app > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ PostgreSQL failed to start within $timeout seconds"
        docker-compose logs postgres
        exit 1
    fi
    echo "   Waiting for PostgreSQL... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

echo "✅ PostgreSQL is ready!"

# Wait for shadow database to be ready
echo "⏳ Waiting for shadow database to be ready..."
counter=0
while ! docker-compose exec -T postgres-shadow pg_isready -U coaching_user -d coaching_app_shadow > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ Shadow database failed to start within $timeout seconds"
        docker-compose logs postgres-shadow
        exit 1
    fi
    echo "   Waiting for shadow database... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

echo "✅ Shadow database is ready!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Reset and migrate the database
echo "🗄️  Resetting and migrating database..."
npx prisma migrate reset --force --skip-seed

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma db push

# Seed the database with sample data
echo "🌱 Seeding database with sample data..."
node scripts/seed-sample-data.js

echo "✅ Database setup complete!"
echo ""
echo "🎉 Your coaching application is ready to use!"
echo "   PostgreSQL is running on localhost:5432"
echo "   PgBouncer (connection pooling) is running on localhost:6432"
echo "   pgAdmin is available at http://localhost:5050"
echo "     - Email: admin@coaching.local"
echo "     - Password: admin123"
echo ""
echo "   Run 'npm run dev' to start the development server"
echo "   Visit http://localhost:3000 to access the application"
echo ""
echo "📊 Sample data includes:"
echo "   - Demo users with different roles"
echo "   - Sample coaching sessions"
echo "   - Action items and notes"
echo "   - Team structures and scorecards"
echo ""
echo "🔧 Database Management Commands:"
echo "   - View logs: docker-compose logs postgres"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo "   - Access PostgreSQL: docker-compose exec postgres psql -U coaching_user -d coaching_app"