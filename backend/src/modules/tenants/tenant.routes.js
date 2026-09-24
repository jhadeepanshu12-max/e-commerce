const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../middleware/tenant.middleware");

const {
  getCurrentTenant,
} = require("./controllers/tenant.controller");

const router = express.Router();

router.get(
  "/me",
  authenticate,
  requireTenant,
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF",
    "CUSTOMER"
  ),
  getCurrentTenant
);

module.exports = router;