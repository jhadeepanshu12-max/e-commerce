const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../middleware/tenant.middleware");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("./cart.controller");

const router = express.Router();

router.use(
  authenticate,
  requireTenant,
  authorizeRoles("CUSTOMER")
);

router.get(
  "/",
  getCart
);

router.post(
  "/items",
  addToCart
);

router.patch(
  "/items/:itemId",
  updateCartItem
);

router.delete(
  "/items/:itemId",
  removeCartItem
);

router.delete(
  "/",
  clearCart
);

module.exports = router;