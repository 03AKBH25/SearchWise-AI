# SwitchWise AI

A working prototype for an Indian mutual fund decision co-pilot. It reviews an existing holding, compares Regular vs Direct variants, recommends new Direct-plan fund candidates, and explains tradeoffs through an in-product co-pilot chat.

## What It Does

- Captures investor goal, horizon, current fund, plan type, current value, monthly investment and risk comfort.
- Searches a curated mutual fund catalog with Direct and Regular variants.
- Fetches NAV from the public AMFI NAV feed when reachable.
- Suggests new fund candidates ranked by goal fit, risk comfort, horizon and Direct-plan cost.
- Uses prototype factsheet-style metadata for expense ratio, exposure, risk and tracking-error inputs.
- Models long-term Regular-to-Direct switch savings and risk-adjusted return deltas.
- Provides a local co-pilot chat for "why this?", "suggest new funds", tax/exit-load checks and risk explanation.
- Presents a product-ready React UI with light and dark themes.
- Exposes an Express API with optional MongoDB snapshot persistence.

## API Surface

- `GET /api/funds/search?q=hdfc`
- `POST /api/funds/recommend`
- `POST /api/advice`
- `POST /api/copilot/chat`

## Run Locally

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:4000

## Environment

Copy `backend/.env.example` to `backend/.env` if you want to configure MongoDB.

```bash
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/switchwise
AMFI_NAV_URL=https://www.amfiindia.com/spages/NAVAll.txt
```

MongoDB is optional for the prototype. If it is unavailable, the API continues in public-data mode.

## Prototype Boundary

This is an investor decision-support prototype, not personalized financial advice. NAV can be fetched from AMFI, while expense ratios, exposure, risk and tracking-error values are included as prototype metadata that should be replaced with production-grade factsheet ingestion before real investor use.
