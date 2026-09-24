const request = require("supertest");

const app = require("../../src/app");

const {
  createTenantOwner,
} = require("../helpers/testUtils");

const createCustomer = async (
  tenantSlug,
  email = `shipping-customer-${Date.now()}-${Math.random()}@example.com`
) => {
  const response = await request(app)
    .post("/api/v1/customer-auth/signup")
    .send({
      name: "Shipping Customer",
      email,
      password: "CustomerPass123",
      tenantSlug,
    });

  expect(response.statusCode).toBe(201);

  return response.body.data;
};

const createZone = async ({
  accessToken,
  name = `North Zone ${Date.now()}${Math.random()}`,
  states = ["UTTAR PRADESH"],
  cities = [],
  postalCodes = [],
  priority = 10,
}) => {
  const response = await request(app)
    .post("/api/v1/shipping/zones")
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name,
      countries: ["IN"],
      states,
      cities,
      postalCodes,
      priority,
    });

  expect(response.statusCode).toBe(201);

  return response.body.zone;
};

const createRate = async ({
  accessToken,
  zoneId,
  name = "Standard Delivery",
  method = "FLAT",
  amount = 80,
  freeShippingThreshold,
}) => {
  const response = await request(app)
    .post(
      `/api/v1/shipping/zones/${zoneId}/rates`
    )
    .set(
      "Authorization",
      `Bearer ${accessToken}`
    )
    .send({
      name,
      method,
      amount,
      freeShippingThreshold,
      estimatedDeliveryMinDays: 2,
      estimatedDeliveryMaxDays: 5,
    });

  expect(response.statusCode).toBe(201);

  return response.body.rate;
};

describe("Shipping API", () => {
  test("should create a shipping zone for the current tenant", async () => {
    const owner = await createTenantOwner({
      email:
        "shipping-create-zone-owner@example.com",
      businessName:
        "Shipping Create Zone Store",
    });

    const zone = await createZone({
      accessToken: owner.accessToken,
      name: "Uttar Pradesh Zone",
      states: ["UTTAR PRADESH"],
    });

    expect(zone).toBeDefined();
    expect(zone.name).toBe(
      "Uttar Pradesh Zone"
    );
    expect(zone.tenantId).toBe(
      owner.tenant._id
    );
    expect(zone.states).toContain(
      "UTTAR PRADESH"
    );
  });

  test("should list only active shipping zones for the current tenant", async () => {
    const owner = await createTenantOwner({
      email:
        "shipping-list-zone-owner@example.com",
      businessName:
        "Shipping List Zone Store",
    });

    await createZone({
      accessToken: owner.accessToken,
      name: "Active Zone",
    });

    const response = await request(app)
      .get("/api/v1/shipping/zones")
      .set(
        "Authorization",
        `Bearer ${owner.accessToken}`
      );

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(
      Array.isArray(response.body.zones)
    ).toBe(true);

    expect(
      response.body.zones.some(
        (zone) =>
          zone.name === "Active Zone"
      )
    ).toBe(true);
  });

  test("should create a shipping rate inside a tenant zone", async () => {
    const owner = await createTenantOwner({
      email:
        "shipping-create-rate-owner@example.com",
      businessName:
        "Shipping Create Rate Store",
    });

    const zone = await createZone({
      accessToken: owner.accessToken,
      name: "Rate Zone",
    });

    const rate = await createRate({
      accessToken: owner.accessToken,
      zoneId: zone._id,
      amount: 99,
    });

    expect(rate).toBeDefined();
    expect(rate.zoneId).toBe(zone._id);
    expect(rate.tenantId).toBe(
      owner.tenant._id
    );
    expect(rate.amount).toBe(99);
    expect(rate.method).toBe("FLAT");
  });

  test("should calculate flat shipping for a matching address", async () => {
    const owner = await createTenantOwner({
      email:
        "shipping-calculate-owner@example.com",
      businessName:
        "Shipping Calculate Store",
    });

    const zone = await createZone({
      accessToken: owner.accessToken,
      name: "UP Calculation Zone",
      states: ["UTTAR PRADESH"],
    });

    await createRate({
      accessToken: owner.accessToken,
      zoneId: zone._id,
      name: "Standard Delivery",
      amount: 80,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const response = await request(app)
      .post("/api/v1/shipping/calculate")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        country: "IN",
        state: "UTTAR PRADESH",
        city: "NOIDA",
        postalCode: "201301",
        orderValue: 1000,
        totalWeight: 2,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.zone.name
    ).toBe("UP Calculation Zone");

    expect(
      response.body.options
    ).toHaveLength(1);

    expect(
      response.body.options[0].amount
    ).toBe(80);

    expect(
      response.body.options[0].currency
    ).toBe("INR");
  });

  test("should return free shipping when order reaches free shipping threshold", async () => {
    const owner = await createTenantOwner({
      email:
        "shipping-free-owner@example.com",
      businessName:
        "Shipping Free Store",
    });

    const zone = await createZone({
      accessToken: owner.accessToken,
      name: "Free Shipping Zone",
      states: ["DELHI"],
    });

    await createRate({
      accessToken: owner.accessToken,
      zoneId: zone._id,
      name: "Standard Delivery",
      amount: 100,
      freeShippingThreshold: 2000,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const response = await request(app)
      .post("/api/v1/shipping/calculate")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        country: "IN",
        state: "DELHI",
        city: "NEW DELHI",
        postalCode: "110001",
        orderValue: 2500,
        totalWeight: 1,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.options
    ).toHaveLength(1);

    expect(
      response.body.options[0].amount
    ).toBe(0);

    expect(
      response.body.options[0].currency
    ).toBe("INR");
  });

  test("should reject an address that does not match any shipping zone", async () => {
    const owner = await createTenantOwner({
      email:
        "shipping-no-zone-owner@example.com",
      businessName:
        "Shipping No Zone Store",
    });

    const zone = await createZone({
      accessToken: owner.accessToken,
      name: "UP Only Zone",
      states: ["UTTAR PRADESH"],
    });

    await createRate({
      accessToken: owner.accessToken,
      zoneId: zone._id,
      amount: 100,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const response = await request(app)
      .post("/api/v1/shipping/calculate")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        country: "IN",
        state: "MAHARASHTRA",
        city: "MUMBAI",
        postalCode: "400001",
        orderValue: 1000,
        totalWeight: 1,
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "No shipping zone available for this address"
    );
  });

  test("should match a zone by postal code", async () => {
    const owner = await createTenantOwner({
      email:
        "shipping-pincode-owner@example.com",
      businessName:
        "Shipping Pincode Store",
    });

    const zone = await createZone({
      accessToken: owner.accessToken,
      name: "Pincode Zone",
      states: [],
      postalCodes: ["201301"],
    });

    await createRate({
      accessToken: owner.accessToken,
      zoneId: zone._id,
      amount: 60,
    });

    const customer = await createCustomer(
      owner.tenant.slug
    );

    const response = await request(app)
      .post("/api/v1/shipping/calculate")
      .set(
        "Authorization",
        `Bearer ${customer.accessToken}`
      )
      .send({
        country: "IN",
        state: "UTTAR PRADESH",
        city: "NOIDA",
        postalCode: "201301",
        orderValue: 500,
        totalWeight: 1,
      });

    expect(response.statusCode).toBe(200);
    expect(
      response.body.zone.name
    ).toBe("Pincode Zone");

    expect(
      response.body.options[0].amount
    ).toBe(60);
  });

  test("should prevent one tenant from accessing another tenant shipping zone", async () => {
    const ownerA = await createTenantOwner({
      email:
        "shipping-isolation-a@example.com",
      businessName:
        "Shipping Isolation Store A",
    });

    const ownerB = await createTenantOwner({
      email:
        "shipping-isolation-b@example.com",
      businessName:
        "Shipping Isolation Store B",
    });

    const zoneB = await createZone({
      accessToken: ownerB.accessToken,
      name: "Tenant B Zone",
    });

    const getZone = await request(app)
      .get(
        `/api/v1/shipping/zones/${zoneB._id}`
      )
      .set(
        "Authorization",
        `Bearer ${ownerA.accessToken}`
      );

    expect(getZone.statusCode).toBe(404);
    expect(getZone.body.success).toBe(false);

    const createRateResponse = await request(
      app
    )
      .post(
        `/api/v1/shipping/zones/${zoneB._id}/rates`
      )
      .set(
        "Authorization",
        `Bearer ${ownerA.accessToken}`
      )
      .send({
        name: "Unauthorized Rate",
        method: "FLAT",
        amount: 50,
      });

    expect(
      createRateResponse.statusCode
    ).toBe(404);

    expect(
      createRateResponse.body.success
    ).toBe(false);
  });

  test("should prevent one tenant from updating another tenant shipping zone", async () => {
    const ownerA = await createTenantOwner({
      email:
        "shipping-update-isolation-a@example.com",
      businessName:
        "Shipping Update Isolation A",
    });

    const ownerB = await createTenantOwner({
      email:
        "shipping-update-isolation-b@example.com",
      businessName:
        "Shipping Update Isolation B",
    });

    const zoneB = await createZone({
      accessToken: ownerB.accessToken,
      name: "Protected Tenant B Zone",
    });

    const response = await request(app)
      .patch(
        `/api/v1/shipping/zones/${zoneB._id}`
      )
      .set(
        "Authorization",
        `Bearer ${ownerA.accessToken}`
      )
      .send({
        name: "Hacked Zone",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test("should reject shipping calculation without authentication", async () => {
    const response = await request(app)
      .post("/api/v1/shipping/calculate")
      .send({
        country: "IN",
        state: "UTTAR PRADESH",
        city: "NOIDA",
        postalCode: "201301",
        orderValue: 1000,
        totalWeight: 1,
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("should reject shipping calculation for tenant owner role", async () => {
    const owner = await createTenantOwner({
      email:
        "shipping-owner-calc-role@example.com",
      businessName:
        "Shipping Owner Role Store",
    });

    const response = await request(app)
      .post("/api/v1/shipping/calculate")
      .set(
        "Authorization",
        `Bearer ${owner.accessToken}`
      )
      .send({
        country: "IN",
        state: "UTTAR PRADESH",
        city: "NOIDA",
        postalCode: "201301",
        orderValue: 1000,
        totalWeight: 1,
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test("should reject duplicate shipping zone name within the same tenant", async () => {
    const owner = await createTenantOwner({
      email:
        "shipping-duplicate-owner@example.com",
      businessName:
        "Shipping Duplicate Store",
    });

    await createZone({
      accessToken: owner.accessToken,
      name: "Duplicate Zone",
    });

    const response = await request(app)
      .post("/api/v1/shipping/zones")
      .set(
        "Authorization",
        `Bearer ${owner.accessToken}`
      )
      .send({
        name: "Duplicate Zone",
        countries: ["IN"],
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
  });

  test("should allow the same shipping zone name for different tenants", async () => {
    const ownerA = await createTenantOwner({
      email:
        "shipping-same-name-a@example.com",
      businessName:
        "Shipping Same Name A",
    });

    const ownerB = await createTenantOwner({
      email:
        "shipping-same-name-b@example.com",
      businessName:
        "Shipping Same Name B",
    });

    const zoneA = await createZone({
      accessToken: ownerA.accessToken,
      name: "Standard Zone",
    });

    const zoneB = await createZone({
      accessToken: ownerB.accessToken,
      name: "Standard Zone",
    });

    expect(zoneA.name).toBe(
      "Standard Zone"
    );

    expect(zoneB.name).toBe(
      "Standard Zone"
    );

    expect(zoneA.tenantId).not.toBe(
      zoneB.tenantId
    );
  });
});