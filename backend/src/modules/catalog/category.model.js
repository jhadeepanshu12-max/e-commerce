const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: [true, "Category slug is required"],
      lowercase: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
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

categorySchema.index(
  { tenantId: 1, slug: 1 },
  { unique: true }
);

categorySchema.index({
  tenantId: 1,
  parentId: 1,
  isActive: 1,
});

module.exports = mongoose.model("Category", categorySchema);