# SafeRoute

SafeRoute is a web application for safe route planning and hazard reporting, featuring a Ballerina backend and a Next.js frontend with integrated database hosting.

## Quick Start

### Prerequisites
- [Ballerina](https://ballerina.io/downloads/) (for backend)
- [Next.js](https://nextjs.org/)  (for frontend)
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

**For RDA Dashboard Access**: See the [RDA Dashboard Access](#rda-dashboard-access) section below for registration details.

## Table of Contents

- [Quick Start](#quick-start)
- [Database Configuration](#database-configuration)
- [RDA Dashboard Access](#rda-dashboard-access)
- [Detailed Setup Instructions](#detailed-setup-instructions)
- [Secret Configuration & API Keys](#secret-configuration--api-keys)
- [Features](#features)
- [Planned Features](#planned-features)
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

## RDA Dashboard Access

The SafeRoute application includes an RDA (Road Development Authority) dashboard for managing and reviewing hazard reports. Here's how to access it:

### For New RDA Users

If you're setting up RDA access for the first time, you can register using these pre-configured credentials:

#### Registration Details
- **First Name**: RDA
- **Last Name**: SriLanka
- **Email**: rdasrilanka0@gmail.com
- **Password**: Rdasrilanka0
- **User Role**: RDA (select this during registration)

#### Steps to Register
1. Start the SafeRoute application (follow Quick Start above)
2. Open [http://localhost:3000](http://localhost:3000)
3. Click "Sign Up" or "Register"
4. Fill in the registration form with the details above
5. **Important**: Select "RDA" as the user role during registration
6. Complete the email verification process

#### Email Verification
The system will send a verification email to rdasrilanka0@gmail.com. To access this email:

**Gmail Account Credentials:**
- **Email**: rdasrilanka0@gmail.com
- **Password**: Rdasrilanka1@

**To verify your RDA account:**
1. Go to [gmail.com](https://gmail.com)
2. Log in with the credentials above
3. Look for the verification email from SafeRoute
4. Click the verification link in the email
5. Your RDA account will be activated

**Important Note**: All RDA users must register with:
- **First Name**: RDA
- **Last Name**: SriLanka
- 
### For Existing RDA Users

If you already have RDA credentials:
- **Email**: rdasrilanka0@gmail.com
- **Password**: Rdasrilanka0

### RDA Dashboard Features

Once logged in as an RDA user, you'll have access to:
- **Hazard Report Management**: View, approve, and resolve reported hazards
- **User Management**: View user profiles and activity
- **Analytics Dashboard**: Statistics and reports on hazard data

### Access Levels

The application has different user roles:
- **General Users**: Can report hazards and view reports
- **RDA Users**: Administrative access to manage reports and users

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

4. Start the backend server:
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
- For the backend, copy `backend/config.example.toml` to `backend/Config.toml` and fill the values. 
- For the frontend, copy `frontend/.env.example` to `frontend/.env` and fill the values.

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
---

## Features

- **Hazard Reporting**: Report road hazards with images (supports both file upload and base64 storage), including rural road damages.  
- **User Authentication**: Secure user registration and login with role-based access.  
- **Password Recovery with Email Verification**: Allows users to reset forgotten passwords securely through a verification code sent to their registered email.  
- **User Report History**: Users can view and manage the reports they have previously submitted.  
- **User Profile Management**: Users can update their profile information, including usernames and profile pictures.  

- **Nearby Hazards**: Displays all hazard reports within a 25 km radius of the user’s current location  
- **Route Hazard Insights**: When selecting two destinations, users can see all reported hazards along the road.
- **Safest Route Suggestions**
- **Hazard Types & Sensitivity Levels**: Maintains different hazard categories (e.g., potholes, construction, natural disasters) with sensitivity/priority levels.  
- **Report Accuracy Validation**: Includes comments and reactions on hazard reports to verify accuracy and credibility.  
- **Report Management for Users**: Users can delete their own submitted reports.
- **Temporary Reports**: Traffic and accident reports will automatically be deleted after 24 hours to ensure real-time accuracy 
- **RDA Dashboard**: Administrative interface for Road Development Authority users  
  - Filter reports by **city, hazard type, and sensitivity level**  
  - Mark pothole and construction reports as resolved  
  - Manage hazard reports and approvals  
  - Ability to view reported user details such as email, username, and phone number
  - Administrative tools and system oversight  
- **Real-time Updates**: Live hazard report updates with instant notifications.  
- **Image Storage**: Dual image storage system supporting files and base64 encoding.  
- **Location Services**: GPS-based location tracking and mapping.  
- **Comments & Reactions**: Interactive features for community engagement and validating report accuracy.  
- **Role-based Access**: Different permission levels for general users and RDA authorities.  


## Planned Features

- **Historical Hazard Analysis**: The system will track and analyze hazard reports over time to identify:
 - Recurring accident patterns at specific locations
 - High-risk areas based on incident frequency and severity
 - Seasonal or temporal hazard trends

### Intelligent Safety Alert System
- **Proximity-Based Audio Warnings**: When users approach dangerous areas, the system will:
 - Automatically detect when a user is within 200 meters of a high-risk location
 - Trigger audio alerts for areas with multiple high-sensitivity incidents
 - Play voice recordings such as: *"Dangerous area 200 meters ahead - multiple accidents reported at this location"*

- **Smart Alert Criteria**:
 - Activates when 2 or more accidents with high sensitivity ratings occur at the same location
 - Considers incidents across different dates to identify persistent hazard zones
 - Customizable sensitivity thresholds for different types of hazards

### Expanded Hazard Categories
- We are planning to add more categories for reporting, such as:
  - Broken traffic lights  
  - Faded road markings  
  - Damaged signboards  
  - Missing or damaged guardrails  
  - Other infrastructure-related hazards
 
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

### RDA Dashboard Issues
1. **Cannot access RDA features**: Ensure you registered with "RDA" user role
2. **Email verification pending**: Check rdasrilanka0@gmail.com for verification email
3. **Login failed**: Use the exact credentials provided above (case-sensitive)
4. **Gmail access issues**: Try the password "Rdasrilanka1@" for gmail access
5. **Role not showing**: Contact administrator to verify RDA role assignment
