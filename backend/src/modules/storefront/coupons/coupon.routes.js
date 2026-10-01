const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../middleware/tenant.middleware");

const {
  createCoupon,
  getCoupons,
  updateCoupon,
  deactivateCoupon,
} = require("./coupon.controller");

const router = express.Router();

router.use(
  authenticate,
  requireTenant,
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  )
);

router.post("/", createCoupon);

router.get("/", getCoupons);

router.patch("/:id", updateCoupon);

router.patch(
  "/:id/deactivate",
  deactivateCoupon
);

module.exports = router;