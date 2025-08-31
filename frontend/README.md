
# SafeRoute Frontend

This is the frontend for the SafeRoute application, built with [Next.js](https://nextjs.org).

## Prerequisites

- Node.js (v18 or later recommended)
- npm, yarn, pnpm, or bun
- The SafeRoute backend running (see project root `README.md` for backend setup)

## Setup Instructions

1. **Clone the repository** (if you haven't already):
	```bash
	git clone <repo-url>
	cd SafeRoute/frontend
	```

2. **Install dependencies:**
	```bash
	npm install
	# or
	yarn install
	# or
	pnpm install
	# or
	bun install
	```

3. **Configure environment variables:**
	- Copy `.env.example` to `.env`:
	  ```bash
	  cp .env.example .env
	  ```
	- Fill in the required values in `.env` (e.g., your Google Maps API key).

4. **Start the development server:**
	```bash
	npm run dev
	# or
	yarn dev
	# or
	pnpm dev
	# or
	bun dev
	```

5. **Open the app:**
	- Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Notes

- The frontend expects the backend API to be running at the URL specified in your `.env` file (`NEXT_PUBLIC_API_URL`).
- For Google Maps and other integrations, obtain your own API keys and never commit them to the repository.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

## Deployment

You can deploy this app using [Vercel](https://vercel.com/) or your preferred hosting provider. See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
