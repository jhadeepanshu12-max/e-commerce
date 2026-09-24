const request = require("supertest");

const app = require("../../src/app");

const {
  createTenantOwner,
} = require("../helpers/testUtils");

describe("Category API", () => {
  test("should create a category for authenticated tenant", async () => {
    const {
      accessToken,
      tenant,
    } = await createTenantOwner();

    const response = await request(app)
      .post("/api/v1/categories")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Electronics",
        description:
          "Electronic products",
        sortOrder: 1,
      });

    expect(response.statusCode).toBe(
      201
    );

    expect(response.body.success).toBe(
      true
    );

    expect(
      response.body.data.category.name
    ).toBe("Electronics");

    expect(
      response.body.data.category.tenantId.toString()
    ).toBe(tenant._id.toString());
  });

  test("should list only categories belonging to current tenant", async () => {
    const tenantA =
      await createTenantOwner({
        email: "tenant-a@example.com",
        businessName: "Tenant A",
      });

    const tenantB =
      await createTenantOwner({
        email: "tenant-b@example.com",
        businessName: "Tenant B",
      });

    await request(app)
      .post("/api/v1/categories")
      .set(
        "Authorization",
        `Bearer ${tenantA.accessToken}`
      )
      .send({
        name: "Tenant A Category",
      });

    await request(app)
      .post("/api/v1/categories")
      .set(
        "Authorization",
        `Bearer ${tenantB.accessToken}`
      )
      .send({
        name: "Tenant B Category",
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
    ).toHaveLength(1);

    expect(
      response.body.data.categories[0].name
    ).toBe("Tenant A Category");
  });
});