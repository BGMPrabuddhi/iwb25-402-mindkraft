-- Add email verification OTP table
CREATE TABLE IF NOT EXISTS email_verification_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expiration_time BIGINT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email)
);

-- Create indexes for email_verification_otps table
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_email ON email_verification_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_expiration ON email_verification_otps(expiration_time);

-- Add is_verified column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
