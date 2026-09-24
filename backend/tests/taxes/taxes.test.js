const TaxRule = require("../../src/modules/taxes/tax-rule.model");
const Tenant = require("../../src/modules/tenants/tenant.model");
const Category = require("../../src/modules/catalog/category.model");
const Product = require("../../src/modules/catalog/product.model");

const {
  calculateTax,
} = require("../../src/modules/taxes/tax.service");

describe("Tax Service", () => {
  let tenantA;
  let tenantB;
  let categoryA;
  let categoryB;
  let productA;
  let productB;

  beforeEach(async () => {
    await TaxRule.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Tenant.deleteMany({});

    const timestamp = Date.now();

    tenantA = await Tenant.create({
      name: "Tenant A Store",
      slug: `tenant-a-${timestamp}`,
      businessType: "GENERAL",
      status: "ACTIVE",
    });

    tenantB = await Tenant.create({
      name: "Tenant B Store",
      slug: `tenant-b-${timestamp}`,
      businessType: "GENERAL",
      status: "ACTIVE",
    });

    categoryA = await Category.create({
      tenantId: tenantA._id,
      name: "Category A",
      slug: `category-a-${timestamp}`,
      isActive: true,
    });

    categoryB = await Category.create({
      tenantId: tenantB._id,
      name: "Category B",
      slug: `category-b-${timestamp}`,
      isActive: true,
    });

    productA = await Product.create({
      tenantId: tenantA._id,
      categoryId: categoryA._id,
      name: "Product A",
      slug: `product-a-${timestamp}`,
      sku: `SKU-A-${timestamp}`,
      description: "Tax test product A",
      price: 1000,
      stockQuantity: 100,
      trackInventory: true,
      allowBackorder: false,
      status: "ACTIVE",
    });

    productB = await Product.create({
      tenantId: tenantB._id,
      categoryId: categoryB._id,
      name: "Product B",
      slug: `product-b-${timestamp}`,
      sku: `SKU-B-${timestamp}`,
      description: "Tax test product B",
      price: 2000,
      stockQuantity: 100,
      trackInventory: true,
      allowBackorder: false,
      status: "ACTIVE",
    });
  });

  afterAll(async () => {
    await TaxRule.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Tenant.deleteMany({});
  });

  describe("Percentage tax", () => {
    test("should calculate percentage tax correctly", async () => {
      await TaxRule.create({
        tenantId: tenantA._id,
        name: "GST 18%",
        code: "GST18",
        taxType: "PERCENTAGE",
        rate: 18,
        appliesToAllProducts: true,
        isActive: true,
      });

      const result = await calculateTax({
        tenantId: tenantA._id,
        items: [
          {
            productId: productA._id,
            quantity: 1,
          },
        ],
        country: "IN",
      });

      expect(result).toBeDefined();
      expect(result.subtotal).toBe(1000);
      expect(result.totalTax).toBe(180);
      expect(result.currency).toBe("INR");
    });
  });

  describe("Tenant isolation", () => {
    test("should not apply another tenant's tax rules", async () => {
      await TaxRule.create({
        tenantId: tenantB._id,
        name: "Tenant B GST",
        code: "B-GST",
        taxType: "PERCENTAGE",
        rate: 18,
        appliesToAllProducts: true,
        isActive: true,
      });

      const result = await calculateTax({
        tenantId: tenantA._id,
        items: [
          {
            productId: productA._id,
            quantity: 1,
          },
        ],
        country: "IN",
      });

      expect(result.totalTax).toBe(0);
    });
  });

  describe("Tax rule matching", () => {
    test("should support state-specific tax rules", async () => {
      await TaxRule.create({
        tenantId: tenantA._id,
        name: "Delhi GST",
        code: "DEL-GST",
        taxType: "PERCENTAGE",
        rate: 18,
        states: ["DELHI"],
        appliesToAllProducts: true,
        isActive: true,
      });

      const result = await calculateTax({
        tenantId: tenantA._id,
        items: [
          {
            productId: productA._id,
            quantity: 1,
          },
        ],
        country: "IN",
        state: "DELHI",
      });

      expect(result.totalTax).toBe(180);
    });

    test("should not apply a state-specific rule to another state", async () => {
      await TaxRule.create({
        tenantId: tenantA._id,
        name: "Delhi GST",
        code: "DEL-GST",
        taxType: "PERCENTAGE",
        rate: 18,
        states: ["DELHI"],
        appliesToAllProducts: true,
        isActive: true,
      });

      const result = await calculateTax({
        tenantId: tenantA._id,
        items: [
          {
            productId: productA._id,
            quantity: 1,
          },
        ],
        country: "IN",
        state: "UTTAR PRADESH",
      });

      expect(result.totalTax).toBe(0);
    });
  });

  describe("Fixed tax", () => {
    test("should support fixed tax rules", async () => {
      await TaxRule.create({
        tenantId: tenantA._id,
        name: "Fixed Tax",
        code: "FIXED10",
        taxType: "FIXED",
        rate: 10,
        appliesToAllProducts: true,
        isActive: true,
      });

      const result = await calculateTax({
        tenantId: tenantA._id,
        items: [
          {
            productId: productA._id,
            quantity: 2,
          },
        ],
        country: "IN",
      });

      expect(result.subtotal).toBe(2000);
      expect(result.totalTax).toBe(20);
    });
  });

  describe("Product-specific rules", () => {
    test("should support product-specific tax rules", async () => {
      await TaxRule.create({
        tenantId: tenantA._id,
        name: "Product GST",
        code: "PRODUCT-GST",
        taxType: "PERCENTAGE",
        rate: 12,
        productIds: [productA._id],
        appliesToAllProducts: false,
        isActive: true,
      });

      const result = await calculateTax({
        tenantId: tenantA._id,
        items: [
          {
            productId: productA._id,
            quantity: 1,
          },
        ],
        country: "IN",
      });

      expect(result.totalTax).toBe(120);
      expect(result.items[0].rules).toHaveLength(1);
      expect(result.items[0].rules[0].code).toBe("PRODUCT-GST");
    });
  });

  describe("Category-specific rules", () => {
    test("should support category-specific tax rules", async () => {
      await TaxRule.create({
        tenantId: tenantA._id,
        name: "Category GST",
        code: "CATEGORY-GST",
        taxType: "PERCENTAGE",
        rate: 5,
        categoryIds: [categoryA._id],
        appliesToAllProducts: false,
        isActive: true,
      });

      const result = await calculateTax({
        tenantId: tenantA._id,
        items: [
          {
            productId: productA._id,
            quantity: 1,
          },
        ],
        country: "IN",
      });

      expect(result.totalTax).toBe(50);
      expect(result.items[0].rules).toHaveLength(1);
      expect(result.items[0].rules[0].code).toBe("CATEGORY-GST");
    });
  });

  describe("Inactive rules", () => {
    test("should ignore inactive tax rules", async () => {
      await TaxRule.create({
        tenantId: tenantA._id,
        name: "Inactive GST",
        code: "INACTIVE-GST",
        taxType: "PERCENTAGE",
        rate: 18,
        appliesToAllProducts: true,
        isActive: false,
      });

      const result = await calculateTax({
        tenantId: tenantA._id,
        items: [
          {
            productId: productA._id,
            quantity: 1,
          },
        ],
        country: "IN",
      });

      expect(result.totalTax).toBe(0);
      expect(result.items[0].rules).toHaveLength(0);
    });
  });

  describe("Multiple rules", () => {
    test("should calculate matching tax rules together", async () => {
      await TaxRule.create({
        tenantId: tenantA._id,
        name: "CGST",
        code: "CGST9",
        taxType: "PERCENTAGE",
        rate: 9,
        appliesToAllProducts: true,
        isActive: true,
      });

      await TaxRule.create({
        tenantId: tenantA._id,
        name: "SGST",
        code: "SGST9",
        taxType: "PERCENTAGE",
        rate: 9,
        appliesToAllProducts: true,
        isActive: true,
      });

      const result = await calculateTax({
        tenantId: tenantA._id,
        items: [
          {
            productId: productA._id,
            quantity: 1,
          },
        ],
        country: "IN",
      });

      expect(result.totalTax).toBe(180);
      expect(result.items[0].rules).toHaveLength(2);
    });
  });
});