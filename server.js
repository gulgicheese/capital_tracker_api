import express from "express";
import "dotenv/config";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/api/hello", (req, res) => {
  res.json({ message: "hi, from the Jupiter" });
});

app.get("/api/trades", async (req, res) => {
  try {
    const key = process.env.FMP_KEY;
    const response = await fetch(
      `https://financialmodelingprep.com/stable/senate-latest?apikey=${key}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching trade data:", error);
    res.status(500).json({ error: "Failed to fetch trade data" });
  }
});

app.listen(3000, () => {
  console.log("server is running on port 3000");
});

export default app;
