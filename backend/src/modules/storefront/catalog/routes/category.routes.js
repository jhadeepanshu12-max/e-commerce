const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../../middleware/tenant.middleware");

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");

const router = express.Router();

router.use(
  authenticate,
  requireTenant
);

router.get(
  "/",
  getCategories
);

router.get(
  "/:id",
  getCategoryById
);

router.post(
  "/",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  createCategory
);

router.patch(
  "/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  updateCategory
);

router.delete(
  "/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  deleteCategory
);

module.exports = router;