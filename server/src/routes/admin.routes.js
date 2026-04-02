const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get(
  "/stats",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const totalsResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_orders,
         COUNT(*) FILTER (WHERE status = 'picked_up')::int AS completed_orders
       FROM orders`
    );

    const totals = totalsResult.rows[0] || { total_orders: 0, completed_orders: 0 };
    const completedOrders = Number(totals.completed_orders || 0);

    const breakdownResult = await pool.query(
      `SELECT
         v.id AS vendor_id,
         v.business_name,
         COUNT(o.id)::int AS completed_orders,
         (COUNT(o.id) * 2)::int AS estimated_commission
       FROM vendors v
       LEFT JOIN listings l ON l.vendor_id = v.id
       LEFT JOIN orders o ON o.listing_id = l.id AND o.status = 'picked_up'
       GROUP BY v.id, v.business_name
       ORDER BY estimated_commission DESC, v.business_name ASC`
    );

    return res.json({
      total_orders: Number(totals.total_orders || 0),
      completed_orders: completedOrders,
      revenue: completedOrders * 2,
      breakdown: breakdownResult.rows
    });
  })
);

module.exports = router;
