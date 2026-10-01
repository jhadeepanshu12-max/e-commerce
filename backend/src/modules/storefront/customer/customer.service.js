const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  OAuth2Client,
} = require("google-auth-library");

const User = require("../users/user.model");
const Tenant = require("../tenants/tenant.model");
const env = require("../../config/env");

const googleClientId =
  process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(
  googleClientId
);

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

const formatCustomerAuthResult = (
  user,
  tenant
) => {
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

  return formatCustomerAuthResult(
    user,
    tenant
  );
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

  if (!user.passwordHash) {
    const error = new Error(
      "This account uses Google sign-in. Please continue with Google."
    );

    error.statusCode = 401;

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

  return formatCustomerAuthResult(
    user,
    tenant
  );
};

const loginCustomerWithGoogle = async ({
  credential,
  tenantSlug,
}) => {
  if (!googleClientId) {
    const error = new Error(
      "Google authentication is not configured on the server"
    );

    error.statusCode = 500;

    throw error;
  }

  if (
    !credential ||
    typeof credential !== "string"
  ) {
    const error = new Error(
      "Google credential is required"
    );

    error.statusCode = 400;

    throw error;
  }

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

  let ticket;

  try {
    ticket =
      await googleClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
  } catch (verificationError) {
    const error = new Error(
      "Invalid Google authentication token"
    );

    error.statusCode = 401;

    throw error;
  }

  const payload =
    ticket.getPayload();

  if (!payload) {
    const error = new Error(
      "Invalid Google account information"
    );

    error.statusCode = 401;

    throw error;
  }

  const googleSub = payload.sub;
  const googleEmail = payload.email
    ?.trim()
    .toLowerCase();

  const googleName =
    payload.name?.trim();

  const emailVerified =
    payload.email_verified === true;

  if (!googleSub) {
    const error = new Error(
      "Google account identifier is missing"
    );

    error.statusCode = 401;

    throw error;
  }

  if (!googleEmail) {
    const error = new Error(
      "Google account email is missing"
    );

    error.statusCode = 401;

    throw error;
  }

  if (!emailVerified) {
    const error = new Error(
      "Google email must be verified"
    );

    error.statusCode = 401;

    throw error;
  }

  let user = await User.findOne({
    tenantId: tenant._id,
    "google.sub": googleSub,
  });

  if (user) {
    if (!user.isActive) {
      const error = new Error(
        "This customer account is inactive"
      );

      error.statusCode = 403;

      throw error;
    }

    if (user.role !== "CUSTOMER") {
      const error = new Error(
        "This account is not a customer account"
      );

      error.statusCode = 403;

      throw error;
    }

    user.google.email = googleEmail;

    if (googleName) {
      user.name = googleName;
    }

    user.emailVerified = true;

    await user.save();

    return formatCustomerAuthResult(
      user,
      tenant
    );
  }

  user = await User.findOne({
    tenantId: tenant._id,
    email: googleEmail,
  });

  if (user) {
    if (!user.isActive) {
      const error = new Error(
        "This customer account is inactive"
      );

      error.statusCode = 403;

      throw error;
    }

    if (user.role !== "CUSTOMER") {
      const error = new Error(
        "This email already belongs to another account type"
      );

      error.statusCode = 409;

      throw error;
    }

    user.google = {
      sub: googleSub,
      email: googleEmail,
    };

    user.emailVerified = true;

    if (
      googleName &&
      !user.name
    ) {
      user.name = googleName;
    }

    await user.save();

    return formatCustomerAuthResult(
      user,
      tenant
    );
  }

  const randomPasswordHash =
    await bcrypt.hash(
      crypto.randomBytes(32).toString("hex"),
      12
    );

  user = await User.create({
    tenantId: tenant._id,
    name:
      googleName ||
      googleEmail.split("@")[0],
    email: googleEmail,
    passwordHash: randomPasswordHash,
    google: {
      sub: googleSub,
      email: googleEmail,
    },
    role: "CUSTOMER",
    permissions: [],
    isActive: true,
    emailVerified: true,
  });

  return formatCustomerAuthResult(
    user,
    tenant
  );
};

module.exports = {
  registerCustomer,
  loginCustomer,
  loginCustomerWithGoogle,
};