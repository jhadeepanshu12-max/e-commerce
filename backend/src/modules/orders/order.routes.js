const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../middleware/tenant.middleware");

const {
  checkout,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
} = require("./order.controller");

const router = express.Router();

router.use(
  authenticate,
  requireTenant
);

/*
 * Customer routes
 */

router.post(
  "/checkout",
  authorizeRoles("CUSTOMER"),
  checkout
);

router.get(
  "/my-orders",
  authorizeRoles("CUSTOMER"),
  getMyOrders
);

router.get(
  "/my-orders/:id",
  authorizeRoles("CUSTOMER"),
  getMyOrderById
);

router.patch(
  "/my-orders/:id/cancel",
  authorizeRoles("CUSTOMER"),
  cancelMyOrder
);

/*
 * Tenant admin/staff routes
 */

router.get(
  "/admin",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getAdminOrders
);

router.get(
  "/admin/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getAdminOrderById
);

router.patch(
  "/admin/:id/status",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  updateAdminOrderStatus
);

module.exports = router;