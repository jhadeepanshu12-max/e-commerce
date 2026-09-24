const mongoose = require("mongoose");

const Coupon = require("./coupon.model");
const CouponRedemption = require("./coupon.redemption.model");

const createServiceError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeCode = (code) =>
  String(code || "")
    .trim()
    .toUpperCase();

const validateCouponDefinition = ({
  discountType,
  discountValue,
  minOrderValue,
  maxDiscountAmount,
  startsAt,
  expiresAt,
  usageLimit,
  perCustomerLimit,
}) => {
  if (
    discountType === "PERCENTAGE" &&
    discountValue > 100
  ) {
    throw createServiceError(
      "Percentage discount cannot exceed 100%",
      400
    );
  }

  if (
    discountType === "FIXED" &&
    minOrderValue !== undefined &&
    discountValue > minOrderValue &&
    minOrderValue > 0
  ) {
    throw createServiceError(
      "Fixed discount cannot exceed minimum order value",
      400
    );
  }

  if (
    maxDiscountAmount !== null &&
    maxDiscountAmount !== undefined &&
    maxDiscountAmount < 0
  ) {
    throw createServiceError(
      "Maximum discount amount cannot be negative",
      400
    );
  }

  if (startsAt && expiresAt) {
    if (
      new Date(startsAt) >= new Date(expiresAt)
    ) {
      throw createServiceError(
        "Coupon expiry must be after start date",
        400
      );
    }
  }

  if (
    usageLimit !== null &&
    usageLimit !== undefined &&
    (!Number.isInteger(usageLimit) ||
      usageLimit < 1)
  ) {
    throw createServiceError(
      "Usage limit must be a positive integer",
      400
    );
  }

  if (
    perCustomerLimit !== null &&
    perCustomerLimit !== undefined &&
    (!Number.isInteger(perCustomerLimit) ||
      perCustomerLimit < 1)
  ) {
    throw createServiceError(
      "Per customer limit must be a positive integer",
      400
    );
  }
};

const getCouponForTenant = async ({
  tenantId,
  code,
  session = null,
}) => {
  const normalizedCode =
    normalizeCode(code);

  if (!normalizedCode) {
    throw createServiceError(
      "Coupon code is required",
      400
    );
  }

  let query = Coupon.findOne({
    tenantId,
    code: normalizedCode,
  });

  if (session) {
    query = query.session(session);
  }

  const coupon = await query;

  if (!coupon) {
    throw createServiceError(
      "Invalid coupon code",
      404
    );
  }

  return coupon;
};

const calculateDiscount = ({
  coupon,
  subtotal,
}) => {
  if (subtotal < coupon.minOrderValue) {
    throw createServiceError(
      `Minimum order value for this coupon is ₹${coupon.minOrderValue}`,
      400
    );
  }

  let discountAmount = 0;

  if (
    coupon.discountType ===
    "PERCENTAGE"
  ) {
    discountAmount =
      (subtotal * coupon.discountValue) /
      100;

    if (
      coupon.maxDiscountAmount !==
        null &&
      coupon.maxDiscountAmount !==
        undefined
    ) {
      discountAmount = Math.min(
        discountAmount,
        coupon.maxDiscountAmount
      );
    }
  }

  if (
    coupon.discountType ===
    "FIXED"
  ) {
    discountAmount =
      coupon.discountValue;
  }

  discountAmount = Math.min(
    discountAmount,
    subtotal
  );

  return Number(
    discountAmount.toFixed(2)
  );
};

const validateCouponForCart = async ({
  tenantId,
  customerId,
  couponCode,
  subtotal,
  session = null,
}) => {
  const coupon =
    await getCouponForTenant({
      tenantId,
      code: couponCode,
      session,
    });

  if (!coupon.isActive) {
    throw createServiceError(
      "This coupon is inactive",
      400
    );
  }

  const now = new Date();

  if (
    coupon.startsAt &&
    now < coupon.startsAt
  ) {
    throw createServiceError(
      "This coupon is not active yet",
      400
    );
  }

  if (
    coupon.expiresAt &&
    now > coupon.expiresAt
  ) {
    throw createServiceError(
      "This coupon has expired",
      400
    );
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageCount >=
      coupon.usageLimit
  ) {
    throw createServiceError(
      "This coupon has reached its usage limit",
      400
    );
  }

  if (
    coupon.applicableProductIds.length >
      0 ||
    coupon.applicableCategoryIds.length >
      0
  ) {
    throw createServiceError(
      "This coupon requires product-level applicability validation",
      400
    );
  }

  const customerUsage =
    await CouponRedemption.countDocuments({
      tenantId,
      couponId: coupon._id,
      customerId,
    });

  if (
    customerUsage >=
    coupon.perCustomerLimit
  ) {
    throw createServiceError(
      "You have already used this coupon the maximum number of times",
      400
    );
  }

  const discountAmount =
    calculateDiscount({
      coupon,
      subtotal,
    });

  return {
    coupon,
    discountAmount,
    finalSubtotal:
      subtotal - discountAmount,
  };
};

const redeemCoupon = async ({
  couponId,
  tenantId,
  customerId,
  orderId,
  discountAmount,
  session,
}) => {
  if (!mongoose.isValidObjectId(couponId)) {
    throw createServiceError(
      "Invalid coupon",
      400
    );
  }

  const coupon =
    await Coupon.findOneAndUpdate(
      {
        _id: couponId,
        tenantId,
        isActive: true,
        $or: [
          {
            usageLimit: null,
          },
          {
            $expr: {
              $lt: [
                "$usageCount",
                "$usageLimit",
              ],
            },
          },
        ],
      },
      {
        $inc: {
          usageCount: 1,
        },
      },
      {
        new: true,
        session,
      }
    );

  if (!coupon) {
    throw createServiceError(
      "Coupon usage limit has been reached",
      409
    );
  }

  await CouponRedemption.create(
    [
      {
        tenantId,
        couponId,
        customerId,
        orderId,
        discountAmount,
      },
    ],
    {
      session,
    }
  );

  return coupon;
};

module.exports = {
  createServiceError,
  normalizeCode,
  validateCouponDefinition,
  getCouponForTenant,
  calculateDiscount,
  validateCouponForCart,
  redeemCoupon,
};