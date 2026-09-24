const mongoose = require("mongoose");

const Cart = require("./cart.model");
const Product = require("../catalog/product.model");

const getAvailableStock = (
  product,
  variant = null
) => {
  if (!product.trackInventory) {
    return Infinity;
  }

  if (variant) {
    return Math.max(
      0,
      variant.stockQuantity -
        (variant.reservedQuantity || 0)
    );
  }

  return Math.max(
    0,
    product.stockQuantity -
      (product.reservedQuantity || 0)
  );
};

const calculateCartTotals = (cart) => {
  cart.itemCount =
    cart.items.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  cart.subtotal =
    cart.items.reduce(
      (total, item) =>
        total +
        item.quantity *
          item.unitPrice,
      0
    );

  cart.subtotal = Number(
    cart.subtotal.toFixed(2)
  );
};

const getOrCreateCart = async (
  tenantId,
  userId
) => {
  let cart = await Cart.findOne({
    tenantId,
    userId,
    status: "ACTIVE",
  });

  if (!cart) {
    cart = await Cart.create({
      tenantId,
      userId,
      status: "ACTIVE",
      items: [],
      subtotal: 0,
      itemCount: 0,
    });
  }

  return cart;
};

const getCart = async (
  req,
  res,
  next
) => {
  try {
    const cart =
      await getOrCreateCart(
        req.auth.tenantId,
        req.auth.userId
      );

    return res.status(200).json({
      success: true,
      data: {
        cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

const addToCart = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      req.auth.tenantId;

    const userId =
      req.auth.userId;

    const {
      productId,
      variantId = null,
      quantity = 1,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid product ID is required",
      });
    }

    if (
      variantId &&
      !mongoose.Types.ObjectId.isValid(
        variantId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid variant ID",
      });
    }

    const parsedQuantity =
      Number(quantity);

    if (
      !Number.isInteger(
        parsedQuantity
      ) ||
      parsedQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a positive integer",
      });
    }

    const product =
      await Product.findOne({
        _id: productId,
        tenantId,
        status: "ACTIVE",
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    let variant = null;

    if (variantId) {
      variant =
        product.variants.id(
          variantId
        );

      if (
        !variant ||
        !variant.isActive
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Product variant not found",
        });
      }
    }

    const availableStock =
      getAvailableStock(
        product,
        variant
      );

    const cart =
      await getOrCreateCart(
        tenantId,
        userId
      );

    const existingItem =
      cart.items.find(
        (item) =>
          item.productId.toString() ===
            productId &&
          (item.variantId
            ? item.variantId.toString()
            : null) ===
            (variantId || null)
      );

    const requestedTotal =
      existingItem
        ? existingItem.quantity +
          parsedQuantity
        : parsedQuantity;

    if (
      product.allowBackorder === false &&
      requestedTotal > availableStock
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Requested quantity exceeds available stock",
        data: {
          availableStock,
        },
      });
    }

    const unitPrice = variant
      ? variant.price
      : product.price;

    const productName =
      product.name;

    const variantName =
      variant?.name || "";

    const imageUrl =
      variant?.imageUrl ||
      product.images?.[0] ||
      "";

    if (existingItem) {
      existingItem.quantity =
        requestedTotal;

      existingItem.unitPrice =
        unitPrice;

      existingItem.productName =
        productName;

      existingItem.variantName =
        variantName;

      existingItem.imageUrl =
        imageUrl;
    } else {
      cart.items.push({
        productId,
        variantId,
        quantity: parsedQuantity,
        unitPrice,
        productName,
        variantName,
        imageUrl,
      });
    }

    calculateCartTotals(cart);

    await cart.save();

    return res.status(200).json({
      success: true,
      message:
        "Product added to cart",
      data: {
        cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateCartItem = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      req.auth.tenantId;

    const userId =
      req.auth.userId;

    const {
      quantity,
    } = req.body;

    const parsedQuantity =
      Number(quantity);

    if (
      !Number.isInteger(
        parsedQuantity
      ) ||
      parsedQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a positive integer",
      });
    }

    const cart =
      await Cart.findOne({
        tenantId,
        userId,
        status: "ACTIVE",
      });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item =
      cart.items.id(
        req.params.itemId
      );

    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          "Cart item not found",
      });
    }

    const product =
      await Product.findOne({
        _id: item.productId,
        tenantId,
        status: "ACTIVE",
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product is no longer available",
      });
    }

    const variant = item.variantId
      ? product.variants.id(
          item.variantId
        )
      : null;

    if (
      item.variantId &&
      (!variant ||
        !variant.isActive)
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Product variant is no longer available",
      });
    }

    const availableStock =
      getAvailableStock(
        product,
        variant
      );

    if (
      !product.allowBackorder &&
      parsedQuantity >
        availableStock
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Requested quantity exceeds available stock",
        data: {
          availableStock,
        },
      });
    }

    item.quantity =
      parsedQuantity;

    item.unitPrice = variant
      ? variant.price
      : product.price;

    calculateCartTotals(cart);

    await cart.save();

    return res.status(200).json({
      success: true,
      message:
        "Cart item updated successfully",
      data: {
        cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (
  req,
  res,
  next
) => {
  try {
    const cart =
      await Cart.findOne({
        tenantId:
          req.auth.tenantId,
        userId:
          req.auth.userId,
        status: "ACTIVE",
      });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item =
      cart.items.id(
        req.params.itemId
      );

    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          "Cart item not found",
      });
    }

    item.deleteOne();

    calculateCartTotals(cart);

    await cart.save();

    return res.status(200).json({
      success: true,
      message:
        "Cart item removed successfully",
      data: {
        cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

const clearCart = async (
  req,
  res,
  next
) => {
  try {
    const cart =
      await Cart.findOne({
        tenantId:
          req.auth.tenantId,
        userId:
          req.auth.userId,
        status: "ACTIVE",
      });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is already empty",
        data: {
          cart: null,
        },
      });
    }

    cart.items = [];
    calculateCartTotals(cart);

    await cart.save();

    return res.status(200).json({
      success: true,
      message:
        "Cart cleared successfully",
      data: {
        cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};