# SafeRoute - Traffic Management System

A comprehensive traffic management system with real-time reporting and route optimization capabilities.

## 🛠️ Environment Setup & Configuration

#### 1. Google Maps API Key

**Required for:** Map functionality, geocoding, and route optimization

**How to obtain:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Directions API
4. Go to "Credentials" and create an API key
5. Restrict the API key to your domain for security

#### 2. Database Configuration

**Required for:** PostgreSQL database connection

**How to obtain:**
- Set up a PostgreSQL database (local or cloud service like Railway, Supabase, etc.)
- Get the connection details: host, port, database name, username, password

#### 3. Email Service Configuration

**Required for:** Email notifications and verification

**How to obtain:**
- Set up SMTP service (Gmail, SendGrid, etc.)
- For Gmail: Enable 2-factor authentication and create an App Password

### Configuration Files Setup

#### Frontend Environment (.env)

1. Copy the example file:
   ```bash
   cp frontend/.env.example frontend/.env
   ```

2. Fill in your actual values:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080/api
   NEXT_PUBLIC_USE_PROXY=false
   NODE_ENV=development
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-google-maps-api-key
   ```

#### Backend Configuration (Config.toml)

1. Copy the example file:
   ```bash
   cp backend/Config.example.toml backend/Config.toml
   ```

2. Fill in your actual values:
   ```toml
   # Server Configuration
   serverPort = 8080
   corsOrigins = ["http://localhost:3000"]

   # Database Configuration
   [backend.database]
   host = "your-actual-database-host"
   port = 5432
   name = "your-actual-database-name"
   username = "your-actual-database-username"
   password = "your-actual-database-password"

   # JWT Configuration
   [backend.auth]
   jwtSecret = "your-actual-jwt-secret-key"
   jwtIssuer = "mindkraft-auth"
   jwtAudience = "saferoute-users"
   jwtExpiry = 3600

   # Email Configuration
   smtpHost = "smtp.gmail.com"
   smtpPort = 587
   smtpUsername = "your-actual-email@gmail.com"
   smtpPassword = "your-actual-app-password"
   emailEnabled = true
   ```

### Security Notes

- ✅ Example files (`.env.example`, `Config.example.toml`) are included in the repository
- ✅ Actual configuration files (`.env`, `Config.toml`) are ignored by git
- ✅ No API keys or secrets are committed to the repository
- ⚠️ Always use environment-specific configuration files
- ⚠️ Never share your actual configuration files

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Ballerina (latest version)
- PostgreSQL database
- Google Maps API key

### Installation

1. Clone the repository
2. Set up configuration files as described above
3. Install dependencies and start the services:

   **Backend:**
   ```bash
   cd backend
   bal run
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Project Structure

```
SafeRoute/
├── backend/           # Ballerina backend service
├── frontend/          # Next.js frontend application
├── Config.example.toml # Backend configuration template
└── README.md         # This file
```

## 📝 Development Guidelines

- Always use example files for templates
- Never commit actual API keys or secrets
- Update example files when adding new configuration options
- Document any new API key requirements in this README

## 🔒 Security

This project follows security best practices:
- Sensitive configuration is excluded from version control
- API keys are managed through environment variables
- Example files provide clear setup instructions without exposing secrets
