const mongoose = require("mongoose");

const Coupon = require("./coupon.model");
const {
  validateCouponDefinition,
} = require("./coupon.service");

const createCoupon = async (
  req,
  res,
  next
) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue = 0,
      maxDiscountAmount = null,
      startsAt = null,
      expiresAt = null,
      usageLimit = null,
      perCustomerLimit = 1,
      applicableProductIds = [],
      applicableCategoryIds = [],
    } = req.body;

    if (
      !code ||
      !discountType ||
      discountValue === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Code, discount type and discount value are required",
      });
    }

    if (
      !["PERCENTAGE", "FIXED"].includes(
        discountType
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount type",
      });
    }

    if (
      !Number.isFinite(
        Number(discountValue)
      ) ||
      Number(discountValue) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount value must be greater than zero",
      });
    }

    validateCouponDefinition({
      discountType,
      discountValue: Number(
        discountValue
      ),
      minOrderValue: Number(
        minOrderValue
      ),
      maxDiscountAmount:
        maxDiscountAmount === null
          ? null
          : Number(maxDiscountAmount),
      startsAt,
      expiresAt,
      usageLimit,
      perCustomerLimit,
    });

    const coupon =
      await Coupon.create({
        tenantId: req.tenantId,
        code: String(code)
          .trim()
          .toUpperCase(),
        description,
        discountType,
        discountValue: Number(
          discountValue
        ),
        minOrderValue: Number(
          minOrderValue
        ),
        maxDiscountAmount:
          maxDiscountAmount === null
            ? null
            : Number(maxDiscountAmount),
        startsAt,
        expiresAt,
        usageLimit,
        perCustomerLimit,
        applicableProductIds,
        applicableCategoryIds,
        createdBy: req.auth.userId,
      });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Coupon code already exists for this tenant",
      });
    }

    next(error);
  }
};

const getCoupons = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 20,
      active,
    } = req.query;

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const filter = {
      tenantId: req.tenantId,
    };

    if (active !== undefined) {
      filter.isActive =
        active === "true";
    }

    const [coupons, total] =
      await Promise.all([
        Coupon.find(filter)
          .sort({ createdAt: -1 })
          .skip(
            (pageNumber - 1) *
              limitNumber
          )
          .limit(limitNumber),

        Coupon.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      data: coupons,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateCoupon = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon ID",
      });
    }

    const coupon =
      await Coupon.findOne({
        _id: id,
        tenantId: req.tenantId,
      });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const allowedFields = [
      "description",
      "discountType",
      "discountValue",
      "minOrderValue",
      "maxDiscountAmount",
      "startsAt",
      "expiresAt",
      "usageLimit",
      "perCustomerLimit",
      "applicableProductIds",
      "applicableCategoryIds",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (
        req.body[field] !== undefined
      ) {
        coupon[field] =
          req.body[field];
      }
    }

    validateCouponDefinition({
      discountType:
        coupon.discountType,
      discountValue:
        coupon.discountValue,
      minOrderValue:
        coupon.minOrderValue,
      maxDiscountAmount:
        coupon.maxDiscountAmount,
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      usageLimit:
        coupon.usageLimit,
      perCustomerLimit:
        coupon.perCustomerLimit,
    });

    await coupon.save();

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

const deactivateCoupon = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon ID",
      });
    }

    const coupon =
      await Coupon.findOneAndUpdate(
        {
          _id: id,
          tenantId: req.tenantId,
        },
        {
          isActive: false,
        },
        {
          new: true,
        }
      );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Coupon deactivated successfully",
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  updateCoupon,
  deactivateCoupon,
};