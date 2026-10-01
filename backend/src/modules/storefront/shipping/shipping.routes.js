const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../middleware/tenant.middleware");

const {
  createZone,
  getZones,
  getZone,
  updateZone,
  deleteZone,

  createRate,
  getRates,
  updateRate,
  deleteRate,

  calculate,
} = require("./shipping.controller");

const router = express.Router();

router.use(
  authenticate,
  requireTenant
);

/*
 * Shipping calculation
 *
 * Customer can calculate available
 * shipping methods for their address.
 */

router.post(
  "/calculate",
  authorizeRoles("CUSTOMER"),
  calculate
);

/*
 * Shipping zone management
 */

router.post(
  "/zones",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  createZone
);

router.get(
  "/zones",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getZones
);

router.get(
  "/zones/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getZone
);

router.patch(
  "/zones/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  updateZone
);

router.delete(
  "/zones/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  deleteZone
);

/*
 * Shipping rate management
 */

router.post(
  "/zones/:zoneId/rates",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  createRate
);

router.get(
  "/zones/:zoneId/rates",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getRates
);

router.patch(
  "/rates/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  updateRate
);

router.delete(
  "/rates/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  deleteRate
);

module.exports = router;