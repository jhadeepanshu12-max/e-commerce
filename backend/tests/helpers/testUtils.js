const request = require("supertest");

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

const getUserById = async (userId) => {
  return User.findById(userId);
};

const getTenantById = async (tenantId) => {
  return Tenant.findById(tenantId);
};

module.exports = {
  createTenantOwner,
  createSecondTenantOwner,
  getUserById,
  getTenantById,
};