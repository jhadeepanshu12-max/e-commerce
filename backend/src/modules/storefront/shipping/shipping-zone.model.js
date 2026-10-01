const mongoose = require("mongoose");

const shippingZoneSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
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

    countries: {
      type: [String],
      default: ["IN"],
    },

    states: {
      type: [String],
      default: [],
    },

    cities: {
      type: [String],
      default: [],
    },

    postalCodes: {
      type: [String],
      default: [],
    },

    priority: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

shippingZoneSchema.index({
  tenantId: 1,
  priority: -1,
});

shippingZoneSchema.index({
  tenantId: 1,
  isActive: 1,
});

shippingZoneSchema.index(
  {
    tenantId: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "ShippingZone",
  shippingZoneSchema
);