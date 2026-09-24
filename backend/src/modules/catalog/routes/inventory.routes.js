const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../../middleware/tenant.middleware");

const {
  adjustInventory,
  getInventoryHistory,
  getProductInventory,
} = require("../controllers/inventory.controller");

const router = express.Router();

router.use(
  authenticate,
  requireTenant
);

router.post(
  "/adjust",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  adjustInventory
);

router.get(
  "/history",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getInventoryHistory
);

router.get(
  "/product/:productId",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getProductInventory
);

module.exports = router;