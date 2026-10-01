const mongoose = require("mongoose");

const shippingRateSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingZone",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    method: {
      type: String,
      enum: [
        "FLAT",
        "FREE",
        "ORDER_VALUE",
        "WEIGHT",
      ],
      required: true,
      default: "FLAT",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    freeShippingThreshold: {
      type: Number,
      min: 0,
      default: null,
    },

    minimumOrderValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    maximumOrderValue: {
      type: Number,
      min: 0,
      default: null,
    },

    minimumWeight: {
      type: Number,
      min: 0,
      default: null,
    },

    maximumWeight: {
      type: Number,
      min: 0,
      default: null,
    },

    estimatedDeliveryMinDays: {
      type: Number,
      min: 0,
      default: 2,
    },

    estimatedDeliveryMaxDays: {
      type: Number,
      min: 0,
      default: 5,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

shippingRateSchema.index({
  tenantId: 1,
  zoneId: 1,
  isActive: 1,
});

shippingRateSchema.index({
  tenantId: 1,
  zoneId: 1,
  sortOrder: 1,
});

module.exports = mongoose.model(
  "ShippingRate",
  shippingRateSchema
);