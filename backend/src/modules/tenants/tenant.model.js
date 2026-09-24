const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: [true, "Store slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug can only contain lowercase letters, numbers and hyphens",
      ],
    },

    businessType: {
      type: String,
      enum: [
        "GENERAL",
        "CLOTHING",
        "ELECTRONICS",
        "GROCERY",
        "OTHER",
      ],
      default: "GENERAL",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "PENDING"],
      default: "ACTIVE",
    },

    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    branding: {
      logoUrl: {
        type: String,
        default: "",
      },

      faviconUrl: {
        type: String,
        default: "",
      },

      primaryColor: {
        type: String,
        default: "#6C5CE7",
      },

      secondaryColor: {
        type: String,
        default: "#00B894",
      },

      accentColor: {
        type: String,
        default: "#FD79A8",
      },

      backgroundColor: {
        type: String,
        default: "#FFFFFF",
      },

      textColor: {
        type: String,
        default: "#1F2937",
      },

      fontFamily: {
        type: String,
        default: "Inter",
      },

      borderRadius: {
        type: String,
        enum: ["SMALL", "MEDIUM", "LARGE", "ROUND"],
        default: "MEDIUM",
      },

      themeMode: {
        type: String,
        enum: ["LIGHT", "DARK", "SYSTEM"],
        default: "LIGHT",
      },
    },
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ status: 1 });

module.exports = mongoose.model("Tenant", tenantSchema);