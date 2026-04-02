const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      "SELECT id, full_name, email, role, created_at FROM users WHERE id = $1",
      [req.user.userId]
    );

    return res.json(result.rows[0]);
  })
);

router.get(
  "/",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      "SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC"
    );

    return res.json(result.rows);
  })
);

module.exports = router;
