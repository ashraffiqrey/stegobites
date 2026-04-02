const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const env = require("../config/env");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { fullName, email, password, role = "customer" } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email and password are required" });
    }

    if (!["customer", "vendor", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role, created_at`,
      [fullName, email, passwordHash, role]
    );

    const user = result.rows[0];

    let vendorProfile = null;
    if (user.role === "vendor") {
      const vendorResult = await pool.query(
        "SELECT onboarding_completed, is_approved FROM vendors WHERE user_id = $1",
        [user.id]
      );
      vendorProfile = vendorResult.rows[0] || null;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn
    });

    return res.status(201).json({
      user: {
        ...user,
        onboardingCompleted: user.role === "vendor" ? Boolean(vendorProfile?.onboarding_completed) : true,
        isApproved: user.role === "vendor" ? Boolean(vendorProfile?.is_approved) : false
      },
      token
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const result = await pool.query(
      "SELECT id, full_name, email, role, password_hash FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    let vendorProfile = null;
    if (user.role === "vendor") {
      const vendorResult = await pool.query(
        "SELECT onboarding_completed, is_approved FROM vendors WHERE user_id = $1",
        [user.id]
      );
      vendorProfile = vendorResult.rows[0] || null;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn
    });

    return res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.role === "vendor" ? Boolean(vendorProfile?.onboarding_completed) : true,
        isApproved: user.role === "vendor" ? Boolean(vendorProfile?.is_approved) : false
      },
      token
    });
  })
);

module.exports = router;
