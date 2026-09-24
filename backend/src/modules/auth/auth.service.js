const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const env = require("../../config/env");
const User = require("../users/user.model");
const Tenant = require("../tenants/tenant.model");

const generateSlug = (businessName) => {
  return businessName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const generateUniqueSlug = async (businessName) => {
  const baseSlug = generateSlug(businessName) || "store";

  let slug = baseSlug;
  let counter = 1;

  while (await Tenant.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      tenantId: user.tenantId
        ? user.tenantId.toString()
        : null,
      role: user.role,
    },
    env.jwtAccessSecret,
    {
      expiresIn: "15m",
      issuer: "ecommerce-platform",
      audience: "ecommerce-api",
    }
  );
};

const sanitizeUser = (user) => {
  return {
    id: user._id,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
  };
};

const registerTenantOwner = async ({
  name,
  email,
  password,
  businessName,
  businessType = "GENERAL",
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({
    email: normalizedEmail,
    role: {
      $in: ["TENANT_OWNER", "STAFF", "CUSTOMER"],
    },
  });

  if (existingUser) {
    const error = new Error(
      "An account with this email already exists"
    );
    error.statusCode = 409;
    throw error;
  }

  const session = await User.startSession();

  try {
    let createdUser;

    await session.withTransaction(async () => {
      const slug = await generateUniqueSlug(businessName);

      const tenant = await Tenant.create(
        [
          {
            name: businessName.trim(),
            slug,
            businessType,
            status: "ACTIVE",
          },
        ],
        { session }
      );

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await User.create(
        [
          {
            tenantId: tenant[0]._id,
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: "TENANT_OWNER",
            permissions: ["TENANT_OWNER"],
            isActive: true,
            emailVerified: false,
          },
        ],
        { session }
      );

      await Tenant.findByIdAndUpdate(
        tenant[0]._id,
        {
          ownerUserId: user[0]._id,
        },
        { session }
      );

      createdUser = user[0];
    });

    const userWithTenant = await User.findById(
      createdUser._id
    ).populate("tenantId", "name slug businessType status");

    const accessToken = generateAccessToken(userWithTenant);

    return {
      user: sanitizeUser(userWithTenant),
      tenant: userWithTenant.tenantId,
      accessToken,
    };
  } finally {
    await session.endSession();
  }
};

const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail,
  })
    .select("+passwordHash")
    .populate("tenantId", "name slug businessType status");

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("Your account has been deactivated");
    error.statusCode = 403;
    throw error;
  }

  if (
    user.tenantId &&
    user.tenantId.status !== "ACTIVE"
  ) {
    const error = new Error("This store is not currently active");
    error.statusCode = 403;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const accessToken = generateAccessToken(user);

  return {
    user: sanitizeUser(user),
    tenant: user.tenantId,
    accessToken,
  };
};

module.exports = {
  registerTenantOwner,
  loginUser,
};