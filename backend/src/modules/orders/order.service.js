const mongoose = require("mongoose");

const Cart = require("../customer/cart.model");
const Product = require("../catalog/product.model");
const Order = require("./order.model");

const { updateInventory } = require("../catalog/inventory.service");

const {
  validateCouponForCart,
  redeemCoupon,
} = require("../coupons/coupon.service");

const { calculateTax } = require("../taxes/tax.service");
const { calculateShipping } = require("../shipping/shipping.service");

const createServiceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();

  return `ORD-${timestamp}-${randomPart}`;
};

const roundMoney = (value) =>
  Number(Number(value).toFixed(2));

const createOrderFromCart = async ({
  tenantId,
  customerId,
  shippingAddress,
  notes = "",
  couponCode = "",
  shippingRateId = null,
}) => {
  const session = await mongoose.startSession();

  try {
    let createdOrder = null;

    await session.withTransaction(async () => {
      const cart = await Cart.findOne({
        tenantId,
        userId: customerId,
        status: "ACTIVE",
      }).session(session);

      if (!cart || !cart.items || cart.items.length === 0) {
        throw createServiceError("Your cart is empty", 400);
      }

      if (
        !shippingAddress ||
        !shippingAddress.fullName ||
        !shippingAddress.phone ||
        !shippingAddress.addressLine1 ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.postalCode
      ) {
        throw createServiceError(
          "Complete shipping address is required",
          400
        );
      }

      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product = await Product.findOne({
          _id: cartItem.productId,
          tenantId,
        }).session(session);

        if (!product) {
          throw createServiceError(
            `Product "${cartItem.productName}" is no longer available`,
            404
          );
        }

        if (product.status !== "ACTIVE") {
          throw createServiceError(
            `Product "${product.name}" is not currently available`,
            400
          );
        }

        let unitPrice = product.price;
        let variantName = "";
        let sku = product.sku;
        let imageUrl = product.images?.[0] || "";
        let variant = null;

        if (cartItem.variantId) {
          variant = product.variants.id(cartItem.variantId);

          if (!variant) {
            throw createServiceError(
              `Variant for "${product.name}" is no longer available`,
              404
            );
          }

          if (!variant.isActive) {
            throw createServiceError(
              `Variant for "${product.name}" is no longer available`,
              400
            );
          }

          unitPrice = variant.price;
          variantName = variant.name || "";
          sku = variant.sku || product.sku;
          imageUrl =
            variant.imageUrl ||
            product.images?.[0] ||
            "";
        }

        if (product.trackInventory) {
          const stockQuantity = variant
            ? variant.stockQuantity
            : product.stockQuantity;

          const reservedQuantity = variant
            ? variant.reservedQuantity || 0
            : product.reservedQuantity || 0;

          const availableQuantity =
            stockQuantity - reservedQuantity;

          if (availableQuantity < cartItem.quantity) {
            throw createServiceError(
              `Insufficient stock for "${product.name}"`,
              409
            );
          }
        }

        const itemTotal = roundMoney(
          unitPrice * cartItem.quantity
        );

        subtotal = roundMoney(subtotal + itemTotal);

        orderItems.push({
          productId: product._id,
          variantId: cartItem.variantId || null,
          productName: product.name,
          variantName,
          sku,
          imageUrl,
          quantity: cartItem.quantity,
          unitPrice: roundMoney(unitPrice),
          totalPrice: itemTotal,
        });
      }

      let coupon = null;
      let discountAmount = 0;

      if (couponCode && String(couponCode).trim()) {
        const couponResult = await validateCouponForCart({
          tenantId,
          customerId,
          couponCode,
          subtotal,
          session,
        });

        coupon = couponResult.coupon;
        discountAmount = roundMoney(
          couponResult.discountAmount
        );
      }

      const taxResult = await calculateTax({
        tenantId,
        items: orderItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        country: shippingAddress.country || "IN",
        state: shippingAddress.state || "",
        city: shippingAddress.city || "",
        postalCode: shippingAddress.postalCode || "",
      });

      const taxAmount = roundMoney(
        taxResult.totalTax || 0
      );

      const shippingResult = await calculateShipping({
        tenantId,
        country: shippingAddress.country || "IN",
        state: shippingAddress.state || "",
        city: shippingAddress.city || "",
        postalCode: shippingAddress.postalCode || "",
        orderValue: roundMoney(
          subtotal - discountAmount
        ),
        totalWeight: 0,
      });

      if (
        !shippingResult ||
        !shippingResult.options ||
        shippingResult.options.length === 0
      ) {
        throw createServiceError(
          "No shipping method available for this order",
          404
        );
      }

      let selectedShipping =
        shippingResult.options[0];

      if (shippingRateId) {
        selectedShipping =
          shippingResult.options.find(
            (option) =>
              String(option.rateId) ===
              String(shippingRateId)
          );

        if (!selectedShipping) {
          throw createServiceError(
            "Selected shipping method is not available for this order",
            400
          );
        }
      }

      const shippingAmount = roundMoney(
        selectedShipping.amount || 0
      );

      const totalAmount = roundMoney(
        subtotal -
          discountAmount +
          taxAmount +
          shippingAmount
      );

      if (totalAmount < 0) {
        throw createServiceError(
          "Invalid order total",
          400
        );
      }

      for (const item of orderItems) {
        const result = await updateInventory({
          tenantId,
          productId: item.productId,
          variantId: item.variantId,
          type: "RESERVE",
          quantity: item.quantity,
          reason: "Inventory reserved for checkout",
          referenceType: "ORDER",
          performedBy: customerId,
          session,
        });

        if (!result) {
          throw createServiceError(
            "Unable to reserve inventory",
            409
          );
        }
      }

      const orderNumber = generateOrderNumber();

      const orders = await Order.create(
        [
          {
            tenantId,
            customerId,
            orderNumber,
            status: "PENDING_PAYMENT",
            paymentStatus: "PENDING",
            fulfillmentStatus: "UNFULFILLED",
            items: orderItems,
            subtotal,
            couponId: coupon ? coupon._id : null,
            couponCode: coupon ? coupon.code : "",
            discountAmount,
            taxAmount,
            shippingAmount,
            totalAmount,
            currency: "INR",
            shippingAddress,
            notes,
          },
        ],
        { session }
      );

      createdOrder = orders[0];

      if (coupon) {
        await redeemCoupon({
          couponId: coupon._id,
          tenantId,
          customerId,
          orderId: createdOrder._id,
          discountAmount,
          session,
        });
      }

      cart.items = [];
      cart.itemCount = 0;
      cart.subtotal = 0;
      cart.status = "CONVERTED";

      await cart.save({ session });
    });

    return createdOrder;
  } finally {
    await session.endSession();
  }
};

const getCustomerOrders = async ({
  tenantId,
  customerId,
  page = 1,
  limit = 20,
}) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = {
    tenantId,
    customerId,
  };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber),

    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(
        total / limitNumber
      ),
    },
  };
};

const getOrderById = async ({
  tenantId,
  customerId,
  orderId,
}) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw createServiceError(
      "Invalid order ID",
      400
    );
  }

  const order = await Order.findOne({
    _id: orderId,
    tenantId,
    customerId,
  });

  if (!order) {
    throw createServiceError(
      "Order not found",
      404
    );
  }

  return order;
};

const getTenantOrderById = async ({
  tenantId,
  orderId,
}) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw createServiceError(
      "Invalid order ID",
      400
    );
  }

  const order = await Order.findOne({
    _id: orderId,
    tenantId,
  }).populate(
    "customerId",
    "name email"
  );

  if (!order) {
    throw createServiceError(
      "Order not found",
      404
    );
  }

  return order;
};

const getTenantOrders = async ({
  tenantId,
  page = 1,
  limit = 20,
  status,
}) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = { tenantId };

  if (status) {
    filter.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate(
        "customerId",
        "name email"
      )
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber),

    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(
        total / limitNumber
      ),
    },
  };
};

const allowedTransitions = {
  PENDING_PAYMENT: [
    "CONFIRMED",
    "CANCELLED",
  ],

  CONFIRMED: [
    "PROCESSING",
    "CANCELLED",
  ],

  PROCESSING: [
    "SHIPPED",
    "CANCELLED",
  ],

  SHIPPED: [
    "DELIVERED",
  ],

  DELIVERED: [],
  CANCELLED: [],
};

const transitionOrderStatus = async ({
  tenantId,
  orderId,
  newStatus,
  performedBy,
  cancellationReason = "",
}) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw createServiceError(
      "Invalid order ID",
      400
    );
  }

  const session = await mongoose.startSession();

  try {
    let updatedOrder = null;

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: orderId,
        tenantId,
      }).session(session);

      if (!order) {
        throw createServiceError(
          "Order not found",
          404
        );
      }

      const allowed =
        allowedTransitions[order.status] || [];

      if (!allowed.includes(newStatus)) {
        throw createServiceError(
          `Cannot change order status from ${order.status} to ${newStatus}`,
          409
        );
      }

      if (newStatus === "CANCELLED") {
        for (const item of order.items) {
          await updateInventory({
            tenantId,
            productId: item.productId,
            variantId: item.variantId,
            type: "RELEASE",
            quantity: item.quantity,
            reason: "Order cancelled",
            referenceType: "ORDER",
            referenceId: order._id,
            performedBy,
            session,
          });
        }

        order.status = "CANCELLED";
        order.fulfillmentStatus = "CANCELLED";
        order.cancelledAt = new Date();
        order.cancellationReason =
          cancellationReason;
      } else if (newStatus === "SHIPPED") {
        for (const item of order.items) {
          await updateInventory({
            tenantId,
            productId: item.productId,
            variantId: item.variantId,
            type: "COMMIT_RESERVATION",
            quantity: item.quantity,
            reason: "Order shipped",
            referenceType: "ORDER",
            referenceId: order._id,
            performedBy,
            session,
          });
        }

        order.status = "SHIPPED";
        order.fulfillmentStatus = "SHIPPED";
      } else if (newStatus === "PROCESSING") {
        order.status = "PROCESSING";
        order.fulfillmentStatus = "PROCESSING";
      } else if (newStatus === "DELIVERED") {
        order.status = "DELIVERED";
        order.fulfillmentStatus = "DELIVERED";
      } else if (newStatus === "CONFIRMED") {
        order.status = "CONFIRMED";
      }

      await order.save({ session });
      updatedOrder = order;
    });

    return updatedOrder;
  } finally {
    await session.endSession();
  }
};

const cancelCustomerOrder = async ({
  tenantId,
  customerId,
  orderId,
  cancellationReason = "",
}) => {
  const order = await Order.findOne({
    _id: orderId,
    tenantId,
    customerId,
  });

  if (!order) {
    throw createServiceError(
      "Order not found",
      404
    );
  }

  return transitionOrderStatus({
    tenantId,
    orderId,
    newStatus: "CANCELLED",
    performedBy: customerId,
    cancellationReason,
  });
};

module.exports = {
  createOrderFromCart,
  getCustomerOrders,
  getOrderById,
  getTenantOrderById,
  getTenantOrders,
  transitionOrderStatus,
  cancelCustomerOrder,
};