const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../../middleware/auth.middleware");

const { requireTenant } = require("../../../middleware/tenant.middleware");

const {
  getCurrentTenant,
  updateCurrentTenant,
} = require("../controllers/tenant.controller");

const router = express.Router();

router.use(authenticate, requireTenant);

router.get(
  "/me",
  authorizeRoles("TENANT_OWNER", "STAFF", "CUSTOMER"),
  getCurrentTenant
);

router.patch(
  "/me",
  authorizeRoles("TENANT_OWNER", "STAFF"),
  updateCurrentTenant
);

module.exports = router;
