const request = require("supertest");

const app = require("../../src/app");

const Product = require("../../src/modules/catalog/product.model");
const Order = require("../../src/modules/orders/order.model");
const InventoryTransaction = require("../../src/modules/catalog/inventory.model");
const ShippingZone = require("../../src/modules/shipping/shipping-zone.model");
const ShippingRate = require("../../src/modules/shipping/shipping-rate.model");

const {
  createTenantOwner,
} = require("../helpers/testUtils");

const createCustomer = async (
  tenantSlug,
  email = `order-customer-${Date.now()}-${Math.random()}@example.com`
) => {
  const response = await request(app)
    .post("/api/v1/customer-auth/signup")
    .send({
      name: "Order Customer",
      email,
      password: "CustomerPass123",
      tenantSlug,
    });

  expect(response.statusCode).toBe(201);

  return response.body.data;
};

const createProduct = async ({
  accessToken,
  stockQuantity = 20,
  price = 1000,
}) => {
  const categoryResponse = await request(app)
    .post("/api/v1/categories")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name: `Order Category ${Date.now()}${Math.random()}`,
    });

  expect(categoryResponse.statusCode).toBe(201);

  const category =
    categoryResponse.body.data.category;

  const response = await request(app)
    .post("/api/v1/products")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name: `Order Product ${Date.now()}${Math.random()}`,
      categoryId: category._id,
      sku: `ORDER-${Date.now()}-${Math.random()}`,
      price,
      stockQuantity,
      status: "ACTIVE",
    });

  expect(response.statusCode).toBe(201);

  const product = response.body.data.product;

  const storedProduct = await Product.findById(
    product._id
  ).select("tenantId");

  const tenantId =
    product.tenantId || storedProduct.tenantId;

  let shippingZone = await ShippingZone.findOne({
    tenantId,
    name: "Test Shipping Zone",
  });

  if (!shippingZone) {
    shippingZone = await ShippingZone.create({
      tenantId,
      name: "Test Shipping Zone",
      description: "Default shipping zone for order tests",
      countries: ["INDIA"],
      states: ["UTTAR PRADESH"],
      cities: ["NOIDA"],
      postalCodes: ["201301"],
      priority: 100,
      isActive: true,
    });
  }

  const existingRate = await ShippingRate.findOne({
    tenantId,
    zoneId: shippingZone._id,
    name: "Test Flat Shipping",
  });

  if (!existingRate) {
    await ShippingRate.create({
      tenantId,
      zoneId: shippingZone._id,
      name: "Test Flat Shipping",
      description: "Flat shipping for order tests",
      method: "FLAT",
      amount: 50,
      minimumOrderValue: 0,
      estimatedDeliveryMinDays: 2,
      estimatedDeliveryMaxDays: 5,
      sortOrder: 1,
      isActive: true,
    });
  }

  return product;
};

const addProductToCart = async ({
  accessToken,
  productId,
  quantity = 1,
}) => {
  const response = await request(app)
    .post("/api/v1/cart/items")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      productId,
      quantity,
    });

  expect(response.statusCode).toBe(200);

  return response;
};

const shippingAddress = {
  fullName: "Order Customer",
  phone: "9999999999",
  addressLine1: "123 Test Street",
  city: "Noida",
  state: "Uttar Pradesh",
  postalCode: "201301",
  country: "India",
};

const checkoutOrder = async (accessToken) => {
  return request(app)
    .post("/api/v1/orders/checkout")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      shippingAddress,
    });
};

describe("Order API", () => {
  test("should create an order from the customer's cart", async () => {
    const owner =
      await createTenantOwner({
        email:
          "order-create-owner@example.com",
        businessName:
          "Order Create Store",
      });

    const product =
      await createProduct({
        accessToken:
          owner.accessToken,
        stockQuantity: 20,
        price: 1000,
      });

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    await addProductToCart({
      accessToken:
        customer.accessToken,
      productId: product._id,
      quantity: 2,
    });

    const response =
      await checkoutOrder(
        customer.accessToken
      );

    expect(response.statusCode).toBe(201);

    expect(
      response.body.data.order.status
    ).toBe("PENDING_PAYMENT");

    expect(
      response.body.data.order.subtotal
    ).toBe(2000);

    expect(
      response.body.data.order.taxAmount
    ).toBe(0);

    expect(
      response.body.data.order.shippingAmount
    ).toBe(50);

    expect(
      response.body.data.order.totalAmount
    ).toBe(2050);

    const updatedProduct =
      await Product.findById(
        product._id
      );

    expect(
      updatedProduct.reservedQuantity
    ).toBe(2);

    expect(
      updatedProduct.stockQuantity
    ).toBe(20);
  });

  test("should cancel an order and release reserved inventory", async () => {
    const owner =
      await createTenantOwner({
        email:
          "order-cancel-owner@example.com",
        businessName:
          "Order Cancel Store",
      });

    const product =
      await createProduct({
        accessToken:
          owner.accessToken,
        stockQuantity: 10,
      });

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    await addProductToCart({
      accessToken:
        customer.accessToken,
      productId: product._id,
      quantity: 3,
    });

    const checkout =
      await checkoutOrder(
        customer.accessToken
      );

    expect(checkout.statusCode).toBe(201);

    const orderId =
      checkout.body.data.order._id;

    const beforeCancel =
      await Product.findById(
        product._id
      );

    expect(
      beforeCancel.reservedQuantity
    ).toBe(3);

    const cancel =
      await request(app)
        .patch(
          `/api/v1/orders/my-orders/${orderId}/cancel`
        )
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        );

    expect(cancel.statusCode).toBe(200);

    expect(
      cancel.body.data.order.status
    ).toBe("CANCELLED");

    const afterCancel =
      await Product.findById(
        product._id
      );

    expect(
      afterCancel.reservedQuantity
    ).toBe(0);

    expect(
      afterCancel.stockQuantity
    ).toBe(10);

    const releaseTransaction =
      await InventoryTransaction.findOne({
        productId: product._id,
        type: "RELEASE",
      });

    expect(
      releaseTransaction
    ).toBeTruthy();

    expect(
      releaseTransaction.quantity
    ).toBe(3);
  });

  test("should reject cancellation after shipping", async () => {
    const owner =
      await createTenantOwner({
        email:
          "order-shipping-cancel-owner@example.com",
        businessName:
          "Order Shipping Cancel Store",
      });

    const product =
      await createProduct({
        accessToken:
          owner.accessToken,
        stockQuantity: 10,
      });

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    await addProductToCart({
      accessToken:
        customer.accessToken,
      productId: product._id,
      quantity: 2,
    });

    const checkout =
      await checkoutOrder(
        customer.accessToken
      );

    expect(checkout.statusCode).toBe(201);

    const orderId =
      checkout.body.data.order._id;

    const confirm =
      await request(app)
        .patch(
          `/api/v1/orders/admin/${orderId}/status`
        )
        .set(
          "Authorization",
          `Bearer ${owner.accessToken}`
        )
        .send({
          status: "CONFIRMED",
        });

    expect(confirm.statusCode).toBe(200);

    const processing =
      await request(app)
        .patch(
          `/api/v1/orders/admin/${orderId}/status`
        )
        .set(
          "Authorization",
          `Bearer ${owner.accessToken}`
        )
        .send({
          status: "PROCESSING",
        });

    expect(
      processing.statusCode
    ).toBe(200);

    const shipped =
      await request(app)
        .patch(
          `/api/v1/orders/admin/${orderId}/status`
        )
        .set(
          "Authorization",
          `Bearer ${owner.accessToken}`
        )
        .send({
          status: "SHIPPED",
        });

    expect(
      shipped.statusCode
    ).toBe(200);

    const cancel =
      await request(app)
        .patch(
          `/api/v1/orders/my-orders/${orderId}/cancel`
        )
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        );

    expect(cancel.statusCode).toBe(409);
  });

  test("should consume reserved inventory when order is shipped", async () => {
    const owner =
      await createTenantOwner({
        email:
          "order-ship-inventory-owner@example.com",
        businessName:
          "Order Ship Inventory Store",
      });

    const product =
      await createProduct({
        accessToken:
          owner.accessToken,
        stockQuantity: 10,
      });

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    await addProductToCart({
      accessToken:
        customer.accessToken,
      productId: product._id,
      quantity: 4,
    });

    const checkout =
      await checkoutOrder(
        customer.accessToken
      );

    expect(checkout.statusCode).toBe(201);

    const orderId =
      checkout.body.data.order._id;

    const confirm =
      await request(app)
        .patch(
          `/api/v1/orders/admin/${orderId}/status`
        )
        .set(
          "Authorization",
          `Bearer ${owner.accessToken}`
        )
        .send({
          status: "CONFIRMED",
        });

    expect(confirm.statusCode).toBe(200);

    const processing =
      await request(app)
        .patch(
          `/api/v1/orders/admin/${orderId}/status`
        )
        .set(
          "Authorization",
          `Bearer ${owner.accessToken}`
        )
        .send({
          status: "PROCESSING",
        });

    expect(
      processing.statusCode
    ).toBe(200);

    const shipped =
      await request(app)
        .patch(
          `/api/v1/orders/admin/${orderId}/status`
        )
        .set(
          "Authorization",
          `Bearer ${owner.accessToken}`
        )
        .send({
          status: "SHIPPED",
        });

    expect(
      shipped.statusCode
    ).toBe(200);

    const updatedProduct =
      await Product.findById(
        product._id
      );

    expect(
      updatedProduct.stockQuantity
    ).toBe(6);

    expect(
      updatedProduct.reservedQuantity
    ).toBe(0);

    const transaction =
      await InventoryTransaction.findOne({
        productId: product._id,
        type: "COMMIT_RESERVATION",
      });

    expect(transaction).toBeTruthy();

    expect(transaction.quantity).toBe(4);
  });

  test("should reject invalid order status transition", async () => {
    const owner =
      await createTenantOwner({
        email:
          "order-transition-owner@example.com",
        businessName:
          "Order Transition Store",
      });

    const product =
      await createProduct({
        accessToken:
          owner.accessToken,
      });

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    await addProductToCart({
      accessToken:
        customer.accessToken,
      productId: product._id,
    });

    const checkout =
      await checkoutOrder(
        customer.accessToken
      );

    expect(checkout.statusCode).toBe(201);

    const orderId =
      checkout.body.data.order._id;

    const response =
      await request(app)
        .patch(
          `/api/v1/orders/admin/${orderId}/status`
        )
        .set(
          "Authorization",
          `Bearer ${owner.accessToken}`
        )
        .send({
          status: "DELIVERED",
        });

    expect(
      response.statusCode
    ).toBe(409);

    expect(
      response.body.success
    ).toBe(false);
  });

  test("should allow tenant owner to list only their tenant orders", async () => {
    const ownerA =
      await createTenantOwner({
        email:
          "order-admin-isolation-a@example.com",
        businessName:
          "Order Admin Isolation A",
      });

    const ownerB =
      await createTenantOwner({
        email:
          "order-admin-isolation-b@example.com",
        businessName:
          "Order Admin Isolation B",
      });

    const productB =
      await createProduct({
        accessToken:
          ownerB.accessToken,
      });

    const customerB =
      await createCustomer(
        ownerB.tenant.slug
      );

    await addProductToCart({
      accessToken:
        customerB.accessToken,
      productId: productB._id,
    });

    const checkout =
      await checkoutOrder(
        customerB.accessToken
      );

    expect(checkout.statusCode).toBe(201);

    const response =
      await request(app)
        .get("/api/v1/orders/admin")
        .set(
          "Authorization",
          `Bearer ${ownerA.accessToken}`
        );

    expect(response.statusCode).toBe(200);

    expect(
      response.body.data.orders
    ).toHaveLength(0);
  });

  test("should allow tenant owner to view and update their order", async () => {
    const owner =
      await createTenantOwner({
        email:
          "order-admin-owner@example.com",
        businessName:
          "Order Admin Store",
      });

    const product =
      await createProduct({
        accessToken:
          owner.accessToken,
      });

    const customer =
      await createCustomer(
        owner.tenant.slug
      );

    await addProductToCart({
      accessToken:
        customer.accessToken,
      productId: product._id,
    });

    const checkout =
      await checkoutOrder(
        customer.accessToken
      );

    expect(checkout.statusCode).toBe(201);

    const orderId =
      checkout.body.data.order._id;

    const details =
      await request(app)
        .get(
          `/api/v1/orders/admin/${orderId}`
        )
        .set(
          "Authorization",
          `Bearer ${owner.accessToken}`
        );

    expect(details.statusCode).toBe(200);

    expect(
      details.body.data.order._id
    ).toBe(orderId);

    const update =
      await request(app)
        .patch(
          `/api/v1/orders/admin/${orderId}/status`
        )
        .set(
          "Authorization",
          `Bearer ${owner.accessToken}`
        )
        .send({
          status: "CONFIRMED",
        });

    expect(update.statusCode).toBe(200);

    expect(
      update.body.data.order.status
    ).toBe("CONFIRMED");
  });
});