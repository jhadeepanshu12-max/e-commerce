const request = require("supertest");

const app = require("../../src/app");

const {
  createTenantOwner,
} = require("../helpers/testUtils");

describe("Authentication API", () => {
  test("should create a tenant owner account", async () => {
    const response = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: "Deepanshu Test",
        email: "auth-test@example.com",
        password: "TestPass12345",
        businessName: "Auth Test Store",
        businessType: "GENERAL",
      });

    expect(response.statusCode).toBe(
      201
    );

    expect(response.body.success).toBe(
      true
    );

    expect(
      response.body.data.user.role
    ).toBe("TENANT_OWNER");

    expect(
      response.body.data.tenant.name
    ).toBe("Auth Test Store");

    expect(
      response.body.data.accessToken
    ).toBeDefined();
  });

  test("should reject invalid login credentials", async () => {
    await createTenantOwner({
      email: "login-test@example.com",
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "login-test@example.com",
        password: "WrongPassword123",
      });

    expect(response.statusCode).toBe(
      401
    );

    expect(response.body.success).toBe(
      false
    );

    expect(response.body.message).toBe(
      "Invalid email or password"
    );
  });

  test("should login with valid credentials", async () => {
    await createTenantOwner({
      email: "valid-login@example.com",
      password: "TestPass12345",
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "valid-login@example.com",
        password: "TestPass12345",
      });

    expect(response.statusCode).toBe(
      200
    );

    expect(response.body.success).toBe(
      true
    );

    expect(
      response.body.data.accessToken
    ).toBeDefined();
  });
});