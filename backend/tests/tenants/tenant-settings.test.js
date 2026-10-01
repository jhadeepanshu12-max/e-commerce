const request = require("supertest");

const app = require("../../src/app");
const { createTenantOwner } = require("../helpers/testUtils");

describe("Tenant settings API", () => {
  test("should update tenant branding for an owner", async () => {
    const owner = await createTenantOwner();

    const response = await request(app)
      .patch("/api/v1/tenants/me")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        branding: {
          primaryColor: "#112233",
          secondaryColor: "#445566",
          themeMode: "DARK",
          borderRadius: "ROUND",
        },
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.tenant.branding.primaryColor).toBe("#112233");
    expect(response.body.data.tenant.branding.themeMode).toBe("DARK");
  });

  test("should reject invalid branding colors", async () => {
    const owner = await createTenantOwner();

    const response = await request(app)
      .patch("/api/v1/tenants/me")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ branding: { primaryColor: "red" } });

    expect(response.statusCode).toBe(400);
  });
});
