const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    verifiedPurchase: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "PUBLISHED",
        "REJECTED",
      ],
      default: "PUBLISHED",
      index: true,
    },

    moderationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    moderatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One customer can review a product only once
 * inside a tenant.
 */
reviewSchema.index(
  {
    tenantId: 1,
    productId: 1,
    customerId: 1,
  },
  {
    unique: true,
  }
);

reviewSchema.index({
  tenantId: 1,
  productId: 1,
  status: 1,
  createdAt: -1,
});

reviewSchema.index({
  tenantId: 1,
  customerId: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Review",
  reviewSchema
);