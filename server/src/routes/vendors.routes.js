const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

function parseCoordinatePair(latitude, longitude) {
  const hasLatitude = latitude !== undefined;
  const hasLongitude = longitude !== undefined;

  if (!hasLatitude && !hasLongitude) {
    return { latitude: undefined, longitude: undefined };
  }

  if (hasLatitude !== hasLongitude) {
    throw new Error("latitude and longitude must be provided together");
  }

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    throw new Error("latitude and longitude must be valid numbers");
  }

  if (parsedLatitude < -90 || parsedLatitude > 90) {
    throw new Error("latitude must be between -90 and 90");
  }

  if (parsedLongitude < -180 || parsedLongitude > 180) {
    throw new Error("longitude must be between -180 and 180");
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

router.post(
  "/register",
  authenticate,
  authorize("vendor"),
  asyncHandler(async (req, res) => {
    const { businessName, location, description, latitude, longitude } = req.body;

    if (!businessName || !location) {
      return res.status(400).json({ message: "businessName and location are required" });
    }

    let coordinates;

    try {
      coordinates = parseCoordinatePair(latitude, longitude);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const existing = await pool.query("SELECT id FROM vendors WHERE user_id = $1", [req.user.userId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Vendor profile already exists" });
    }

    const result = await pool.query(
      `INSERT INTO vendors (
         user_id,
         business_name,
         location,
         description,
         latitude,
         longitude,
         onboarding_completed,
         is_approved
       )
       VALUES ($1, $2, $3, $4, $5, $6, false, false)
       RETURNING *`,
      [
        req.user.userId,
        businessName,
        location,
        description || null,
        coordinates.latitude ?? null,
        coordinates.longitude ?? null
      ]
    );

    return res.status(201).json(result.rows[0]);
  })
);

router.get(
  "/me",
  authenticate,
  authorize("vendor"),
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM vendors WHERE user_id = $1", [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    return res.json(result.rows[0]);
  })
);

router.patch(
  "/me",
  authenticate,
  authorize("vendor"),
  asyncHandler(async (req, res) => {
    const { businessName, location, description, latitude, longitude, onboardingCompleted } = req.body;

    if (
      businessName === undefined &&
      location === undefined &&
      description === undefined &&
      latitude === undefined &&
      longitude === undefined &&
      onboardingCompleted === undefined
    ) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    if (location !== undefined && !String(location).trim()) {
      return res.status(400).json({ message: "location cannot be empty" });
    }

    let coordinates;

    try {
      coordinates = parseCoordinatePair(latitude, longitude);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const result = await pool.query(
      `UPDATE vendors
       SET business_name = COALESCE($1, business_name),
           location = COALESCE($2, location),
           description = COALESCE($3, description),
           latitude = COALESCE($4, latitude),
           longitude = COALESCE($5, longitude),
           onboarding_completed = COALESCE($6, onboarding_completed),
           updated_at = NOW()
       WHERE user_id = $7
       RETURNING *`,
      [
        businessName !== undefined ? String(businessName).trim() : null,
        location !== undefined ? String(location).trim() : null,
        description !== undefined ? description : null,
        coordinates.latitude !== undefined ? coordinates.latitude : null,
        coordinates.longitude !== undefined ? coordinates.longitude : null,
        onboardingCompleted !== undefined ? Boolean(onboardingCompleted) : null,
        req.user.userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    return res.json(result.rows[0]);
  })
);

router.get(
  "/pending",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT v.*, u.full_name, u.email
       FROM vendors v
       JOIN users u ON u.id = v.user_id
       WHERE v.is_approved = false
       ORDER BY v.created_at ASC`
    );

    return res.json(result.rows);
  })
);

router.get(
  "/",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT v.*, u.full_name, u.email
       FROM vendors v
       JOIN users u ON u.id = v.user_id
       ORDER BY v.created_at DESC`
    );

    return res.json(result.rows);
  })
);

const approveVendorHandler = asyncHandler(async (req, res) => {
  const { id, vendorId } = req.params;
  const targetVendorId = id || vendorId;

  const result = await pool.query(
    `UPDATE vendors
     SET is_approved = true, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [targetVendorId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Vendor not found" });
  }

  return res.json(result.rows[0]);
});

router.put("/:id/approve", authenticate, authorize("admin"), approveVendorHandler);

router.patch(
  "/:vendorId/approve",
  authenticate,
  authorize("admin"),
  approveVendorHandler
);

module.exports = router;
