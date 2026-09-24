const request = require("supertest");

const app = require("../../src/app");

const {
  createTenantOwner,
  createSecondTenantOwner,
} = require("../helpers/testUtils");

describe("Multi-Tenant Security", () => {
  test("tenant A must not access tenant B tenant data", async () => {
    const tenantA =
      await createTenantOwner({
        email: "isolation-a@example.com",
        businessName: "Isolation Store A",
      });

    const tenantB =
      await createSecondTenantOwner();

    const response = await request(app)
      .get("/api/v1/tenants/me")
      .set(
        "Authorization",
        `Bearer ${tenantA.accessToken}`
      );

    expect(response.statusCode).toBe(
      200
    );

    expect(
      response.body.data.tenant._id.toString()
    ).toBe(tenantA.tenant._id.toString());

    expect(
      response.body.data.tenant._id.toString()
    ).not.toBe(
      tenantB.tenant._id.toString()
    );
  });

  test("tenant A must not see tenant B categories", async () => {
    const tenantA =
      await createTenantOwner({
        email:
          "category-isolation-a@example.com",
        businessName:
          "Category Store A",
      });

    const tenantB =
      await createSecondTenantOwner();

    await request(app)
      .post("/api/v1/categories")
      .set(
        "Authorization",
        `Bearer ${tenantB.accessToken}`
      )
      .send({
        name: "Secret Tenant B Category",
      });

    const response = await request(app)
      .get("/api/v1/categories")
      .set(
        "Authorization",
        `Bearer ${tenantA.accessToken}`
      );

    expect(response.statusCode).toBe(
      200
    );

    expect(
      response.body.data.categories
    ).toHaveLength(0);
  });
});