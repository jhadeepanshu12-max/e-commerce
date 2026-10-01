const Tenant = require("../../tenants/tenant.model");
const User = require("../../users/user.model");
const Product = require("../../catalog/product.model");
const Order = require("../../orders/order.model");

const getOverview = async (req, res, next) => {
  try {
    const [tenants, users, products, orders] = await Promise.all([
      Tenant.countDocuments(),
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      data: { tenants, users, products, orders },
    });
  } catch (error) {
    next(error);
  }
};

const getTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.find()
      .populate("ownerUserId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: { tenants },
    });
  } catch (error) {
    next(error);
  }
};

const updateTenantStatus = async (req, res, next) => {
  try {
    const allowedStatuses = ["ACTIVE", "SUSPENDED", "PENDING"];

    if (!allowedStatuses.includes(req.body?.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tenant status",
      });
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tenant status updated successfully",
      data: { tenant },
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select("name email role tenantId isActive emailVerified createdAt")
      .populate("tenantId", "name slug status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getTenants,
  updateTenantStatus,
  getUsers,
};
