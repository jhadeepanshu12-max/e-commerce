const mongoose = require("mongoose");

const cartItemSchema =
  new mongoose.Schema(
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

      productName: {
        type: String,
        required: true,
        trim: true,
      },

      variantName: {
        type: String,
        default: "",
        trim: true,
      },

      imageUrl: {
        type: String,
        default: "",
        trim: true,
      },
    },
    {
      _id: true,
    }
  );

const cartSchema =
  new mongoose.Schema(
    {
      tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        index: true,
      },

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "ACTIVE",
          "CONVERTED",
          "ABANDONED",
        ],
        default: "ACTIVE",
      },

      items: {
        type: [cartItemSchema],
        default: [],
      },

      subtotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      itemCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      timestamps: true,
    }
  );

cartSchema.index(
  {
    tenantId: 1,
    userId: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "ACTIVE",
    },
  }
);

module.exports = mongoose.model(
  "Cart",
  cartSchema
);