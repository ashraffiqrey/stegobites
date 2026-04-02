const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ message: "ReMeal API is running" });
});

app.use("/api", apiRoutes);

// Centralized error handler to avoid duplicating try/catch response logic.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error"
  });
});

module.exports = app;
