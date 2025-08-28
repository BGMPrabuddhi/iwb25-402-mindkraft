-- Database: saferoute_db
-- Clean schema creation script for SafeRoute backend

-- Connect to the saferoute_db database
\c saferoute_db;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS password_reset_otps CASCADE;
DROP TABLE IF EXISTS hazard_reports CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create password_reset_otps table
CREATE TABLE password_reset_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expiration_time BIGINT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email)
);

-- Create hazard_reports table
CREATE TABLE hazard_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hazard_type VARCHAR(100) NOT NULL,
    severity_level VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    images TEXT[] DEFAULT '{}',
    image_metadata JSONB,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    district VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_coordinates ON users(latitude, longitude);
CREATE INDEX idx_users_address ON users(address);

-- Create indexes for password_reset_otps table
CREATE INDEX idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX idx_password_reset_otps_expiration ON password_reset_otps(expiration_time);

-- Create indexes for hazard_reports table
CREATE INDEX idx_hazard_reports_user_id ON hazard_reports(user_id);
CREATE INDEX idx_hazard_reports_type ON hazard_reports(hazard_type);
CREATE INDEX idx_hazard_reports_severity ON hazard_reports(severity_level);
CREATE INDEX idx_hazard_reports_status ON hazard_reports(status);
CREATE INDEX idx_hazard_reports_coordinates ON hazard_reports(latitude, longitude);
CREATE INDEX idx_hazard_reports_created_at ON hazard_reports(created_at);
CREATE INDEX idx_hazard_reports_district ON hazard_reports(district);

-- Add constraints for users table
ALTER TABLE users ADD CONSTRAINT check_latitude CHECK (latitude >= -90 AND latitude <= 90);
ALTER TABLE users ADD CONSTRAINT check_longitude CHECK (longitude >= -180 AND longitude <= 180);
ALTER TABLE users ADD CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add constraints for hazard_reports table
ALTER TABLE hazard_reports ADD CONSTRAINT check_hazard_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
ALTER TABLE hazard_reports ADD CONSTRAINT check_hazard_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
ALTER TABLE hazard_reports ADD CONSTRAINT check_hazard_type CHECK (hazard_type IN ('pothole', 'construction', 'accident', 'flooding', 'debris', 'traffic_jam', 'road_closure', 'other'));
ALTER TABLE hazard_reports ADD CONSTRAINT check_severity_level CHECK (severity_level IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE hazard_reports ADD CONSTRAINT check_status CHECK (status IN ('pending', 'active', 'resolved', 'archived'));
ALTER TABLE hazard_reports ADD CONSTRAINT check_district CHECK (
    district IS NULL OR district IN (
        'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
        'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
        'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
        'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
        'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
    )
);

-- Create trigger function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for hazard_reports
CREATE TRIGGER update_hazard_reports_updated_at 
    BEFORE UPDATE ON hazard_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;