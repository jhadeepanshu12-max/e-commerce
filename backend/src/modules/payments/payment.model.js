const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: [
        "RAZORPAY",
        "STRIPE",
        "COD",
        "MANUAL",
      ],
      required: true,
    },

    providerOrderId: {
      type: String,
      trim: true,
      default: "",
    },

    providerPaymentId: {
      type: String,
      trim: true,
      default: "",
    },

    amount: {
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

    status: {
      type: String,
      enum: [
        "PENDING",
        "PROCESSING",
        "PAID",
        "FAILED",
        "CANCELLED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },

    method: {
      type: String,
      enum: [
        "CARD",
        "UPI",
        "NETBANKING",
        "WALLET",
        "COD",
        "OTHER",
        "",
      ],
      default: "",
    },

    failureReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({
  tenantId: 1,
  orderId: 1,
});

paymentSchema.index({
  tenantId: 1,
  customerId: 1,
  createdAt: -1,
});

paymentSchema.index({
  tenantId: 1,
  providerPaymentId: 1,
});

paymentSchema.index({
  tenantId: 1,
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Payment",
  paymentSchema
);