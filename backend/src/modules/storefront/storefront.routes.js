const express = require("express");

const {
  getStorefront,
  getPublicCategories,
  getPublicProducts,
  getPublicProductById,
} = require("./storefront.controller");

const router = express.Router();

router.get(
  "/:tenantSlug",
  getStorefront
);

router.get(
  "/:tenantSlug/categories",
  getPublicCategories
);

router.get(
  "/:tenantSlug/products",
  getPublicProducts
);

router.get(
  "/:tenantSlug/products/:productId",
  getPublicProductById
);

module.exports = router;