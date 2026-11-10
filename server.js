import express from "express";
import "dotenv/config";
import cors from "cors";
import pg from "pg";

// connecting Neon DB
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// testing api setup with hello statement
const app = express();
app.use(cors());

app.get("/api/hello", (req, res) => {
  res.json({ message: "hi, from the Jupiter" });
});

// setting up /api/trades route that taking encapsulated api key from .env
app.get("/api/trades", async (req, res) => {
  try {
    // look for cached trades from DB
    const cached = await pool.query(
      "SELECT data, EXTRACT(EPOCH FROM (NOW() - cached_at))/ 60 AS age_minutes FROM api_cache WHERE cache_key = $1",
      ["senate-trades"],
    );

    // taking the cache copy directly if it's less than 60 mins old
    if (cached.rows.length > 0 && Number(cached.rows[0].age_minutes) < 60) {
      console.log("Serving trades from CACHE");
      return res.json(cached.rows[0].data);
    }

    // otherwise, fetch fresh from FMP
    console.log("Fetching trades FRESH from FMP");
    const key = process.env.FMP_KEY;
    const response = await fetch(
      `https://financialmodelingprep.com/stable/senate-latest?apikey=${key}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // save or update the cache, then return the fresh data
    await pool.query(
      `INSERT INTO api_cache (cache_key, data, cached_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET data = $2, cached_at = NOW()`,
      ["senate-trades", JSON.stringify(data)],
    );

    res.json(data);
  } catch (error) {
    console.error("Error fetching trade data:", error);
    res.status(500).json({ error: "Failed to fetch trade data" });
  }
});

// second route for prices endpoint
app.get("/api/prices", async (req, res) => {
  try {
    // read symbols from the query parameters
    const symbolsParam = req.query.symbols;
    // return an empty object if no symbols are provided
    if (!symbolsParam) return res.json({});
    const symbols = symbolsParam.split(",");

    const key = process.env.FMP_KEY;
    const results = {};

    // for each symbol, fetch the price data from FMP and store it in the results object
    for (const symbol of symbols) {
      // unique cache key for each symbol
      const cached = await pool.query(
        "SELECT data, EXTRACT(EPOCH FROM (NOW() - cached_at))/ 60 AS age_minutes FROM api_cache WHERE cache_key = $1",
        [`price-${symbol}`],
      );

      // if cached data is less than 60 mins old, use it
      if (cached.rows.length > 0 && Number(cached.rows[0].age_minutes) < 60) {
        console.log(`Serving price for ${symbol} from CACHE`);
        results[symbol] = cached.rows[0].data;
        continue;
      }

      // otherwise, fetch fresh data from FMP
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/stable/quote-short?symbol=${symbol}&apikey=${key}`,
        );
        if (!response.ok) continue;
        const json = await response.json();
        if (json[0]) {
          const priceData = { price: json[0].price, change: json[0].change };
          results[symbol] = priceData;

          // save or update the cache for this symbol
          await pool.query(
            `INSERT INTO api_cache (cache_key, data, cached_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (cache_key) DO UPDATE SET data = $2, cached_at = NOW()`,
            [`price-${symbol}`, JSON.stringify(priceData)],
          );
        }
      } catch (error) {
        console.error(`Error fetching price data for ${symbol}:`, error);
      }
    }
    // return the results object containing price data for all requested symbols
    res.json(results);
  } catch (error) {
    console.error("Error fetching price data:", error);
    res.status(500).json({ error: "Failed to fetch price data" });
  }
});

// app.listen(3000, () => {
// console.log("server is running on port 3000");
// });

// briding local backend for frontend to access, otherwise fall back to port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
