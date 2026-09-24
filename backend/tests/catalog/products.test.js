const request = require("supertest");

const app = require("../../src/app");

const {
  createTenantOwner,
} = require("../helpers/testUtils");

describe("Product API", () => {
  const createCategory = async (accessToken) => {
    const response = await request(app)
      .post("/api/v1/categories")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Electronics",
      });

    expect(response.statusCode).toBe(201);

    return response.body.data.category;
  };

  test("should create a product for the current tenant", async () => {
    const { accessToken, tenant } =
      await createTenantOwner({
        email: "product-create@example.com",
        businessName: "Product Store",
      });

    const category =
      await createCategory(accessToken);

    const response = await request(app)
      .post("/api/v1/products")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Wireless Headphones",
        categoryId: category._id,
        description:
          "Premium wireless headphones",
        sku: "WH-TEST-001",
        price: 4999,
        compareAtPrice: 5999,
        stockQuantity: 25,
        status: "ACTIVE",
        attributes: {
          brand: "Nova",
          color: "Black",
        },
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.product.name
    ).toBe("Wireless Headphones");

    expect(
      response.body.data.product.tenantId.toString()
    ).toBe(tenant._id.toString());

    expect(
      response.body.data.product.stockQuantity
    ).toBe(25);
  });

  test("should list products belonging to the current tenant", async () => {
    const { accessToken } =
      await createTenantOwner({
        email: "product-list@example.com",
        businessName: "Product List Store",
      });

    const category =
      await createCategory(accessToken);

    await request(app)
      .post("/api/v1/products")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Gaming Mouse",
        categoryId: category._id,
        sku: "GM-TEST-001",
        price: 1999,
        stockQuantity: 10,
        status: "ACTIVE",
      });

    const response = await request(app)
      .get("/api/v1/products")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      );

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.products
    ).toHaveLength(1);

    expect(
      response.body.data.products[0].name
    ).toBe("Gaming Mouse");
  });

  test("should search products by name", async () => {
    const { accessToken } =
      await createTenantOwner({
        email: "product-search@example.com",
        businessName: "Search Store",
      });

    const category =
      await createCategory(accessToken);

    await request(app)
      .post("/api/v1/products")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Premium Keyboard",
        categoryId: category._id,
        sku: "KEY-TEST-001",
        price: 2999,
        status: "ACTIVE",
      });

    await request(app)
      .post("/api/v1/products")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        name: "Office Chair",
        categoryId: category._id,
        sku: "CHAIR-TEST-001",
        price: 7999,
        status: "ACTIVE",
      });

    const response = await request(app)
      .get(
        "/api/v1/products?search=keyboard"
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      );

    expect(response.statusCode).toBe(200);

    expect(
      response.body.data.products
    ).toHaveLength(1);

    expect(
      response.body.data.products[0].name
    ).toBe("Premium Keyboard");
  });

  test("should prevent one tenant from seeing another tenant's products", async () => {
    const tenantA =
      await createTenantOwner({
        email: "product-isolation-a@example.com",
        businessName: "Product Isolation A",
      });

    const tenantB =
      await createTenantOwner({
        email: "product-isolation-b@example.com",
        businessName: "Product Isolation B",
      });

    const categoryB =
      await createCategory(
        tenantB.accessToken
      );

    await request(app)
      .post("/api/v1/products")
      .set(
        "Authorization",
        `Bearer ${tenantB.accessToken}`
      )
      .send({
        name: "Private Tenant B Product",
        categoryId: categoryB._id,
        sku: "PRIVATE-B-001",
        price: 1000,
        status: "ACTIVE",
      });

    const response = await request(app)
      .get("/api/v1/products")
      .set(
        "Authorization",
        `Bearer ${tenantA.accessToken}`
      );

    expect(response.statusCode).toBe(200);

    expect(
      response.body.data.products
    ).toHaveLength(0);
  });
});