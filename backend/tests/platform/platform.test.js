const request = require("supertest");

const app = require("../../src/app");
const { createTenantOwner, createSuperAdmin } = require("../helpers/testUtils");

describe("Platform API", () => {
  test("should expose platform overview to super admins", async () => {
    await createTenantOwner();
    const admin = await createSuperAdmin();

    const response = await request(app)
      .get("/api/v1/platform/overview")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.tenants).toBe(1);
    expect(response.body.data.users).toBe(2);
  });

  test("should reject tenant owners from platform APIs", async () => {
    const owner = await createTenantOwner();

    const response = await request(app)
      .get("/api/v1/platform/overview")
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(response.statusCode).toBe(403);
  });
});
