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
  processing,
  paid,
  failed,
  getMyPayment,
  getMyPayments,
  getAdminPayment,
  getAdminPayments,
} = require("./payment.controller");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Customer Payment Routes
|--------------------------------------------------------------------------
*/

router.use(
  authenticate,
  requireTenant
);

router.post(
  "/",
  authorizeRoles("CUSTOMER"),
  create
);

router.get(
  "/my-payments",
  authorizeRoles("CUSTOMER"),
  getMyPayments
);

router.get(
  "/my-payments/:id",
  authorizeRoles("CUSTOMER"),
  getMyPayment
);

router.patch(
  "/:id/processing",
  authorizeRoles("CUSTOMER"),
  processing
);

router.patch(
  "/:id/paid",
  authorizeRoles("CUSTOMER"),
  paid
);

router.patch(
  "/:id/failed",
  authorizeRoles("CUSTOMER"),
  failed
);

/*
|--------------------------------------------------------------------------
| Tenant Admin Payment Routes
|--------------------------------------------------------------------------
*/

router.get(
  "/admin",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getAdminPayments
);

router.get(
  "/admin/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  getAdminPayment
);

module.exports = router;