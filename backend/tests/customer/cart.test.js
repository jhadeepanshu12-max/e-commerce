const request = require("supertest");

const app = require("../../src/app");

const {
  createTenantOwner,
} = require("../helpers/testUtils");

const createCustomer = async (
  tenantSlug,
  email = `customer-${Date.now()}-${Math.random()}@example.com`
) => {
  const response = await request(app)
    .post(
      "/api/v1/customer-auth/signup"
    )
    .send({
      name: "Cart Customer",
      email,
      password:
        "CustomerPass123",
      tenantSlug,
    });

  expect(response.statusCode).toBe(
    201
  );

  return response.body.data;
};

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
        name: "Cart Category",
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
        name: "Cart Product",
        categoryId: category._id,
        sku: `CART-${Date.now()}-${Math.random()}`,
        price: 1000,
        stockQuantity: 20,
        status: "ACTIVE",
      });

  expect(
    productResponse.statusCode
  ).toBe(201);

  return productResponse.body.data.product;
};

describe("Cart API", () => {
  test("should create an empty cart", async () => {
    const owner =
      await createTenantOwner({
        email:
          "cart-empty-owner@example.com",
        businessName:
          "Cart Empty Store",
      });

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    const response = await request(app)
      .get("/api/v1/cart")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      );

    expect(response.statusCode).toBe(
      200
    );

    expect(
      response.body.data.cart.items
    ).toHaveLength(0);

    expect(
      response.body.data.cart.subtotal
    ).toBe(0);

    expect(
      response.body.data.cart.itemCount
    ).toBe(0);
  });

  test("should add product to cart", async () => {
    const owner =
      await createTenantOwner({
        email:
          "cart-add-owner@example.com",
        businessName:
          "Cart Add Store",
      });

    const product =
      await createProduct(
        owner.accessToken
      );

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    const response = await request(app)
      .post("/api/v1/cart/items")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        productId: product._id,
        quantity: 2,
      });

    expect(response.statusCode).toBe(
      200
    );

    expect(
      response.body.data.cart.items
    ).toHaveLength(1);

    expect(
      response.body.data.cart.items[0]
        .quantity
    ).toBe(2);

    expect(
      response.body.data.cart.subtotal
    ).toBe(2000);
  });

  test("should increase quantity when adding the same product again", async () => {
    const owner =
      await createTenantOwner({
        email:
          "cart-merge-owner@example.com",
        businessName:
          "Cart Merge Store",
      });

    const product =
      await createProduct(
        owner.accessToken
      );

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    const auth = {
      Authorization: `Bearer ${customer.accessToken}`,
    };

    await request(app)
      .post("/api/v1/cart/items")
      .set(auth)
      .send({
        productId: product._id,
        quantity: 2,
      });

    const response = await request(app)
      .post("/api/v1/cart/items")
      .set(auth)
      .send({
        productId: product._id,
        quantity: 3,
      });

    expect(response.statusCode).toBe(
      200
    );

    expect(
      response.body.data.cart.items
    ).toHaveLength(1);

    expect(
      response.body.data.cart.items[0]
        .quantity
    ).toBe(5);

    expect(
      response.body.data.cart.subtotal
    ).toBe(5000);
  });

  test("should reject quantity above available stock", async () => {
    const owner =
      await createTenantOwner({
        email:
          "cart-stock-owner@example.com",
        businessName:
          "Cart Stock Store",
      });

    const product =
      await createProduct(
        owner.accessToken
      );

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    const response = await request(app)
      .post("/api/v1/cart/items")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        productId: product._id,
        quantity: 21,
      });

    expect(response.statusCode).toBe(
      409
    );

    expect(
      response.body.success
    ).toBe(false);
  });

  test("should prevent customer from accessing another tenant's product", async () => {
    const tenantA =
      await createTenantOwner({
        email:
          "cart-isolation-a-owner@example.com",
        businessName:
          "Cart Isolation A",
      });

    const tenantB =
      await createTenantOwner({
        email:
          "cart-isolation-b-owner@example.com",
        businessName:
          "Cart Isolation B",
      });

    const productB =
      await createProduct(
        tenantB.accessToken
      );

    const customerA =
      await createCustomer(
        tenantA.tenant.slug
      );

    const response = await request(app)
      .post("/api/v1/cart/items")
      .set(
        "Authorization",
        `Bearer ${customerA.accessToken}`
      )
      .send({
        productId: productB._id,
        quantity: 1,
      });

    expect(response.statusCode).toBe(
      404
    );

    expect(
      response.body.success
    ).toBe(false);
  });

  test("should update and remove cart item", async () => {
    const owner =
      await createTenantOwner({
        email:
          "cart-update-owner@example.com",
        businessName:
          "Cart Update Store",
      });

    const product =
      await createProduct(
        owner.accessToken
      );

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    const auth = {
      Authorization: `Bearer ${customer.accessToken}`,
    };

    const addResponse =
      await request(app)
        .post("/api/v1/cart/items")
        .set(auth)
        .send({
          productId: product._id,
          quantity: 2,
        });

    const item =
      addResponse.body.data.cart.items[0];

    const updateResponse =
      await request(app)
        .patch(
          `/api/v1/cart/items/${item._id}`
        )
        .set(auth)
        .send({
          quantity: 5,
        });

    expect(
      updateResponse.statusCode
    ).toBe(200);

    expect(
      updateResponse.body.data.cart.items[0]
        .quantity
    ).toBe(5);

    const deleteResponse =
      await request(app)
        .delete(
          `/api/v1/cart/items/${item._id}`
        )
        .set(auth);

    expect(
      deleteResponse.statusCode
    ).toBe(200);

    expect(
      deleteResponse.body.data.cart.items
    ).toHaveLength(0);
  });
});