# SafeRoute

SafeRoute is a web application for safe route planning, featuring a Ballerina backend and a Next.js frontend.

---

## Setup Instructions

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
3. Make sure you have Ballerina installed. See: https://ballerina.io/downloads/
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

**Do not commit real API keys, secrets, or credentials to the repository.**

- For the backend, copy `backend/config.example.toml` to `backend/Config.toml` and fill in your own values. Do not commit your filled `Config.toml`.
- For the frontend, copy `frontend/.env.example` to `frontend/.env` and fill in your own values. Do not commit your filled `.env` file.

### How to Obtain API Keys

- For services like Google Maps, follow the official documentation to obtain your API key: https://developers.google.com/maps/documentation/javascript/get-api-key
- For email or database credentials, use your own secure credentials or those provided by your deployment environment.

**Never share your real secrets in public repositories.**