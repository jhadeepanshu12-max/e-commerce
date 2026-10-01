const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    recipientType: {
      type: String,
      enum: ["CUSTOMER", "USER"],
      required: true,
    },

    type: {
      type: String,
      enum: [
        "ORDER",
        "PAYMENT",
        "SHIPPING",
        "REVIEW",
        "COUPON",
        "INVENTORY",
        "SYSTEM",
      ],
      required: true,
    },

    event: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 1000,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    actionUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({
  tenantId: 1,
  recipientId: 1,
  createdAt: -1,
});

notificationSchema.index({
  tenantId: 1,
  recipientId: 1,
  isRead: 1,
  createdAt: -1,
});

notificationSchema.index({
  tenantId: 1,
  type: 1,
  createdAt: -1,
});

notificationSchema.index({
  expiresAt: 1,
});

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);