const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../users/user.model");
const Tenant = require("../tenants/tenant.model");
const env = require("../../config/env");

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

const registerCustomer = async ({
  name,
  email,
  password,
  tenantSlug,
}) => {
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const normalizedSlug = tenantSlug
    .trim()
    .toLowerCase();

  const tenant = await Tenant.findOne({
    slug: normalizedSlug,
    status: "ACTIVE",
  });

  if (!tenant) {
    const error = new Error(
      "Store not found or inactive"
    );

    error.statusCode = 404;

    throw error;
  }

  const existingUser = await User.findOne({
    tenantId: tenant._id,
    email: normalizedEmail,
  });

  if (existingUser) {
    const error = new Error(
      "An account with this email already exists in this store"
    );

    error.statusCode = 409;

    throw error;
  }

  const passwordHash = await bcrypt.hash(
    password,
    12
  );

  const user = await User.create({
    tenantId: tenant._id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "CUSTOMER",
    permissions: [],
    isActive: true,
    emailVerified: false,
  });

  const accessToken =
    generateAccessToken(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
    tenant: {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      businessType: tenant.businessType,
    },
    accessToken,
  };
};

const loginCustomer = async ({
  email,
  password,
  tenantSlug,
}) => {
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const normalizedSlug = tenantSlug
    .trim()
    .toLowerCase();

  const tenant = await Tenant.findOne({
    slug: normalizedSlug,
    status: "ACTIVE",
  });

  if (!tenant) {
    const error = new Error(
      "Store not found or inactive"
    );

    error.statusCode = 404;

    throw error;
  }

  const user = await User.findOne({
    tenantId: tenant._id,
    email: normalizedEmail,
  }).select("+passwordHash");

  if (!user || !user.isActive) {
    const error = new Error(
      "Invalid email or password"
    );

    error.statusCode = 401;

    throw error;
  }

  if (user.role !== "CUSTOMER") {
    const error = new Error(
      "This account is not a customer account"
    );

    error.statusCode = 403;

    throw error;
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      user.passwordHash
    );

  if (!passwordMatches) {
    const error = new Error(
      "Invalid email or password"
    );

    error.statusCode = 401;

    throw error;
  }

  const accessToken =
    generateAccessToken(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
    tenant: {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      businessType: tenant.businessType,
    },
    accessToken,
  };
};

module.exports = {
  registerCustomer,
  loginCustomer,
};