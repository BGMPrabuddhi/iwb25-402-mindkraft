-- SQL script to create hazard_reports table for saferoute_db with image support
DROP TABLE IF EXISTS hazard_reports;

CREATE TABLE hazard_reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hazard_type VARCHAR(50) NOT NULL,
    severity_level VARCHAR(10) NOT NULL,
    images TEXT[], -- Array of image file paths/URLs
    image_metadata JSONB, -- Store image details like file names, sizes, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

-- Create an index on hazard_type for faster filtering
CREATE INDEX idx_hazard_reports_hazard_type ON hazard_reports(hazard_type);

-- Create an index on severity_level for faster filtering
CREATE INDEX idx_hazard_reports_severity_level ON hazard_reports(severity_level);

-- Create an index on status for faster filtering
CREATE INDEX idx_hazard_reports_status ON hazard_reports(status);

-- Create an index on created_at for faster date-based queries
CREATE INDEX idx_hazard_reports_created_at ON hazard_reports(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at on record changes
CREATE TRIGGER update_hazard_reports_updated_at 
    BEFORE UPDATE ON hazard_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Display table structure
\d hazard_reports;

-- Display sample data
SELECT id, title, hazard_type, severity_level, created_at, status FROM hazard_reports;