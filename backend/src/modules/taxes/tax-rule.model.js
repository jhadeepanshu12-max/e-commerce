const mongoose = require("mongoose");

const taxRuleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Tax rule name is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    code: {
      type: String,
      required: [true, "Tax code is required"],
      trim: true,
      uppercase: true,
      maxlength: 50,
    },

    taxType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true,
      default: "PERCENTAGE",
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
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

    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    categoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    appliesToAllProducts: {
      type: Boolean,
      default: true,
    },

    priceIncludesTax: {
      type: Boolean,
      default: false,
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

    priority: {
      type: Number,
      min: 0,
      default: 0,
    },

    effectiveFrom: {
      type: Date,
      default: null,
    },

    effectiveUntil: {
      type: Date,
      default: null,
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

taxRuleSchema.index(
  {
    tenantId: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

taxRuleSchema.index({
  tenantId: 1,
  isActive: 1,
  priority: -1,
});

taxRuleSchema.index({
  tenantId: 1,
  productIds: 1,
});

taxRuleSchema.index({
  tenantId: 1,
  categoryIds: 1,
});

module.exports = mongoose.model(
  "TaxRule",
  taxRuleSchema
);