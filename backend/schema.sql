-- Database: saferoute_db
-- Complete schema creation script for SafeRoute backend

-- Connect to the saferoute_db database
\c saferoute_db;

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS report_likes CASCADE;
DROP TABLE IF EXISTS report_comments CASCADE;
DROP TABLE IF EXISTS resolved_hazard_reports CASCADE;
DROP TABLE IF EXISTS hazard_reports CASCADE;
DROP TABLE IF EXISTS email_verification_otps CASCADE;
DROP TABLE IF EXISTS password_reset_otps CASCADE;
DROP TABLE IF EXISTS pending_user_registrations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    contact_number VARCHAR(20), -- nullable and not unique for RDA users
    password_hash VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL,
    profile_image TEXT,
    user_role VARCHAR(50) DEFAULT 'general',
    is_email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_verification_otps table
CREATE TABLE email_verification_otps (
    email VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
    otp VARCHAR(10) NOT NULL,
    expiration_time INT NOT NULL,
    is_used BOOLEAN DEFAULT false,
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

-- Create pending_user_registrations table
CREATE TABLE pending_user_registrations (
    email VARCHAR(255) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20), -- nullable for RDA users
    password_hash VARCHAR(500) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expiration_time INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Create resolved_hazard_reports table
CREATE TABLE resolved_hazard_reports (
    id SERIAL PRIMARY KEY,
    original_report_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hazard_type VARCHAR(100) NOT NULL,
    severity_level VARCHAR(50) NOT NULL,
    images TEXT[] DEFAULT '{}',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    district VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create report_comments table
CREATE TABLE report_comments (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES hazard_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create report_likes table
CREATE TABLE report_likes (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    is_like BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES hazard_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(report_id, user_id)
);

-- Create indexes for users table
CREATE INDEX idx_users_contact_number ON users(contact_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_coordinates ON users(latitude, longitude);
CREATE INDEX idx_users_address ON users(address);
CREATE INDEX idx_users_role ON users(user_role);
CREATE INDEX idx_users_verified ON users(is_email_verified);

-- Create indexes for email_verification_otps table
CREATE INDEX idx_email_verification_expiry ON email_verification_otps(expiration_time);

-- Create indexes for password_reset_otps table
CREATE INDEX idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX idx_password_reset_otps_expiration ON password_reset_otps(expiration_time);

-- Create indexes for pending_user_registrations table
CREATE INDEX idx_pending_registrations_email ON pending_user_registrations(email);
CREATE INDEX idx_pending_registrations_expiration ON pending_user_registrations(expiration_time);

-- Create indexes for hazard_reports table
CREATE INDEX idx_hazard_reports_user_id ON hazard_reports(user_id);
CREATE INDEX idx_hazard_reports_type ON hazard_reports(hazard_type);
CREATE INDEX idx_hazard_reports_severity ON hazard_reports(severity_level);
CREATE INDEX idx_hazard_reports_status ON hazard_reports(status);
CREATE INDEX idx_hazard_reports_coordinates ON hazard_reports(latitude, longitude);
CREATE INDEX idx_hazard_reports_created_at ON hazard_reports(created_at);
CREATE INDEX idx_hazard_reports_district ON hazard_reports(district);
CREATE INDEX idx_hazard_reports_status_created_at ON hazard_reports(status, created_at);
CREATE INDEX idx_hazard_reports_location_time ON hazard_reports(latitude, longitude, created_at);

-- Create indexes for resolved_hazard_reports table
CREATE INDEX idx_resolved_reports_user_id ON resolved_hazard_reports(user_id);
CREATE INDEX idx_resolved_reports_type ON resolved_hazard_reports(hazard_type);
CREATE INDEX idx_resolved_reports_resolved_at ON resolved_hazard_reports(resolved_at);
CREATE INDEX idx_resolved_hazard_reports_district ON resolved_hazard_reports(district);
CREATE INDEX idx_resolved_hazard_reports_original_id ON resolved_hazard_reports(original_report_id);

-- Create indexes for report_comments table
CREATE INDEX idx_report_comments_report_id ON report_comments(report_id);
CREATE INDEX idx_report_comments_user_id ON report_comments(user_id);
CREATE INDEX idx_report_comments_created_at ON report_comments(created_at);

-- Create indexes for report_likes table
CREATE INDEX idx_report_likes_report_id ON report_likes(report_id);
CREATE INDEX idx_report_likes_user_id ON report_likes(user_id);

-- Add constraints for users table
ALTER TABLE users ADD CONSTRAINT check_contact_number_format CHECK (contact_number ~* '^[0-9+\-() ]{7,20}$');
ALTER TABLE users ADD CONSTRAINT check_latitude CHECK (latitude >= -90 AND latitude <= 90);
ALTER TABLE users ADD CONSTRAINT check_longitude CHECK (longitude >= -180 AND longitude <= 180);
ALTER TABLE users ADD CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE users ADD CONSTRAINT check_user_role CHECK (user_role IN ('general', 'rda', 'admin'));

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

-- Add constraints for resolved_hazard_reports table
ALTER TABLE resolved_hazard_reports ADD CONSTRAINT check_resolved_hazard_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
ALTER TABLE resolved_hazard_reports ADD CONSTRAINT check_resolved_hazard_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
ALTER TABLE resolved_hazard_reports ADD CONSTRAINT check_resolved_hazard_type CHECK (hazard_type IN ('pothole', 'construction', 'accident', 'flooding', 'debris', 'traffic_jam', 'road_closure', 'other'));
ALTER TABLE resolved_hazard_reports ADD CONSTRAINT check_resolved_severity_level CHECK (severity_level IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE resolved_hazard_reports ADD CONSTRAINT check_resolved_district CHECK (
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

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_hazard_reports_updated_at 
    BEFORE UPDATE ON hazard_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_comments_updated_at 
    BEFORE UPDATE ON report_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_likes_updated_at 
    BEFORE UPDATE ON report_likes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;