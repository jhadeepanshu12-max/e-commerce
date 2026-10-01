const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      maxlength: 255,
    },

    passwordHash: {
      type: String,
      required: false,
      select: false,
    },

    google: {
      sub: {
        type: String,
        trim: true,
      },

      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
    },

    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "TENANT_OWNER",
        "STAFF",
        "CUSTOMER",
      ],
      default: "CUSTOMER",
    },

    permissions: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index(
  { tenantId: 1, email: 1 },
  { unique: true }
);

userSchema.index({
  tenantId: 1,
  role: 1,
});

userSchema.index(
  { tenantId: 1, "google.sub": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "google.sub": {
        $type: "string",
      },
    },
  }
);

module.exports = mongoose.model(
  "User",
  userSchema
);