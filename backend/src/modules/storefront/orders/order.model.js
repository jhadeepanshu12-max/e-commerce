const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    variantName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 100,
      default: "",
    },

    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  }
);

const orderSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 50,
    },

    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "PENDING_PAYMENT",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },

    fulfillmentStatus: {
      type: String,
      enum: [
        "UNFULFILLED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "UNFULFILLED",
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Order must contain at least one item",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: 50,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    shippingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
      maxlength: 10,
    },

    shippingAddress: {
      fullName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
      },

      addressLine1: {
        type: String,
        required: true,
        trim: true,
        maxlength: 250,
      },

      addressLine2: {
        type: String,
        trim: true,
        default: "",
        maxlength: 250,
      },

      city: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      state: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      postalCode: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
      },

      country: {
        type: String,
        trim: true,
        default: "India",
        maxlength: 100,
      },
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({
  tenantId: 1,
  customerId: 1,
  createdAt: -1,
});

orderSchema.index({
  tenantId: 1,
  status: 1,
  createdAt: -1,
});

orderSchema.index({
  tenantId: 1,
  orderNumber: 1,
});

module.exports = mongoose.model(
  "Order",
  orderSchema
);