const request = require("supertest");

const app = require("../../src/app");

const {
  createTenantOwner,
} = require("../helpers/testUtils");

describe("Customer Authentication API", () => {
  test("should register a customer for a tenant", async () => {
    const { tenant } =
      await createTenantOwner({
        email:
          "customer-owner@example.com",
        businessName:
          "Customer Store",
      });

    const response = await request(app)
      .post(
        "/api/v1/customer-auth/signup"
      )
      .send({
        name: "Test Customer",
        email:
          "customer@example.com",
        password:
          "CustomerPass123",
        tenantSlug: tenant.slug,
      });

    expect(response.statusCode).toBe(
      201
    );

    expect(
      response.body.success
    ).toBe(true);

    expect(
      response.body.data.user.role
    ).toBe("CUSTOMER");

    expect(
      response.body.data.user.tenantId.toString()
    ).toBe(tenant._id.toString());

    expect(
      response.body.data.accessToken
    ).toBeTruthy();
  });

  test("should login customer only through the correct tenant", async () => {
    const { tenant } =
      await createTenantOwner({
        email:
          "customer-login-owner@example.com",
        businessName:
          "Login Store",
      });

    await request(app)
      .post(
        "/api/v1/customer-auth/signup"
      )
      .send({
        name: "Login Customer",
        email:
          "login-customer@example.com",
        password:
          "CustomerPass123",
        tenantSlug: tenant.slug,
      });

    const response = await request(app)
      .post(
        "/api/v1/customer-auth/login"
      )
      .send({
        email:
          "login-customer@example.com",
        password:
          "CustomerPass123",
        tenantSlug: tenant.slug,
      });

    expect(response.statusCode).toBe(
      200
    );

    expect(
      response.body.data.user.role
    ).toBe("CUSTOMER");

    expect(
      response.body.data.accessToken
    ).toBeTruthy();
  });

  test("should reject duplicate customer email inside the same tenant", async () => {
    const { tenant } =
      await createTenantOwner({
        email:
          "duplicate-owner@example.com",
        businessName:
          "Duplicate Store",
      });

    const customer = {
      name: "Duplicate Customer",
      email:
        "duplicate@example.com",
      password:
        "CustomerPass123",
      tenantSlug: tenant.slug,
    };

    const first =
      await request(app)
        .post(
          "/api/v1/customer-auth/signup"
        )
        .send(customer);

    expect(first.statusCode).toBe(
      201
    );

    const second =
      await request(app)
        .post(
          "/api/v1/customer-auth/signup"
        )
        .send(customer);

    expect(second.statusCode).toBe(
      409
    );
  });

  test("should not allow customer from tenant A to login through tenant B", async () => {
    const tenantA =
      await createTenantOwner({
        email:
          "customer-tenant-a-owner@example.com",
        businessName:
          "Customer Tenant A",
      });

    const tenantB =
      await createTenantOwner({
        email:
          "customer-tenant-b-owner@example.com",
        businessName:
          "Customer Tenant B",
      });

    await request(app)
      .post(
        "/api/v1/customer-auth/signup"
      )
      .send({
        name: "Tenant A Customer",
        email:
          "same-customer@example.com",
        password:
          "CustomerPass123",
        tenantSlug:
          tenantA.tenant.slug,
      });

    const response = await request(app)
      .post(
        "/api/v1/customer-auth/login"
      )
      .send({
        email:
          "same-customer@example.com",
        password:
          "CustomerPass123",
        tenantSlug:
          tenantB.tenant.slug,
      });

    expect(response.statusCode).toBe(
      401
    );
  });
});