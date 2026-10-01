const mongoose = require("mongoose");

const {
  createOrderFromCart,
  getCustomerOrders,
  getOrderById,
  getTenantOrders,
  getTenantOrderById,
  transitionOrderStatus,
  cancelCustomerOrder,
} = require("./order.service");

const checkout = async (
  req,
  res,
  next
) => {
  try {
    const {
      shippingAddress = {},
      notes = "",
    } = req.body;

    const order =
      await createOrderFromCart({
        tenantId:
          req.auth.tenantId,
        customerId:
          req.auth.userId,
        shippingAddress,
        notes,
      });

    return res.status(201).json({
      success: true,
      message:
        "Order created successfully",
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getCustomerOrders({
        tenantId:
          req.auth.tenantId,
        customerId:
          req.auth.userId,
        page: req.query.page,
        limit: req.query.limit,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getMyOrderById = async (
  req,
  res,
  next
) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order =
      await getOrderById({
        tenantId:
          req.auth.tenantId,
        customerId:
          req.auth.userId,
        orderId:
          req.params.id,
      });

    return res.status(200).json({
      success: true,
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};

const cancelMyOrder = async (
  req,
  res,
  next
) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order =
      await cancelCustomerOrder({
        tenantId:
          req.auth.tenantId,
        customerId:
          req.auth.userId,
        orderId:
          req.params.id,
      });

    return res.status(200).json({
      success: true,
      message:
        "Order cancelled successfully",
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAdminOrders = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getTenantOrders({
        tenantId:
          req.auth.tenantId,
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAdminOrderById = async (
  req,
  res,
  next
) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order =
      await getTenantOrderById({
        tenantId:
          req.auth.tenantId,
        orderId:
          req.params.id,
      });

    return res.status(200).json({
      success: true,
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateAdminOrderStatus =
  async (req, res, next) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID",
        });
      }

      const {
        status,
      } = req.body;

      const allowedStatuses = [
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status",
        });
      }

      const order =
        await transitionOrderStatus({
          tenantId:
            req.auth.tenantId,
          orderId:
            req.params.id,
          newStatus: status,
          performedBy:
            req.auth.userId,
        });

      return res.status(200).json({
        success: true,
        message:
          "Order status updated successfully",
        data: {
          order,
        },
      });
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  checkout,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
};