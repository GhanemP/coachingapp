-- PostgreSQL Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions that might be needed (these are standard PostgreSQL extensions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create a function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions to the coaching_user
-- Note: These commands will be executed as the postgres superuser during container initialization
GRANT ALL PRIVILEGES ON DATABASE coaching_app TO coaching_user;

-- The following grants will be applied after tables are created by Prisma
-- They are included here for reference but may not take effect until tables exist
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO coaching_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO coaching_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO coaching_user;

-- Set default privileges for future objects created by coaching_user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO coaching_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO coaching_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO coaching_user;

-- Create a simple logging table for application events (optional)
CREATE TABLE IF NOT EXISTS app_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions on the logging table
GRANT ALL PRIVILEGES ON TABLE app_logs TO coaching_user;
GRANT ALL PRIVILEGES ON SEQUENCE app_logs_id_seq TO coaching_user;