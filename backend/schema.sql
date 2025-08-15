-- SQL script to create hazard_reports table for saferoute_db
CREATE TABLE IF NOT EXISTS hazard_reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hazard_type VARCHAR(50) NOT NULL,
    severity_level VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);
