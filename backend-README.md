# Capital Tracker API

The backend for **Congressional Capital Tracker** — a full-stack dashboard of U.S. Senate stock trades with live market prices. This Express server fetches data from the Financial Modeling Prep API, caches it in PostgreSQL, and serves it to the [frontend](https://capitaltracker-ruddy.vercel.app/).

> **Main project & write-up:** [frontend repo](https://github.com/gulgicheese/[frontend-repo]) · **Live demo:** [capitaltracker-ruddy.vercel.app](https://capitaltracker-ruddy.vercel.app/)

## What it does

- Holds the external API key server-side so it is never exposed to the browser.
- Caches responses in PostgreSQL and only re-fetches from the external API when data is stale (>60 min), to stay within free-tier rate limits.

## Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/trades` | Latest disclosed Senate trades (cached). |
| GET | `/api/prices?symbols=AAPL,NVDA` | Current price and day change for the given tickers (cached per symbol). |

## Tech Stack

- Node.js, Express
- PostgreSQL (hosted on Neon), via the `pg` library
- CORS, dotenv
- Deployed on Render

## How caching works

Each response is stored in an `api_cache` table with a `cached_at` timestamp. On each request the server checks the cache; if the entry is fresh it serves from PostgreSQL, otherwise it fetches from the external API, upserts the result (`ON CONFLICT`), and returns it. Cache age is computed in SQL (`EXTRACT(EPOCH FROM (NOW() - cached_at))`) to avoid cross-system timezone bugs. All writes use parameterized queries to prevent SQL injection.

## Running Locally

```bash
git clone https://github.com/gulgicheese/capital_tracker_api.git
cd capital_tracker_api
npm install

# create a .env file with:
#   FMP_KEY=your_fmp_key
#   DATABASE_URL=your_postgres_connection_string

npm start      # runs on http://localhost:3000
```

Get a free API key at [Financial Modeling Prep](https://site.financialmodelingprep.com); create a free PostgreSQL database at [Neon](https://neon.tech).

## Notes

- Hosted on a free tier that sleeps after inactivity — the first request after idle takes ~50 seconds (cold start), then responses are fast.
