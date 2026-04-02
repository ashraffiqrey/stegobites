const express = require("express");
const multer = require("multer");
const pool = require("../config/db");
const cloudinary = require("../config/cloudinary");
const env = require("../config/env");
const { authenticate, authorize } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  }
});

const uploadToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "stegobites/listings",
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result.secure_url);
      }
    );

    stream.end(fileBuffer);
  });

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { location, lat, lng } = req.query;

    const params = [];
    let where = "WHERE l.is_active = true AND l.quantity > 0";
    let distanceSelect = "";
    let orderBy = "ORDER BY l.created_at DESC";
    let limitClause = "";

    const hasLat = lat !== undefined;
    const hasLng = lng !== undefined;

    if (hasLat !== hasLng) {
      return res.status(400).json({ message: "lat and lng must be provided together" });
    }

    if (hasLat && hasLng) {
      const parsedLat = Number(lat);
      const parsedLng = Number(lng);

      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        return res.status(400).json({ message: "lat and lng must be valid numbers" });
      }

      params.push(parsedLat, parsedLng);
      distanceSelect = `,
        CASE
          WHEN v.latitude IS NOT NULL AND v.longitude IS NOT NULL THEN
            6371 * 2 * ASIN(
              SQRT(
                POWER(SIN(RADIANS(v.latitude - $1) / 2), 2) +
                COS(RADIANS($1)) * COS(RADIANS(v.latitude)) *
                POWER(SIN(RADIANS(v.longitude - $2) / 2), 2)
              )
            )
          ELSE NULL
        END AS distance_km`;
      orderBy = "ORDER BY CASE WHEN distance_km IS NULL THEN 1 ELSE 0 END, distance_km ASC, l.created_at DESC";
      limitClause = "LIMIT 20";
    }

    if (location) {
      params.push(`%${location}%`);
      where += ` AND v.location ILIKE $${params.length}`;
    }

    const result = await pool.query(
      `SELECT l.*, v.business_name, v.location, v.latitude, v.longitude${distanceSelect}
       FROM listings l
       JOIN vendors v ON v.id = l.vendor_id
       ${where}
       ${orderBy}
       ${limitClause}`,
      params
    );

    return res.json(result.rows);
  })
);

router.get(
  "/vendor/me",
  authenticate,
  authorize("vendor"),
  asyncHandler(async (req, res) => {
    const vendorResult = await pool.query("SELECT id FROM vendors WHERE user_id = $1", [
      req.user.userId
    ]);

    if (vendorResult.rows.length === 0) {
      return res.status(400).json({ message: "Vendor profile not found" });
    }

    const result = await pool.query(
      `SELECT l.*, v.business_name, v.location, v.latitude, v.longitude
       FROM listings l
       JOIN vendors v ON v.id = l.vendor_id
       WHERE l.vendor_id = $1
       ORDER BY l.created_at DESC`,
      [vendorResult.rows[0].id]
    );

    return res.json(result.rows);
  })
);

router.get(
  "/:listingId",
  asyncHandler(async (req, res) => {
    const { listingId } = req.params;

    const result = await pool.query(
      `SELECT l.*, v.business_name, v.location, v.latitude, v.longitude, v.description AS vendor_description
       FROM listings l
       JOIN vendors v ON v.id = l.vendor_id
       WHERE l.id = $1`,
      [listingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    return res.json(result.rows[0]);
  })
);

router.post(
  "/",
  authenticate,
  authorize("vendor"),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const {
      title,
      description,
      originalPrice,
      discountedPrice,
      quantity,
      pickupStart,
      pickupEnd
    } = req.body;

    if (!title || !originalPrice || !discountedPrice || !quantity || !pickupStart || !pickupEnd) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let imageUrl = null;

    if (req.file) {
      if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
        return res.status(500).json({
          message: "Cloudinary is not configured on server"
        });
      }

      imageUrl = await uploadToCloudinary(req.file.buffer);
    }

    const vendorResult = await pool.query(
      "SELECT id, is_approved FROM vendors WHERE user_id = $1",
      [req.user.userId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(400).json({ message: "Vendor profile not found" });
    }

    const vendor = vendorResult.rows[0];
    if (!vendor.is_approved) {
      return res.status(403).json({ message: "Vendor is not approved yet" });
    }

    const result = await pool.query(
      `INSERT INTO listings (
         vendor_id, title, description, image_url, original_price, discounted_price,
         quantity, pickup_start, pickup_end, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING *`,
      [
        vendor.id,
        title,
        description || null,
        imageUrl,
        Number(originalPrice),
        Number(discountedPrice),
        Number(quantity),
        pickupStart,
        pickupEnd
      ]
    );

    return res.status(201).json(result.rows[0]);
  })
);

router.patch(
  "/:listingId/sold-out",
  authenticate,
  authorize("vendor"),
  asyncHandler(async (req, res) => {
    const { listingId } = req.params;

    const vendorResult = await pool.query(
      "SELECT id FROM vendors WHERE user_id = $1",
      [req.user.userId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(400).json({ message: "Vendor profile not found" });
    }

    const vendorId = vendorResult.rows[0].id;

    const result = await pool.query(
      `UPDATE listings
       SET quantity = 0, is_active = false, updated_at = NOW()
       WHERE id = $1 AND vendor_id = $2
       RETURNING *`,
      [listingId, vendorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    return res.json(result.rows[0]);
  })
);

module.exports = router;
