# SafeRoute

SafeRoute is a web application for safe route planning and hazard reporting, featuring a Ballerina backend and a Next.js frontend with integrated database hosting.

## Quick Start

### Prerequisites
- [Ballerina](https://ballerina.io/downloads/) (for backend)
- [Node.js](https://nodejs.org/) (for frontend)
- Git

### 1-Minute Setup
```bash
# Clone the repository
git clone <repo-url>
cd SafeRoute

# Backend setup
cd backend
copy config.example.toml Config.toml
# Edit Config.toml with the database details below
bal run

# Frontend setup (in a new terminal)
cd ../frontend
npm install
copy .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Table of Contents

- [Quick Start](#quick-start)
- [Database Configuration](#database-configuration)
- [Detailed Setup Instructions](#detailed-setup-instructions)
- [Secret Configuration & API Keys](#secret-configuration--api-keys)
- [Features](#features)
- [Troubleshooting](#troubleshooting)

---

## Database Configuration

The application uses a hosted PostgreSQL database. No local database setup is required.

### Hosted Database Details
- **Host**: shortline.proxy.rlwy.net
- **Port**: 32455
- **Database**: railway
- **Username**: postgres
- **Password**: pFKtmPEPqKeFYIeMDkvfSGItkKKmcgbl

### Testing Database Connection

You can test the database connection using psql:

```bash
# Using psql command line tool
PGPASSWORD=pFKtmPEPqKeFYIeMDkvfSGItkKKmcgbl psql -h shortline.proxy.rlwy.net -U postgres -p 32455 -d railway

# Or using environment variable
export PGPASSWORD=pFKtmPEPqKeFYIeMDkvfSGItkKKmcgbl
psql -h shortline.proxy.rlwy.net -U postgres -p 32455 -d railway
```

### Database Schema

The database tables will be automatically created when you first run the backend server. The schema includes:
- `users` - User accounts and profiles
- `hazard_reports` - Hazard reports with both file and base64 image storage
- `report_comments` - Comments on reports
- `report_likes` - Like/dislike reactions on reports
- And other supporting tables

---

## Detailed Setup Instructions

### 1. Clone the Repository

```bash
git clone <repo-url>
cd SafeRoute
```

### 2. Backend Setup

1. Go to the backend directory:
	```bash
	cd backend
	```
2. Copy the example config and fill in your own values:
	```bash
	copy config.example.toml Config.toml
	# or manually create Config.toml based on config.example.toml
	```
3. **Database Configuration**: Update your `Config.toml` with the hosted database connection details:
	```toml
	[database]
	host = "shortline.proxy.rlwy.net"
	port = 32455
	database = "railway"
	user = "postgres"
	password = "pFKtmPEPqKeFYIeMDkvfSGItkKKmcgbl"
	```
	
	**Note**: The database is already hosted and configured. You don't need to set up a local database.

4. Make sure you have Ballerina installed. See: https://ballerina.io/downloads/
5. Start the backend server:
	```bash
	bal run
	```

### 3. Frontend Setup

1. Go to the frontend directory:
	```bash
	cd ../frontend
	```
2. Install dependencies:
	```bash
	npm install
	# or yarn install / pnpm install / bun install
	```
3. Copy the example env file and fill in your own values:
	```bash
	copy .env.example .env
	# or manually create .env based on .env.example
	```
4. Start the frontend development server:
	```bash
	npm run dev
	# or yarn dev / pnpm dev / bun dev
	```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Secret Configuration & API Keys

**Do not commit real API keys, secrets, or credentials to the repository.**

- For the backend, copy `backend/config.example.toml` to `backend/Config.toml` and fill in your own values. Do not commit your filled `Config.toml`.
- For the frontend, copy `frontend/.env.example` to `frontend/.env` and fill in your own values. Do not commit your filled `.env` file.

### Required Configuration Files

#### Backend Config.toml
Your `backend/Config.toml` should include:
```toml
[database]
host = "shortline.proxy.rlwy.net"
port = 32455
database = "railway"
user = "postgres"
password = "pFKtmPEPqKeFYIeMDkvfSGItkKKmcgbl"

[server]
port = 8080

[email]
# Add your email service configuration here if needed
```

#### Frontend .env
Your `frontend/.env` should include:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
# Add other environment variables as needed
```

### How to Obtain API Keys

- For services like Google Maps, follow the official documentation to obtain your API key: https://developers.google.com/maps/documentation/javascript/get-api-key
- For email or database credentials, use your own secure credentials or those provided by your deployment environment.

**Never share your real secrets in public repositories.**

---

## Troubleshooting

### Database Connection Issues
1. **Connection timeout**: Ensure your network allows connections to port 32455
2. **Authentication failed**: Double-check the password in your Config.toml
3. **Database not found**: Verify you're connecting to the "railway" database

### Backend Issues
1. **Port already in use**: Change the port in Config.toml or stop other services using port 8080
2. **Ballerina not found**: Make sure Ballerina is installed and in your PATH

### Frontend Issues
1. **API connection failed**: Ensure the backend is running on port 8080
2. **Environment variables**: Check that your .env file exists and has the correct values

---

## Features

- **Hazard Reporting**: Report road hazards with images (supports both file upload and base64 storage)
- **User Authentication**: Secure user registration and login
- **Real-time Updates**: Live hazard report updates
- **Image Storage**: Dual image storage system supporting files and base64 encoding
- **Location Services**: GPS-based location tracking and mapping
- **Comments & Reactions**: Interactive features for community engagement