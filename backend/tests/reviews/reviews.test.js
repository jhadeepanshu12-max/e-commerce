const request = require("supertest");

const app = require("../../src/app");

const Review = require("../../src/modules/reviews/review.model");

const ShippingZone = require("../../src/modules/shipping/shipping-zone.model");
const ShippingRate = require("../../src/modules/shipping/shipping-rate.model");

const {
  createTenantOwner,
} = require("../helpers/testUtils");

const getCustomerId = (customer) => {
  return (
    customer?._id ||
    customer?.user?._id ||
    customer?.user?.id ||
    customer?.id
  );
};

const createCustomer = async (
  tenantSlug,
  email = `review-customer-${Date.now()}-${Math.random()}@example.com`
) => {
  const response = await request(app)
    .post(
      "/api/v1/customer-auth/signup"
    )
    .send({
      name: "Review Customer",
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
  const categoryResponse = await request(
    app
  )
    .post("/api/v1/categories")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name: `Review Category ${Date.now()}${Math.random()}`,
    });

  expect(
    categoryResponse.statusCode
  ).toBe(201);

  const category =
    categoryResponse.body.data.category;

  const response = await request(app)
    .post("/api/v1/products")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name: `Review Product ${Date.now()}${Math.random()}`,
      categoryId: category._id,
      sku: `REVIEW-${Date.now()}-${Math.random()}`,
      price,
      stockQuantity,
      status: "ACTIVE",
    });

  expect(response.statusCode).toBe(201);

  const product =
    response.body.data.product;

  const tenantId =
    product.tenantId || category.tenantId;

  expect(tenantId).toBeDefined();

  const shippingZone =
    await ShippingZone.create({
      tenantId,
      name: `Review Shipping Zone ${Date.now()}${Math.random()}`,
      description:
        "Shipping zone for review tests",
      countries: ["IN"],
      states: ["UTTAR PRADESH"],
      cities: ["NOIDA"],
      postalCodes: ["201301"],
      priority: 100,
      isActive: true,
    });

  await ShippingRate.create({
    tenantId,
    zoneId: shippingZone._id,
    name: `Review Flat Shipping ${Date.now()}${Math.random()}`,
    description:
      "Flat shipping for review tests",
    method: "FLAT",
    amount: 50,
    minimumOrderValue: 0,
    estimatedDeliveryMinDays: 2,
    estimatedDeliveryMaxDays: 5,
    sortOrder: 1,
    isActive: true,
  });

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

const createOrder = async ({
  customerToken,
  productId,
  quantity = 1,
}) => {
  await addProductToCart({
    accessToken: customerToken,
    productId,
    quantity,
  });

  const response = await request(app)
    .post("/api/v1/orders/checkout")
    .set(
      "Authorization",
      `Bearer ${customerToken}`
    )
    .send({
      shippingAddress: {
        fullName: "Review Customer",
        phone: "9999999999",
        addressLine1: "123 Test Street",
        city: "Noida",
        state: "Uttar Pradesh",
        postalCode: "201301",
        country: "IN",
      },
    });

  expect(response.statusCode).toBe(201);

  return response.body.data.order;
};

const markOrderDelivered = async ({
  ownerToken,
  orderId,
}) => {
  const transitions = [
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
  ];

  let response = null;

  for (const status of transitions) {
    response = await request(app)
      .patch(
        `/api/v1/orders/admin/${orderId}/status`
      )
      .set(
        "Authorization",
        `Bearer ${ownerToken}`
      )
      .send({
        status,
      });

    expect(response.statusCode).toBe(200);
  }

  return response.body.data.order;
};

describe("Review API", () => {
  test("should allow a customer to review a delivered purchased product", async () => {
    const owner = await createTenantOwner({
      email:
        "review-create-owner@example.com",
      businessName:
        "Review Create Store",
    });

    const product = await createProduct({
      accessToken: owner.accessToken,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const customerId =
      getCustomerId(customer);

    expect(customerId).toBeDefined();

    const order = await createOrder({
      customerToken:
        customer.accessToken,
      productId: product._id,
    });

    await markOrderDelivered({
      ownerToken: owner.accessToken,
      orderId: order._id,
    });

    const response = await request(app)
      .post("/api/v1/reviews")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        productId: product._id,
        orderId: order._id,
        rating: 5,
        title: "Excellent product",
        comment:
          "Very good quality and fast delivery.",
      });

    expect(response.statusCode).toBe(201);

    expect(
      response.body.review.productId
    ).toBe(product._id);

    expect(
      String(
        response.body.review.customerId
      )
    ).toBe(String(customerId));

    expect(
      String(
        response.body.review.orderId
      )
    ).toBe(String(order._id));

    expect(
      response.body.review.rating
    ).toBe(5);

    expect(
      response.body.review.verifiedPurchase
    ).toBe(true);

    expect(
      response.body.review.status
    ).toBe("PUBLISHED");
  });

  test("should reject a review before the order is delivered", async () => {
    const owner = await createTenantOwner({
      email:
        "review-pending-owner@example.com",
      businessName:
        "Review Pending Store",
    });

    const product = await createProduct({
      accessToken: owner.accessToken,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const order = await createOrder({
      customerToken:
        customer.accessToken,
      productId: product._id,
    });

    const response = await request(app)
      .post("/api/v1/reviews")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        productId: product._id,
        orderId: order._id,
        rating: 4,
        comment: "Trying too early.",
      });

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);
  });

  test("should reject a review when the customer did not purchase the product", async () => {
    const owner = await createTenantOwner({
      email:
        "review-not-purchased-owner@example.com",
      businessName:
        "Review Not Purchased Store",
    });

    const productA = await createProduct({
      accessToken: owner.accessToken,
    });

    const productB = await createProduct({
      accessToken: owner.accessToken,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const order = await createOrder({
      customerToken:
        customer.accessToken,
      productId: productA._id,
    });

    await markOrderDelivered({
      ownerToken: owner.accessToken,
      orderId: order._id,
    });

    const response = await request(app)
      .post("/api/v1/reviews")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        productId: productB._id,
        orderId: order._id,
        rating: 4,
        comment:
          "I did not purchase this.",
      });

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);
  });

  test("should prevent duplicate reviews for the same product", async () => {
    const owner = await createTenantOwner({
      email:
        "review-duplicate-owner@example.com",
      businessName:
        "Review Duplicate Store",
    });

    const product = await createProduct({
      accessToken: owner.accessToken,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const customerId =
      getCustomerId(customer);

    expect(customerId).toBeDefined();

    const order = await createOrder({
      customerToken:
        customer.accessToken,
      productId: product._id,
    });

    await markOrderDelivered({
      ownerToken: owner.accessToken,
      orderId: order._id,
    });

    const first = await request(app)
      .post("/api/v1/reviews")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        productId: product._id,
        orderId: order._id,
        rating: 5,
        comment: "First review.",
      });

    expect(first.statusCode).toBe(201);

    const second = await request(app)
      .post("/api/v1/reviews")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        productId: product._id,
        orderId: order._id,
        rating: 3,
        comment: "Second review.",
      });

    expect(second.statusCode).toBe(409);

    expect(second.body.success).toBe(false);

    const count =
      await Review.countDocuments({
        tenantId:
          owner.tenant._id,
        productId: product._id,
        customerId,
      });

    expect(count).toBe(1);
  });

  test("should reject ratings outside the 1 to 5 range", async () => {
    const owner = await createTenantOwner({
      email:
        "review-rating-owner@example.com",
      businessName:
        "Review Rating Store",
    });

    const product = await createProduct({
      accessToken: owner.accessToken,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const order = await createOrder({
      customerToken:
        customer.accessToken,
      productId: product._id,
    });

    await markOrderDelivered({
      ownerToken: owner.accessToken,
      orderId: order._id,
    });

    const response = await request(app)
      .post("/api/v1/reviews")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        productId: product._id,
        orderId: order._id,
        rating: 6,
        comment: "Invalid rating.",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.success).toBe(false);
  });

  test("should return product reviews with rating summary", async () => {
    const owner = await createTenantOwner({
      email:
        "review-summary-owner@example.com",
      businessName:
        "Review Summary Store",
    });

    const product = await createProduct({
      accessToken: owner.accessToken,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const order = await createOrder({
      customerToken:
        customer.accessToken,
      productId: product._id,
    });

    await markOrderDelivered({
      ownerToken: owner.accessToken,
      orderId: order._id,
    });

    const createReview =
      await request(app)
        .post("/api/v1/reviews")
        .set(
          "Authorization",
          `Bearer ${customer.accessToken}`
        )
        .send({
          productId: product._id,
          orderId: order._id,
          rating: 4,
          title: "Good",
          comment: "Good product.",
        });

    expect(
      createReview.statusCode
    ).toBe(201);

    const response = await request(app)
      .get(
        `/api/v1/reviews/product/${product._id}`
      )
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      );

    expect(response.statusCode).toBe(200);

    expect(
      response.body.summary.totalReviews
    ).toBe(1);

    expect(
      response.body.summary.averageRating
    ).toBe(4);

    expect(
      response.body.summary.distribution[4]
    ).toBe(1);

    expect(
      response.body.reviews
    ).toHaveLength(1);
  });

  test("should allow customer to update their own review", async () => {
    const owner = await createTenantOwner({
      email:
        "review-update-owner@example.com",
      businessName:
        "Review Update Store",
    });

    const product = await createProduct({
      accessToken: owner.accessToken,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const order = await createOrder({
      customerToken:
        customer.accessToken,
      productId: product._id,
    });

    await markOrderDelivered({
      ownerToken: owner.accessToken,
      orderId: order._id,
    });

    const created = await request(app)
      .post("/api/v1/reviews")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        productId: product._id,
        orderId: order._id,
        rating: 3,
        title: "Okay",
        comment: "Original review.",
      });

    expect(created.statusCode).toBe(201);

    const reviewId =
      created.body.review._id;

    const response = await request(app)
      .patch(
        `/api/v1/reviews/${reviewId}`
      )
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        rating: 5,
        title: "Updated",
        comment: "Much better after update.",
      });

    expect(response.statusCode).toBe(200);

    expect(
      response.body.review.rating
    ).toBe(5);

    expect(
      response.body.review.title
    ).toBe("Updated");

    expect(
      response.body.review.comment
    ).toBe(
      "Much better after update."
    );

    expect(
      response.body.review.status
    ).toBe("PENDING");
  });

  test("should allow customer to delete their own review", async () => {
    const owner = await createTenantOwner({
      email:
        "review-delete-owner@example.com",
      businessName:
        "Review Delete Store",
    });

    const product = await createProduct({
      accessToken: owner.accessToken,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const order = await createOrder({
      customerToken:
        customer.accessToken,
      productId: product._id,
    });

    await markOrderDelivered({
      ownerToken: owner.accessToken,
      orderId: order._id,
    });

    const created = await request(app)
      .post("/api/v1/reviews")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        productId: product._id,
        orderId: order._id,
        rating: 5,
        comment: "Delete me.",
      });

    expect(created.statusCode).toBe(201);

    const reviewId =
      created.body.review._id;

    const response = await request(app)
      .delete(
        `/api/v1/reviews/${reviewId}`
      )
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      );

    expect(response.statusCode).toBe(200);

    const deleted =
      await Review.findById(reviewId);

    expect(deleted).toBeNull();
  });

  test("should prevent a customer from accessing another customer's review", async () => {
    const owner = await createTenantOwner({
      email:
        "review-customer-isolation-owner@example.com",
      businessName:
        "Review Customer Isolation Store",
    });

    const product = await createProduct({
      accessToken: owner.accessToken,
    });

    const customerA = await createCustomer(
      owner.tenant.slug
    );

    const customerB = await createCustomer(
      owner.tenant.slug,
      `review-customer-b-${Date.now()}-${Math.random()}@example.com`
    );

    const order = await createOrder({
      customerToken:
        customerA.accessToken,
      productId: product._id,
    });

    await markOrderDelivered({
      ownerToken: owner.accessToken,
      orderId: order._id,
    });

    const created = await request(app)
      .post("/api/v1/reviews")
      .set(
        "Authorization",
        `Bearer ${customerA.accessToken}`
      )
      .send({
        productId: product._id,
        orderId: order._id,
        rating: 5,
        comment: "Customer A review.",
      });

    expect(created.statusCode).toBe(201);

    const reviewId =
      created.body.review._id;

    const response = await request(app)
      .patch(
        `/api/v1/reviews/${reviewId}`
      )
      .set(
        "Authorization",
        `Bearer ${customerB.accessToken}`
      )
      .send({
        rating: 1,
        comment: "Trying to modify.",
      });

    expect(response.statusCode).toBe(404);

    expect(response.body.success).toBe(false);
  });

  test("should enforce tenant isolation for reviews and admin moderation", async () => {
    const ownerA = await createTenantOwner({
      email:
        "review-tenant-a-owner@example.com",
      businessName:
        "Review Tenant A Store",
    });

    const ownerB = await createTenantOwner({
      email:
        "review-tenant-b-owner@example.com",
      businessName:
        "Review Tenant B Store",
    });

    const productB = await createProduct({
      accessToken: ownerB.accessToken,
    });

    const customerB = await createCustomer(
      ownerB.tenant.slug
    );

    const orderB = await createOrder({
      customerToken:
        customerB.accessToken,
      productId: productB._id,
    });

    await markOrderDelivered({
      ownerToken: ownerB.accessToken,
      orderId: orderB._id,
    });

    const created = await request(app)
      .post("/api/v1/reviews")
      .set(
        "Authorization",
        `Bearer ${customerB.accessToken}`
      )
      .send({
        productId: productB._id,
        orderId: orderB._id,
        rating: 5,
        comment: "Tenant B review.",
      });

    expect(created.statusCode).toBe(201);

    const reviewId =
      created.body.review._id;

    const adminAccess =
      await request(app)
        .get(
          `/api/v1/reviews/admin/${reviewId}`
        )
        .set(
          "Authorization",
          `Bearer ${ownerA.accessToken}`
        );

    expect(
      adminAccess.statusCode
    ).toBe(404);

    const productAccess =
      await request(app)
        .get(
          `/api/v1/reviews/product/${productB._id}`
        )
        .set(
          "Authorization",
          `Bearer ${customerB.accessToken}`
        );

    expect(
      productAccess.statusCode
    ).toBe(200);

    expect(
      productAccess.body.summary.totalReviews
    ).toBe(1);

    const moderation =
      await request(app)
        .patch(
          `/api/v1/reviews/admin/${reviewId}/moderate`
        )
        .set(
          "Authorization",
          `Bearer ${ownerB.accessToken}`
        )
        .send({
          status: "REJECTED",
          moderationReason:
            "Test moderation",
        });

    expect(
      moderation.statusCode
    ).toBe(200);

    expect(
      moderation.body.review.status
    ).toBe("REJECTED");
  });
});