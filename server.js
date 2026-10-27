import express from "express";

const app = express();

app.get("/api/hello", (req, res) => {
  res.json({ message: "hi, from the Jupiter" });
});

app.listen(3000, () => {
  console.log("server is running on port 3000");
});

export default app;
