const express = require("express");

const {
  authenticate,
} = require("../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../middleware/tenant.middleware");

const {
  authorizeRoles,
} = require("../../middleware/role.middleware");

const {
  createTaxRule,
  getTaxRules,
  getTaxRule,
  updateTaxRule,
  deleteTaxRule,
  calculateTax,
} = require("./tax.controller");

const router = express.Router();

router.use(
  authenticate,
  requireTenant
);

router.post(
  "/",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  createTaxRule
);

router.get(
  "/",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getTaxRules
);

router.get(
  "/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getTaxRule
);

router.patch(
  "/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  updateTaxRule
);

router.delete(
  "/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  deleteTaxRule
);

router.post(
  "/calculate",
  authorizeRoles("CUSTOMER"),
  calculateTax
);

module.exports = router;