const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 100,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    compareAtPrice: {
      type: Number,
      min: 0,
      default: null,
    },

    costPrice: {
      type: Number,
      min: 0,
      default: null,
    },

    stockQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    reservedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    attributes: {
      type: Map,
      of: String,
      default: {},
    },

    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: [true, "Product slug is required"],
      lowercase: true,
      trim: true,
      maxlength: 220,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    sku: {
      type: String,
      required: [true, "Product SKU is required"],
      trim: true,
      uppercase: true,
      maxlength: 100,
    },

    images: {
      type: [String],
      default: [],
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    compareAtPrice: {
      type: Number,
      min: 0,
      default: null,
    },

    costPrice: {
      type: Number,
      min: 0,
      default: null,
    },

    stockQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    reservedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    trackInventory: {
      type: Boolean,
      default: true,
    },

    allowBackorder: {
      type: Boolean,
      default: false,
    },

    attributes: {
      type: Map,
      of: String,
      default: {},
    },

    variants: {
      type: [variantSchema],
      default: [],
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "ACTIVE",
        "ARCHIVED",
      ],
      default: "DRAFT",
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    seo: {
      title: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },

      description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      keywords: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index(
  { tenantId: 1, slug: 1 },
  { unique: true }
);

productSchema.index(
  { tenantId: 1, sku: 1 },
  { unique: true }
);

productSchema.index({
  tenantId: 1,
  categoryId: 1,
  status: 1,
});

productSchema.index({
  tenantId: 1,
  isFeatured: 1,
  status: 1,
});

productSchema.index({
  tenantId: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Product",
  productSchema
);