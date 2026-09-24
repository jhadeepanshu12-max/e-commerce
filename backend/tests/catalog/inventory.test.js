const request = require("supertest");

const app = require("../../src/app");

const {
  createTenantOwner,
} = require("../helpers/testUtils");

describe("Inventory API", () => {
  const createProduct = async (
    accessToken
  ) => {
    const categoryResponse =
      await request(app)
        .post("/api/v1/categories")
        .set(
          "Authorization",
          `Bearer ${accessToken}`
        )
        .send({
          name: "Inventory Category",
        });

    expect(
      categoryResponse.statusCode
    ).toBe(201);

    const category =
      categoryResponse.body.data.category;

    const productResponse =
      await request(app)
        .post("/api/v1/products")
        .set(
          "Authorization",
          `Bearer ${accessToken}`
        )
        .send({
          name: "Inventory Test Product",
          categoryId: category._id,
          sku: `INV-${Date.now()}-${Math.random()}`,
          price: 1000,
          stockQuantity: 10,
          status: "ACTIVE",
        });

    expect(
      productResponse.statusCode
    ).toBe(201);

    return productResponse.body.data.product;
  };

  test("should add stock", async () => {
    const { accessToken } =
      await createTenantOwner({
        email: "stock-in@example.com",
        businessName: "Stock In Store",
      });

    const product =
      await createProduct(accessToken);

    const response = await request(app)
      .post("/api/v1/inventory/adjust")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        productId: product._id,
        type: "STOCK_IN",
        quantity: 15,
        reason: "New stock received",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.product.stockQuantity
    ).toBe(25);

    expect(
      response.body.data.transaction.type
    ).toBe("STOCK_IN");
  });

  test("should remove stock", async () => {
    const { accessToken } =
      await createTenantOwner({
        email: "stock-out@example.com",
        businessName: "Stock Out Store",
      });

    const product =
      await createProduct(accessToken);

    const response = await request(app)
      .post("/api/v1/inventory/adjust")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        productId: product._id,
        type: "STOCK_OUT",
        quantity: 4,
        reason: "Damaged stock",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.product.stockQuantity
    ).toBe(6);

    expect(
      response.body.data.transaction.type
    ).toBe("STOCK_OUT");
  });

  test("should reject stock removal when stock is insufficient", async () => {
    const { accessToken } =
      await createTenantOwner({
        email: "insufficient-stock@example.com",
        businessName: "Insufficient Stock Store",
      });

    const product =
      await createProduct(accessToken);

    const response = await request(app)
      .post("/api/v1/inventory/adjust")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        productId: product._id,
        type: "STOCK_OUT",
        quantity: 50,
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Insufficient stock"
    );
  });

  test("should return inventory history", async () => {
    const { accessToken } =
      await createTenantOwner({
        email: "inventory-history@example.com",
        businessName: "Inventory History Store",
      });

    const product =
      await createProduct(accessToken);

    await request(app)
      .post("/api/v1/inventory/adjust")
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      )
      .send({
        productId: product._id,
        type: "STOCK_IN",
        quantity: 10,
        reason: "Restock",
      });

    const response = await request(app)
      .get(
        `/api/v1/inventory/history?productId=${product._id}`
      )
      .set(
        "Authorization",
        `Bearer ${accessToken}`
      );

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.transactions
    ).toHaveLength(1);

    expect(
      response.body.data.transactions[0].quantity
    ).toBe(10);
  });

  test("should prevent one tenant from modifying another tenant's inventory", async () => {
    const tenantA =
      await createTenantOwner({
        email: "inventory-isolation-a@example.com",
        businessName: "Inventory Isolation A",
      });

    const tenantB =
      await createTenantOwner({
        email: "inventory-isolation-b@example.com",
        businessName: "Inventory Isolation B",
      });

    const productB =
      await createProduct(
        tenantB.accessToken
      );

    const response = await request(app)
      .post("/api/v1/inventory/adjust")
      .set(
        "Authorization",
        `Bearer ${tenantA.accessToken}`
      )
      .send({
        productId: productB._id,
        type: "STOCK_IN",
        quantity: 100,
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Product not found"
    );
  });
});