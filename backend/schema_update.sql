-- District filtering database update script for SafeRoute
-- This script adds district support to hazard reports for better filtering in RDA dashboard

-- Add district field to hazard_reports table for proper district filtering
ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS district VARCHAR(50);

-- Add index for district filtering
CREATE INDEX IF NOT EXISTS idx_hazard_reports_district ON hazard_reports(district);

-- Add constraint to check valid Sri Lankan districts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_district' 
        AND table_name = 'hazard_reports'
    ) THEN
        ALTER TABLE hazard_reports ADD CONSTRAINT check_district CHECK (
            district IS NULL OR district IN (
                'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
                'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
                'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
                'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
                'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
            )
        );
    END IF;
END$$;

-- Create resolved_hazard_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS resolved_hazard_reports (
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
    resolved_by INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for resolved reports
CREATE INDEX IF NOT EXISTS idx_resolved_hazard_reports_district ON resolved_hazard_reports(district);
CREATE INDEX IF NOT EXISTS idx_resolved_hazard_reports_original_id ON resolved_hazard_reports(original_report_id);
CREATE INDEX IF NOT EXISTS idx_resolved_hazard_reports_resolved_at ON resolved_hazard_reports(resolved_at);

-- Update existing hazard_reports with district information based on coordinates
-- This is a one-time update for existing data
UPDATE hazard_reports 
SET district = CASE 
    WHEN latitude BETWEEN 6.8 AND 7.0 AND longitude BETWEEN 79.8 AND 80.0 THEN 'Colombo'
    WHEN latitude BETWEEN 6.9 AND 7.2 AND longitude BETWEEN 79.9 AND 80.2 THEN 'Gampaha'
    WHEN latitude BETWEEN 6.4 AND 6.8 AND longitude BETWEEN 79.8 AND 80.2 THEN 'Kalutara'
    WHEN latitude BETWEEN 7.1 AND 7.5 AND longitude BETWEEN 80.4 AND 80.8 THEN 'Kandy'
    WHEN latitude BETWEEN 7.3 AND 7.7 AND longitude BETWEEN 80.5 AND 80.9 THEN 'Matale'
    WHEN latitude BETWEEN 6.8 AND 7.2 AND longitude BETWEEN 80.6 AND 81.1 THEN 'Nuwara Eliya'
    WHEN latitude BETWEEN 5.9 AND 6.4 AND longitude BETWEEN 80.0 AND 80.4 THEN 'Galle'
    WHEN latitude BETWEEN 5.8 AND 6.2 AND longitude BETWEEN 80.4 AND 80.8 THEN 'Matara'
    WHEN latitude BETWEEN 6.0 AND 6.5 AND longitude BETWEEN 80.8 AND 81.4 THEN 'Hambantota'
    WHEN latitude BETWEEN 9.4 AND 9.8 AND longitude BETWEEN 79.8 AND 80.2 THEN 'Jaffna'
    WHEN latitude BETWEEN 9.2 AND 9.6 AND longitude BETWEEN 80.2 AND 80.6 THEN 'Kilinochchi'
    WHEN latitude BETWEEN 8.7 AND 9.2 AND longitude BETWEEN 79.6 AND 80.2 THEN 'Mannar'
    WHEN latitude BETWEEN 9.0 AND 9.4 AND longitude BETWEEN 80.6 AND 81.2 THEN 'Mullaitivu'
    WHEN latitude BETWEEN 8.6 AND 9.0 AND longitude BETWEEN 80.2 AND 80.8 THEN 'Vavuniya'
    WHEN latitude BETWEEN 8.2 AND 8.6 AND longitude BETWEEN 80.2 AND 80.8 THEN 'Anuradhapura'
    WHEN latitude BETWEEN 7.7 AND 8.2 AND longitude BETWEEN 80.8 AND 81.4 THEN 'Polonnaruwa'
    WHEN latitude BETWEEN 7.3 AND 7.8 AND longitude BETWEEN 80.0 AND 80.6 THEN 'Kurunegala'
    WHEN latitude BETWEEN 7.8 AND 8.4 AND longitude BETWEEN 79.6 AND 80.2 THEN 'Puttalam'
    WHEN latitude BETWEEN 7.0 AND 7.4 AND longitude BETWEEN 80.1 AND 80.5 THEN 'Kegalle'
    WHEN latitude BETWEEN 6.5 AND 7.0 AND longitude BETWEEN 80.2 AND 80.8 THEN 'Ratnapura'
    WHEN latitude BETWEEN 8.2 AND 8.8 AND longitude BETWEEN 80.8 AND 81.4 THEN 'Trincomalee'
    WHEN latitude BETWEEN 7.5 AND 8.1 AND longitude BETWEEN 81.4 AND 81.8 THEN 'Batticaloa'
    WHEN latitude BETWEEN 6.8 AND 7.5 AND longitude BETWEEN 81.4 AND 81.9 THEN 'Ampara'
    WHEN latitude BETWEEN 6.7 AND 7.2 AND longitude BETWEEN 80.8 AND 81.4 THEN 'Badulla'
    WHEN latitude BETWEEN 6.2 AND 6.8 AND longitude BETWEEN 81.0 AND 81.6 THEN 'Monaragala'
    ELSE NULL
END
WHERE district IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;
