# SwitchWise AI

## Built For Retail Investors

SwitchWise AI is built for everyday retail investors who want to make better mutual fund decisions but do not have the time, background, or confidence to study markets in depth. The product focuses on simplifying fund selection, portfolio review, and cost comparison so that users can understand what they own, where they may be losing money, and what actions are worth considering without needing to read long factsheets or manually compare multiple schemes.

## Problem And Solution

Many investors stay away from mutual funds or make poor choices because the market feels complicated, risky, and time-consuming. They may not understand the difference between Direct and Regular plans, how expense ratios affect long-term returns, or whether a fund matches their goal and risk profile. SwitchWise AI solves this by combining structured financial calculations with an AI-assisted explanation layer. The backend analyzes holdings, compares Regular and Direct fund variants, estimates long-term cost drag, reviews allocation, and then presents the results in plain language through portfolio insights and an AI copilot. The goal is not to replace financial advice, but to make the first level of decision-making clearer, faster, and less intimidating.

## Install And Run From GitHub

Follow these steps after cloning the repository on a new machine.

### 1. Prerequisites

Install the following before running the project:

- Node.js 18 or higher.
- Git.
- MongoDB running locally, or a MongoDB Atlas connection string.

### 2. Clone The Repository

```bash
git clone <your-github-repository-url>
cd "SwitchWise AI"
```

### 3. Install Dependencies

From the project root, install both backend and frontend dependencies:

```bash
npm run install:all
```

If you prefer installing manually:

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 4. Configure Backend Environment

Create a `.env` file inside the `backend` folder:

```bash
cd backend
copy .env.template .env
```

On macOS or Linux, use:

```bash
cp .env.template .env
```

Update the values in `backend/.env`:

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/switchwise
JWT_SECRET=your_long_random_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_ORIGIN=http://localhost:5173
BACKEND_URL=http://localhost:4000
NODE_ENV=development
```

Google OAuth is optional for local testing. Email/password login works as long as MongoDB and `JWT_SECRET` are configured.

### 5. Run The Application

From the project root:

```bash
npm run dev
```

This starts both servers:

- Backend API: `http://localhost:4000`
- Frontend app: `http://localhost:5173`

### 6. Optional: Ingest AMFI Fund Data

If the database is empty and you want real NAV data, run the AMFI ingestion script from the backend folder:

```bash
cd backend
node src/scripts/ingestAmfi.js
```

After this, fund search and portfolio calculations can use AMFI-enriched NAV data where available.

### 7. Health Check

Open this endpoint to verify that the backend is running:

```txt
http://localhost:4000/api/health
```

## Data Flow

The flow below shows how user actions move through the application, how the backend separates responsibilities, and where external data or AI services are used.

![alt text](<Screenshot 2026-05-09 003200.png>)
![alt text](<Screenshot 2026-05-09 003234.png>)

## What Comes Next

If there was another month to work on SwitchWise AI, the first priority would be a stronger production-grade fund data pipeline. That means scheduled AMFI sync, historical NAV ingestion, official factsheet ingestion, rolling returns, drawdown, alpha, benchmark comparison, and cleaner mapping between fund variants. This comes first because the quality of recommendations depends directly on the quality and freshness of the financial data.

## Next Product Improvements

After improving the data pipeline, the next focus would be deeper personalization: risk profiling, goal-based portfolio suggestions, tax and exit-load awareness, SIP planning, and alerts when a fund becomes expensive or drifts from the user's goal. The AI copilot could then become more context-aware, helping users compare actions instead of only reading analysis. Finally, the platform could add broker/CAS import support so users do not have to manually enter holdings.

