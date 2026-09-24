const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../../middleware/tenant.middleware");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller");

const router = express.Router();

router.use(
  authenticate,
  requireTenant
);

router.get(
  "/",
  getProducts
);

router.get(
  "/:id",
  getProductById
);

router.post(
  "/",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  createProduct
);

router.patch(
  "/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  updateProduct
);

router.delete(
  "/:id",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  deleteProduct
);

module.exports = router;