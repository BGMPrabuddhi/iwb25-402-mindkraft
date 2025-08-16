-- Schema script for MindKraft Backend Users Table
-- Database: saferoute_db (must already exist)
-- Run this script to create the users table with all required location fields

-- Connect to the saferoute_db database
\c saferoute_db;

-- Drop the users table if it exists (to recreate with correct structure)
DROP TABLE IF EXISTS users CASCADE;

-- Create the users table with all required fields
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(500) NOT NULL,
    location VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    full_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_coordinates ON users(latitude, longitude);
CREATE INDEX idx_users_location ON users(location);
CREATE INDEX idx_users_city_country ON users(city, country);

-- Add constraints
ALTER TABLE users ADD CONSTRAINT check_latitude CHECK (latitude >= -90 AND latitude <= 90);
ALTER TABLE users ADD CONSTRAINT check_longitude CHECK (longitude >= -180 AND longitude <= 180);
ALTER TABLE users ADD CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Verify the table structure
\d users;

-- Show table info
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'users';

COMMIT;

-- Example insert statement (commented out)
/*
INSERT INTO users (
    first_name, 
    last_name, 
    email, 
    password_hash, 
    location, 
    latitude, 
    longitude, 
    city, 
    state, 
    country, 
    full_address
) VALUES (
    'John',
    'Doe',
    'john.doe@example.com',
    'hashed_password_here:salt_here',
    'Colombo, Sri Lanka',
    6.9271,
    79.8612,
    'Colombo',
    'Western Province',
    'Sri Lanka',
    'Colombo, Western Province, Sri Lanka'
);
*/
