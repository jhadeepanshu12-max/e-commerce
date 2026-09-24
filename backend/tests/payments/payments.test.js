const request = require("supertest");

const app = require("../../src/app");

const Payment = require("../../src/modules/payments/payment.model");
const Order = require("../../src/modules/orders/order.model");
const Product = require("../../src/modules/catalog/product.model");
const ShippingZone = require("../../src/modules/shipping/shipping-zone.model");
const ShippingRate = require("../../src/modules/shipping/shipping-rate.model");

const {
  createTenantOwner,
} = require("../helpers/testUtils");

const createCustomer = async (
  tenantSlug,
  email = `payment-customer-${Date.now()}-${Math.random()}@example.com`
) => {
  const response = await request(app)
    .post("/api/v1/customer-auth/signup")
    .send({
      name: "Payment Customer",
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
      name: `Payment Category ${Date.now()}${Math.random()}`,
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
      name: `Payment Product ${Date.now()}${Math.random()}`,
      categoryId: category._id,
      sku: `PAYMENT-${Date.now()}-${Math.random()}`,
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
      description: "Default shipping zone for payment tests",
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
      description: "Flat shipping for payment tests",
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

const checkoutOrder = async (
  accessToken
) => {
  return request(app)
    .post("/api/v1/orders/checkout")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      shippingAddress: {
        fullName: "Payment Customer",
        phone: "9999999999",
        addressLine1:
          "123 Payment Street",
        city: "Noida",
        state: "Uttar Pradesh",
        postalCode: "201301",
        country: "India",
      },
    });
};

describe("Payment API", () => {
  test("should create a payment for customer's own order", async () => {
    const owner =
      await createTenantOwner({
        email:
          "payment-create-owner@example.com",
        businessName:
          "Payment Create Store",
      });

    const product =
      await createProduct({
        accessToken:
          owner.accessToken,
        price: 1500,
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

    const order =
      checkout.body.data.order;

    const response =
      await request(app)
        .post("/api/v1/payments")
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          orderId: order._id,
          provider: "RAZORPAY",
        });

    expect(response.statusCode).toBe(201);

    expect(
      response.body.success
    ).toBe(true);

    expect(
      response.body.data.payment.status
    ).toBe("PENDING");

    expect(
      response.body.data.payment.amount
    ).toBe(3050);

    expect(
      response.body.data.payment.currency
    ).toBe("INR");

    expect(
      response.body.data.payment.orderId
    ).toBe(order._id);
  });

  test("should return existing pending payment instead of creating duplicate payment", async () => {
    const owner =
      await createTenantOwner({
        email:
          "payment-duplicate-owner@example.com",
        businessName:
          "Payment Duplicate Store",
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

    const order =
      checkout.body.data.order;

    const first =
      await request(app)
        .post("/api/v1/payments")
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          orderId: order._id,
          provider: "RAZORPAY",
        });

    expect(first.statusCode).toBe(201);

    const second =
      await request(app)
        .post("/api/v1/payments")
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          orderId: order._id,
          provider: "RAZORPAY",
        });

    expect(second.statusCode).toBe(201);

    expect(
      second.body.data.payment._id
    ).toBe(
      first.body.data.payment._id
    );

    const paymentCount =
      await Payment.countDocuments({
        orderId: order._id,
      });

    expect(paymentCount).toBe(1);
  });

  test("should mark payment as processing", async () => {
    const owner =
      await createTenantOwner({
        email:
          "payment-processing-owner@example.com",
        businessName:
          "Payment Processing Store",
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

    const order =
      checkout.body.data.order;

    const createPayment =
      await request(app)
        .post("/api/v1/payments")
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          orderId: order._id,
          provider: "RAZORPAY",
        });

    expect(createPayment.statusCode).toBe(201);

    const paymentId =
      createPayment.body.data.payment._id;

    const response =
      await request(app)
        .patch(
          `/api/v1/payments/${paymentId}/processing`
        )
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        );

    expect(response.statusCode).toBe(200);

    expect(
      response.body.data.payment.status
    ).toBe("PROCESSING");
  });

  test("should mark payment as paid and confirm the order", async () => {
    const owner =
      await createTenantOwner({
        email:
          "payment-paid-owner@example.com",
        businessName:
          "Payment Paid Store",
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

    const order =
      checkout.body.data.order;

    const createPayment =
      await request(app)
        .post("/api/v1/payments")
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          orderId: order._id,
          provider: "RAZORPAY",
        });

    expect(createPayment.statusCode).toBe(201);

    const paymentId =
      createPayment.body.data.payment._id;

    const response =
      await request(app)
        .patch(
          `/api/v1/payments/${paymentId}/paid`
        )
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          providerPaymentId:
            "pay_test_123",
          method: "UPI",
        });

    expect(response.statusCode).toBe(200);

    expect(
      response.body.data.payment.status
    ).toBe("PAID");

    expect(
      response.body.data.payment.providerPaymentId
    ).toBe("pay_test_123");

    const updatedOrder =
      await Order.findById(
        order._id
      );

    expect(
      updatedOrder.paymentStatus
    ).toBe("PAID");

    expect(
      updatedOrder.status
    ).toBe("CONFIRMED");
  });

  test("should mark payment as failed", async () => {
    const owner =
      await createTenantOwner({
        email:
          "payment-failed-owner@example.com",
        businessName:
          "Payment Failed Store",
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

    const order =
      checkout.body.data.order;

    const createPayment =
      await request(app)
        .post("/api/v1/payments")
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          orderId: order._id,
          provider: "RAZORPAY",
        });

    expect(createPayment.statusCode).toBe(201);

    const paymentId =
      createPayment.body.data.payment._id;

    const response =
      await request(app)
        .patch(
          `/api/v1/payments/${paymentId}/failed`
        )
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          failureReason:
            "Insufficient funds",
        });

    expect(response.statusCode).toBe(200);

    expect(
      response.body.data.payment.status
    ).toBe("FAILED");

    expect(
      response.body.data.payment.failureReason
    ).toBe("Insufficient funds");
  });

  test("should prevent customer from creating payment for another customer's order", async () => {
    const owner =
      await createTenantOwner({
        email:
          "payment-security-owner@example.com",
        businessName:
          "Payment Security Store",
      });

    const product =
      await createProduct({
        accessToken:
          owner.accessToken,
      });

    const customerA =
      await createCustomer(
        owner.tenant.slug
      );

    const customerB =
      await createCustomer(
        owner.tenant.slug
      );

    await addProductToCart({
      accessToken:
        customerA.accessToken,
      productId: product._id,
    });

    const checkout =
      await checkoutOrder(
        customerA.accessToken
      );

    expect(checkout.statusCode).toBe(201);

    const order =
      checkout.body.data.order;

    const response =
      await request(app)
        .post("/api/v1/payments")
        .set(
          "Authorization",
          `Bearer ${customerB.accessToken}`
        )
        .send({
          orderId: order._id,
          provider: "RAZORPAY",
        });

    expect(response.statusCode).toBe(404);

    expect(
      response.body.success
    ).toBe(false);
  });

  test("should prevent tenant from accessing another tenant's payment", async () => {
    const ownerA =
      await createTenantOwner({
        email:
          "payment-isolation-a@example.com",
        businessName:
          "Payment Isolation A",
      });

    const ownerB =
      await createTenantOwner({
        email:
          "payment-isolation-b@example.com",
        businessName:
          "Payment Isolation B",
      });

    const product =
      await createProduct({
        accessToken:
          ownerA.accessToken,
      });

    const customer =
      await createCustomer(
        ownerA.tenant.slug
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

    const order =
      checkout.body.data.order;

    const createPayment =
      await request(app)
        .post("/api/v1/payments")
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          orderId: order._id,
          provider: "RAZORPAY",
        });

    expect(
      createPayment.statusCode
    ).toBe(201);

    const paymentId =
      createPayment.body.data.payment._id;

    const response =
      await request(app)
        .get(
          `/api/v1/payments/admin/${paymentId}`
        )
        .set(
          "Authorization",
          `Bearer ${ownerB.accessToken}`
        );

    expect(response.statusCode).toBe(404);

    expect(
      response.body.success
    ).toBe(false);
  });

  test("should list customer's payments", async () => {
    const owner =
      await createTenantOwner({
        email:
          "payment-list-owner@example.com",
        businessName:
          "Payment List Store",
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

    const order =
      checkout.body.data.order;

    const payment =
      await request(app)
        .post("/api/v1/payments")
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          orderId: order._id,
          provider: "RAZORPAY",
        });

    expect(payment.statusCode).toBe(201);

    const response =
      await request(app)
        .get(
          "/api/v1/payments/my-payments"
        )
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        );

    expect(response.statusCode).toBe(200);

    expect(
      response.body.success
    ).toBe(true);

    expect(
      response.body.data
    ).toHaveLength(1);

    expect(
      response.body.pagination.total
    ).toBe(1);
  });
});