const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../../middleware/auth.middleware");

const {
  getOverview,
  getTenants,
  updateTenantStatus,
  getUsers,
} = require("../controllers/platform.controller");

const router = express.Router();

router.use(authenticate, authorizeRoles("SUPER_ADMIN"));

router.get("/overview", getOverview);
router.get("/tenants", getTenants);
router.patch("/tenants/:id/status", updateTenantStatus);
router.get("/users", getUsers);

module.exports = router;
