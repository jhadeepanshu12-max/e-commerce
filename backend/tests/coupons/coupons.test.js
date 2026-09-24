const mongoose = require("mongoose");

const {
  validateCouponDefinition,
  calculateDiscount,
  normalizeCode,
} = require("../../src/modules/coupons/coupon.service");

describe("Coupon Service", () => {
  describe("normalizeCode", () => {
    test("should trim and uppercase coupon code", () => {
      expect(
        normalizeCode("  summer50  ")
      ).toBe("SUMMER50");
    });

    test("should return empty string for empty code", () => {
      expect(normalizeCode("")).toBe("");
    });
  });

  describe("validateCouponDefinition", () => {
    test("should allow valid percentage coupon", () => {
      expect(() =>
        validateCouponDefinition({
          discountType: "PERCENTAGE",
          discountValue: 20,
          minOrderValue: 500,
          maxDiscountAmount: 300,
          startsAt: null,
          expiresAt: null,
          usageLimit: 100,
          perCustomerLimit: 1,
        })
      ).not.toThrow();
    });

    test("should reject percentage discount above 100", () => {
      expect(() =>
        validateCouponDefinition({
          discountType: "PERCENTAGE",
          discountValue: 101,
          minOrderValue: 0,
          maxDiscountAmount: null,
          startsAt: null,
          expiresAt: null,
          usageLimit: null,
          perCustomerLimit: 1,
        })
      ).toThrow(
        "Percentage discount cannot exceed 100%"
      );
    });

    test("should reject fixed discount greater than minimum order value", () => {
      expect(() =>
        validateCouponDefinition({
          discountType: "FIXED",
          discountValue: 1000,
          minOrderValue: 500,
          maxDiscountAmount: null,
          startsAt: null,
          expiresAt: null,
          usageLimit: null,
          perCustomerLimit: 1,
        })
      ).toThrow(
        "Fixed discount cannot exceed minimum order value"
      );
    });

    test("should reject invalid expiry date", () => {
      expect(() =>
        validateCouponDefinition({
          discountType: "PERCENTAGE",
          discountValue: 20,
          minOrderValue: 0,
          maxDiscountAmount: null,
          startsAt: "2026-10-10",
          expiresAt: "2026-10-01",
          usageLimit: null,
          perCustomerLimit: 1,
        })
      ).toThrow(
        "Coupon expiry must be after start date"
      );
    });

    test("should reject invalid usage limit", () => {
      expect(() =>
        validateCouponDefinition({
          discountType: "PERCENTAGE",
          discountValue: 20,
          minOrderValue: 0,
          maxDiscountAmount: null,
          startsAt: null,
          expiresAt: null,
          usageLimit: 0,
          perCustomerLimit: 1,
        })
      ).toThrow(
        "Usage limit must be a positive integer"
      );
    });

    test("should reject invalid per customer limit", () => {
      expect(() =>
        validateCouponDefinition({
          discountType: "PERCENTAGE",
          discountValue: 20,
          minOrderValue: 0,
          maxDiscountAmount: null,
          startsAt: null,
          expiresAt: null,
          usageLimit: null,
          perCustomerLimit: 0,
        })
      ).toThrow(
        "Per customer limit must be a positive integer"
      );
    });
  });

  describe("calculateDiscount", () => {
    test("should calculate percentage discount", () => {
      const coupon = {
        discountType: "PERCENTAGE",
        discountValue: 20,
        minOrderValue: 500,
        maxDiscountAmount: null,
      };

      expect(
        calculateDiscount({
          coupon,
          subtotal: 1000,
        })
      ).toBe(200);
    });

    test("should calculate fixed discount", () => {
      const coupon = {
        discountType: "FIXED",
        discountValue: 150,
        minOrderValue: 500,
        maxDiscountAmount: null,
      };

      expect(
        calculateDiscount({
          coupon,
          subtotal: 1000,
        })
      ).toBe(150);
    });

    test("should apply maximum discount cap", () => {
      const coupon = {
        discountType: "PERCENTAGE",
        discountValue: 20,
        minOrderValue: 500,
        maxDiscountAmount: 100,
      };

      expect(
        calculateDiscount({
          coupon,
          subtotal: 1000,
        })
      ).toBe(100);
    });

    test("should never discount more than subtotal", () => {
      const coupon = {
        discountType: "FIXED",
        discountValue: 1500,
        minOrderValue: 500,
        maxDiscountAmount: null,
      };

      expect(
        calculateDiscount({
          coupon,
          subtotal: 1000,
        })
      ).toBe(1000);
    });

    test("should reject subtotal below minimum order value", () => {
      const coupon = {
        discountType: "PERCENTAGE",
        discountValue: 20,
        minOrderValue: 1000,
        maxDiscountAmount: null,
      };

      expect(() =>
        calculateDiscount({
          coupon,
          subtotal: 500,
        })
      ).toThrow(
        "Minimum order value for this coupon is ₹1000"
      );
    });

    test("should correctly round percentage discount", () => {
      const coupon = {
        discountType: "PERCENTAGE",
        discountValue: 15,
        minOrderValue: 0,
        maxDiscountAmount: null,
      };

      expect(
        calculateDiscount({
          coupon,
          subtotal: 999,
        })
      ).toBe(149.85);
    });
  });
});