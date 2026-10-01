const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../../src/app");

const User = require("../../src/modules/users/user.model");
const Tenant = require("../../src/modules/tenants/tenant.model");

const createTenantOwner = async ({
  name = "Test Owner",
  email = `owner-${Date.now()}@example.com`,
  password = "TestPass12345",
  businessName = `Test Store ${Date.now()}`,
} = {}) => {
  const response = await request(app)
    .post("/api/v1/auth/signup")
    .send({
      name,
      email,
      password,
      businessName,
      businessType: "GENERAL",
    });

  if (response.statusCode !== 201) {
    throw new Error(
      `Test owner creation failed: ${JSON.stringify(
        response.body
      )}`
    );
  }

  return {
    response,
    user: response.body.data.user,
    tenant: response.body.data.tenant,
    accessToken:
      response.body.data.accessToken,
  };
};

const createSecondTenantOwner =
  async () => {
    return createTenantOwner({
      name: "Second Owner",
      email: `second-${Date.now()}@example.com`,
      businessName: `Second Store ${Date.now()}`,
    });
  };

const createSuperAdmin = async ({
  name = "Platform Admin",
  email = `super-admin-${Date.now()}@example.com`,
  password = "TestPass12345",
} = {}) => {
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "SUPER_ADMIN",
    permissions: ["SUPER_ADMIN"],
    isActive: true,
    emailVerified: true,
  });

  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });

  if (response.statusCode !== 200) {
    throw new Error(
      `Super admin creation failed: ${JSON.stringify(response.body)}`
    );
  }

  return {
    user,
    accessToken: response.body.data.accessToken,
  };
};

const getUserById = async (userId) => {
  return User.findById(userId);
};

const getTenantById = async (tenantId) => {
  return Tenant.findById(tenantId);
};

module.exports = {
  createTenantOwner,
  createSecondTenantOwner,
  createSuperAdmin,
  getUserById,
  getTenantById,
};