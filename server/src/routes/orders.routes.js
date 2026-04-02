const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("customer"),
  asyncHandler(async (req, res) => {
    const { listingId, quantity = 1 } = req.body;

    if (!listingId) {
      return res.status(400).json({ message: "listingId is required" });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Lock listing row to avoid race conditions when multiple users reserve at once.
      const listingResult = await client.query(
        "SELECT id, discounted_price, quantity, is_active FROM listings WHERE id = $1 FOR UPDATE",
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Listing not found" });
      }

      const listing = listingResult.rows[0];
      if (!listing.is_active || listing.quantity < quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Insufficient listing quantity" });
      }

      const totalPrice = Number(listing.discounted_price) * Number(quantity);

      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, listing_id, quantity, total_price, status)
         VALUES ($1, $2, $3, $4, 'reserved')
         RETURNING *`,
        [req.user.userId, listingId, quantity, totalPrice]
      );

      await client.query(
        `UPDATE listings
         SET quantity = quantity - $1,
             is_active = CASE WHEN quantity - $1 > 0 THEN true ELSE false END,
             updated_at = NOW()
         WHERE id = $2`,
        [quantity, listingId]
      );

      await client.query("COMMIT");
      return res.status(201).json(orderResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

router.get(
  "/my",
  authenticate,
  authorize("customer"),
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT o.*, l.title, l.pickup_start, l.pickup_end, v.business_name
       FROM orders o
       JOIN listings l ON l.id = o.listing_id
       JOIN vendors v ON v.id = l.vendor_id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.userId]
    );

    return res.json(result.rows);
  })
);

router.get(
  "/vendor",
  authenticate,
  authorize("vendor"),
  asyncHandler(async (req, res) => {
    const vendorResult = await pool.query(
      "SELECT id FROM vendors WHERE user_id = $1",
      [req.user.userId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(400).json({ message: "Vendor profile not found" });
    }

    const result = await pool.query(
      `SELECT o.*, l.title, u.full_name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN listings l ON l.id = o.listing_id
       JOIN users u ON u.id = o.customer_id
       WHERE l.vendor_id = $1
       ORDER BY o.created_at DESC`,
      [vendorResult.rows[0].id]
    );

    return res.json(result.rows);
  })
);

router.put(
  "/:id/status",
  authenticate,
  authorize("vendor"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== "picked_up") {
      return res.status(400).json({ message: "Only status 'picked_up' is supported" });
    }

    const vendorResult = await pool.query("SELECT id FROM vendors WHERE user_id = $1", [
      req.user.userId
    ]);

    if (vendorResult.rows.length === 0) {
      return res.status(400).json({ message: "Vendor profile not found" });
    }

    const vendorId = vendorResult.rows[0].id;

    const orderResult = await pool.query(
      `SELECT o.id, o.status
       FROM orders o
       JOIN listings l ON l.id = o.listing_id
       WHERE o.id = $1 AND l.vendor_id = $2`,
      [id, vendorId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (orderResult.rows[0].status !== "reserved") {
      return res.status(400).json({ message: "Only reserved orders can be marked as picked up" });
    }

    const updated = await pool.query(
      `UPDATE orders
       SET status = 'picked_up', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return res.json(updated.rows[0]);
  })
);

module.exports = router;
