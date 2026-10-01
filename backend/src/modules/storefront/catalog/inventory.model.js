const mongoose = require("mongoose");

const inventoryTransactionSchema =
  new mongoose.Schema(
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

      type: {
        type: String,
        enum: [
          "STOCK_IN",
          "STOCK_OUT",
          "RESERVE",
          "RELEASE",
          "ADJUSTMENT",
          "COMMIT_RESERVATION",
        ],
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      previousQuantity: {
        type: Number,
        required: true,
        min: 0,
      },

      newQuantity: {
        type: Number,
        required: true,
        min: 0,
      },

      reason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      referenceType: {
        type: String,
        enum: [
          "MANUAL",
          "ORDER",
          "RETURN",
          "SYSTEM",
        ],
        default: "MANUAL",
      },

      referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },

      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

inventoryTransactionSchema.index({
  tenantId: 1,
  productId: 1,
  createdAt: -1,
});

inventoryTransactionSchema.index({
  tenantId: 1,
  variantId: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);