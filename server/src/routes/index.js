const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./users.routes");
const vendorRoutes = require("./vendors.routes");
const listingRoutes = require("./listings.routes");
const orderRoutes = require("./orders.routes");
const adminRoutes = require("./admin.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/vendors", vendorRoutes);
router.use("/listings", listingRoutes);
router.use("/orders", orderRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
