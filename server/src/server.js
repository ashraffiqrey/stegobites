const app = require("./app");
const env = require("./config/env");
const pool = require("./config/db");

const start = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("Database connected");

    app.listen(env.port, () => {
      console.log(`Server listening on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

start();
