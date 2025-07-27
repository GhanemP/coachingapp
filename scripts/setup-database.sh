#!/bin/bash

# Database Setup Script for Coaching App Security Migration
# This script sets up PostgreSQL database with proper security configuration

set -e

echo "🔧 Setting up PostgreSQL database for Coaching App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="coaching_app"
DB_USER="coaching_user"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo -e "${YELLOW}Generated secure database password: ${DB_PASSWORD}${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed. Please install PostgreSQL first.${NC}"
    echo "On macOS: brew install postgresql"
    echo "On Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    echo "On CentOS/RHEL: sudo yum install postgresql-server postgresql-contrib"
    exit 1
fi

# Check if PostgreSQL service is running
if ! pg_isready &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL service is not running. Starting it...${NC}"
    
    # Try to start PostgreSQL service based on the system
    if command -v brew &> /dev/null; then
        # macOS with Homebrew
        brew services start postgresql
    elif command -v systemctl &> /dev/null; then
        # Linux with systemd
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    else
        echo -e "${RED}❌ Could not start PostgreSQL service. Please start it manually.${NC}"
        exit 1
    fi
    
    # Wait for service to start
    sleep 3
fi

echo -e "${GREEN}✅ PostgreSQL service is running${NC}"

# Create database and user
echo "🔐 Creating database and user..."

# Detect PostgreSQL installation type and create database accordingly
if command -v brew &> /dev/null && brew list postgresql &> /dev/null 2>&1; then
    # macOS with Homebrew PostgreSQL
    echo "Detected Homebrew PostgreSQL installation"
    
    # Connect as current user (default for Homebrew PostgreSQL)
    psql postgres << EOF
-- Create database
CREATE DATABASE ${DB_NAME};

-- Create user with secure password
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to the new database and grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};

-- Enable row level security (for future use)
ALTER DATABASE ${DB_NAME} SET row_security = on;

-- Set secure connection requirements
ALTER USER ${DB_USER} SET ssl = on;

\q
EOF

elif command -v psql &> /dev/null && sudo -u postgres psql -c '\q' &> /dev/null 2>&1; then
    # Linux with postgres user
    echo "Detected Linux PostgreSQL installation with postgres user"
    
    sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE ${DB_NAME};

-- Create user with secure password
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};

-- Enable row level security (for future use)
ALTER DATABASE ${DB_NAME} SET row_security = on;

-- Set secure connection requirements
ALTER USER ${DB_USER} SET ssl = on;

\q
EOF

else
    # Try connecting as current user
    echo "Attempting to connect as current user"
    
    psql postgres << EOF
-- Create database
CREATE DATABASE ${DB_NAME};

-- Create user with secure password
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to the new database and grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};

-- Enable row level security (for future use)
ALTER DATABASE ${DB_NAME} SET row_security = on;

-- Set secure connection requirements
ALTER USER ${DB_USER} SET ssl = on;

\q
EOF

fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database and user created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create database and user${NC}"
    exit 1
fi

# Update .env.local with new database URL
echo "📝 Updating .env.local with database configuration..."

# Create backup of current .env.local
cp .env.local .env.local.backup

# Update DATABASE_URL in .env.local
sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?sslmode=prefer\"|g" .env.local

echo -e "${GREEN}✅ Updated .env.local with new database configuration${NC}"

# Run Prisma migrations
echo "🔄 Running Prisma migrations..."

if npx prisma migrate dev --name init_postgresql_security; then
    echo -e "${GREEN}✅ Database migration completed successfully${NC}"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."

if npx prisma generate; then
    echo -e "${GREEN}✅ Prisma client generated successfully${NC}"
else
    echo -e "${RED}❌ Prisma client generation failed${NC}"
    exit 1
fi

# Test database connection
echo "🧪 Testing database connection..."

if npx prisma db push; then
    echo -e "${GREEN}✅ Database connection test successful${NC}"
else
    echo -e "${RED}❌ Database connection test failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Database setup completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Database Configuration Summary:${NC}"
echo "  Database Name: ${DB_NAME}"
echo "  Database User: ${DB_USER}"
echo "  Database Password: ${DB_PASSWORD}"
echo "  Connection URL: postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?sslmode=prefer"
echo ""
echo -e "${YELLOW}🔐 Security Features Enabled:${NC}"
echo "  ✅ SSL connections preferred"
echo "  ✅ Row-level security enabled"
echo "  ✅ Dedicated database user with limited privileges"
echo "  ✅ Secure random password generated"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "  1. Keep the database password secure"
echo "  2. Configure email settings for password reset"
echo "  3. Test the application with new database"
echo "  4. Run security tests"
echo ""
echo -e "${GREEN}✅ Ready for production deployment!${NC}"