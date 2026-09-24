const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    code: {
      type: String,
      required: [true, "Coupon code is required"],
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 50,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    minOrderValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    maxDiscountAmount: {
      type: Number,
      min: 0,
      default: null,
    },

    startsAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    usageLimit: {
      type: Number,
      min: 1,
      default: null,
    },

    usageCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    perCustomerLimit: {
      type: Number,
      min: 1,
      default: 1,
    },

    applicableProductIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    applicableCategoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.index(
  {
    tenantId: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

couponSchema.index({
  tenantId: 1,
  isActive: 1,
  startsAt: 1,
  expiresAt: 1,
});

module.exports = mongoose.model("Coupon", couponSchema);