-- Database setup script for MindKraft Backend
-- Run this script in your PostgreSQL database

-- Create the database (if it doesn't exist)
-- CREATE DATABASE saferoute_db;

-- Connect to the database
\c saferoute_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Sample data (optional - for testing)
-- INSERT INTO users (first_name, last_name, email, password_hash) 
-- VALUES ('Test', 'User', 'test@example.com', 'dummy_hash:dummy_salt');
