const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../middleware/tenant.middleware");

const {
  create,
  getProduct,
  getMine,
  updateMine,
  deleteMine,
  getAdminReviews,
  getAdminReview,
  moderate,
} = require("./review.controller");

const router = express.Router();

router.use(
  authenticate,
  requireTenant
);

/*
 * Customer review routes
 */

router.post(
  "/",
  authorizeRoles("CUSTOMER"),
  create
);

router.get(
  "/product/:productId",
  authorizeRoles("CUSTOMER"),
  getProduct
);

router.get(
  "/my-reviews",
  authorizeRoles("CUSTOMER"),
  getMine
);

router.patch(
  "/:id",
  authorizeRoles("CUSTOMER"),
  updateMine
);

router.delete(
  "/:id",
  authorizeRoles("CUSTOMER"),
  deleteMine
);

/*
 * Tenant admin/staff moderation routes
 */

router.get(
  "/admin",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getAdminReviews
);

router.get(
  "/admin/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getAdminReview
);

router.patch(
  "/admin/:id/moderate",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  moderate
);

module.exports = router;