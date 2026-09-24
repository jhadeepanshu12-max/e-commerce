const {
  createPayment,
  markPaymentProcessing,
  markPaymentPaid,
  markPaymentFailed,
  getCustomerPayment,
  getCustomerPayments,
  getTenantPayment,
  getTenantPayments,
} = require("./payment.service");

const create = async (
  req,
  res,
  next
) => {
  try {
    const {
      orderId,
      provider = "RAZORPAY",
      method = "",
      providerOrderId = "",
      metadata = {},
    } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const payment =
      await createPayment({
        tenantId: req.tenantId,
        customerId:
          req.auth.userId,
        orderId,
        provider,
        method,
        providerOrderId,
        metadata,
      });

    return res.status(201).json({
      success: true,
      message:
        "Payment created successfully",
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

const processing = async (
  req,
  res,
  next
) => {
  try {
    const payment =
      await markPaymentProcessing({
        tenantId: req.tenantId,
        customerId:
          req.auth.userId,
        paymentId:
          req.params.id,
      });

    return res.status(200).json({
      success: true,
      message:
        "Payment marked as processing",
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

const paid = async (
  req,
  res,
  next
) => {
  try {
    const {
      providerPaymentId = "",
      method = "",
      metadata = {},
    } = req.body;

    const payment =
      await markPaymentPaid({
        tenantId: req.tenantId,
        customerId:
          req.auth.userId,
        paymentId:
          req.params.id,
        providerPaymentId,
        method,
        metadata,
      });

    return res.status(200).json({
      success: true,
      message:
        "Payment marked as paid",
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

const failed = async (
  req,
  res,
  next
) => {
  try {
    const {
      failureReason = "Payment failed",
      metadata = {},
    } = req.body;

    const payment =
      await markPaymentFailed({
        tenantId: req.tenantId,
        customerId:
          req.auth.userId,
        paymentId:
          req.params.id,
        failureReason,
        metadata,
      });

    return res.status(200).json({
      success: true,
      message:
        "Payment marked as failed",
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMyPayment = async (
  req,
  res,
  next
) => {
  try {
    const payment =
      await getCustomerPayment({
        tenantId: req.tenantId,
        customerId:
          req.auth.userId,
        paymentId:
          req.params.id,
      });

    return res.status(200).json({
      success: true,
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMyPayments = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 20,
    } = req.query;

    const result =
      await getCustomerPayments({
        tenantId: req.tenantId,
        customerId:
          req.auth.userId,
        page,
        limit,
      });

    return res.status(200).json({
      success: true,
      data: result.payments,
      pagination:
        result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getAdminPayment = async (
  req,
  res,
  next
) => {
  try {
    const payment =
      await getTenantPayment({
        tenantId: req.tenantId,
        paymentId:
          req.params.id,
      });

    return res.status(200).json({
      success: true,
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAdminPayments = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
    } = req.query;

    const result =
      await getTenantPayments({
        tenantId: req.tenantId,
        page,
        limit,
        status,
      });

    return res.status(200).json({
      success: true,
      data: result.payments,
      pagination:
        result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  processing,
  paid,
  failed,
  getMyPayment,
  getMyPayments,
  getAdminPayment,
  getAdminPayments,
};