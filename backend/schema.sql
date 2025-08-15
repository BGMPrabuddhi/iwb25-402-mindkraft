
-- Create the table (your SQL from earlier)
CREATE TABLE hazard_reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hazard_type VARCHAR(50) NOT NULL,
    severity_level VARCHAR(10) NOT NULL,
    images TEXT[],
    image_metadata JSONB,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);