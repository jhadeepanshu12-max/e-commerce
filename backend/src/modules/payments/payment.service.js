const mongoose = require("mongoose");

const Payment = require("./payment.model");
const Order = require("../orders/order.model");

const createServiceError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createPayment = async ({
  tenantId,
  customerId,
  orderId,
  provider = "RAZORPAY",
  method = "",
  providerOrderId = "",
  metadata = {},
}) => {
  if (
    !mongoose.isValidObjectId(orderId)
  ) {
    throw createServiceError(
      "Invalid order ID",
      400
    );
  }

  const order = await Order.findOne({
    _id: orderId,
    tenantId,
    customerId,
  });

  if (!order) {
    throw createServiceError(
      "Order not found",
      404
    );
  }

  if (
    order.status === "CANCELLED"
  ) {
    throw createServiceError(
      "Cannot create payment for a cancelled order",
      409
    );
  }

  if (
    order.paymentStatus === "PAID"
  ) {
    throw createServiceError(
      "Order has already been paid",
      409
    );
  }

  const existingPayment =
    await Payment.findOne({
      tenantId,
      orderId,
      status: {
        $in: [
          "PENDING",
          "PROCESSING",
          "PAID",
        ],
      },
    }).sort({
      createdAt: -1,
    });

  if (existingPayment) {
    return existingPayment;
  }

  const payment =
    await Payment.create({
      tenantId,
      orderId,
      customerId,
      provider,
      providerOrderId,
      amount: order.totalAmount,
      currency: order.currency,
      status: "PENDING",
      method,
      metadata,
    });

  return payment;
};

const markPaymentProcessing = async ({
  tenantId,
  customerId,
  paymentId,
}) => {
  if (
    !mongoose.isValidObjectId(
      paymentId
    )
  ) {
    throw createServiceError(
      "Invalid payment ID",
      400
    );
  }

  const payment =
    await Payment.findOne({
      _id: paymentId,
      tenantId,
      customerId,
    });

  if (!payment) {
    throw createServiceError(
      "Payment not found",
      404
    );
  }

  if (
    payment.status === "PAID"
  ) {
    return payment;
  }

  if (
    ["FAILED", "CANCELLED", "REFUNDED"].includes(
      payment.status
    )
  ) {
    throw createServiceError(
      `Cannot process a ${payment.status.toLowerCase()} payment`,
      409
    );
  }

  payment.status = "PROCESSING";

  await payment.save();

  return payment;
};

const markPaymentPaid = async ({
  tenantId,
  customerId,
  paymentId,
  providerPaymentId = "",
  method = "",
  metadata = {},
}) => {
  if (
    !mongoose.isValidObjectId(
      paymentId
    )
  ) {
    throw createServiceError(
      "Invalid payment ID",
      400
    );
  }

  const session =
    await mongoose.startSession();

  try {
    let updatedPayment = null;

    await session.withTransaction(
      async () => {
        const payment =
          await Payment.findOne({
            _id: paymentId,
            tenantId,
            customerId,
          }).session(session);

        if (!payment) {
          throw createServiceError(
            "Payment not found",
            404
          );
        }

        if (
          payment.status === "PAID"
        ) {
          updatedPayment = payment;
          return;
        }

        if (
          [
            "REFUNDED",
            "PARTIALLY_REFUNDED",
          ].includes(payment.status)
        ) {
          throw createServiceError(
            "Refunded payment cannot be marked as paid",
            409
          );
        }

        const order =
          await Order.findOne({
            _id: payment.orderId,
            tenantId,
            customerId,
          }).session(session);

        if (!order) {
          throw createServiceError(
            "Associated order not found",
            404
          );
        }

        if (
          order.status ===
          "CANCELLED"
        ) {
          throw createServiceError(
            "Cancelled order cannot be marked as paid",
            409
          );
        }

        payment.status = "PAID";

        payment.providerPaymentId =
          providerPaymentId ||
          payment.providerPaymentId;

        payment.method =
          method || payment.method;

        payment.metadata = {
          ...(payment.metadata || {}),
          ...metadata,
        };

        payment.paidAt =
          new Date();

        payment.failureReason = "";

        await payment.save({
          session,
        });

        order.paymentStatus = "PAID";

        if (
          order.status ===
          "PENDING_PAYMENT"
        ) {
          order.status = "CONFIRMED";
        }

        await order.save({
          session,
        });

        updatedPayment =
          payment;
      }
    );

    return updatedPayment;
  } finally {
    await session.endSession();
  }
};

const markPaymentFailed = async ({
  tenantId,
  customerId,
  paymentId,
  failureReason = "Payment failed",
  metadata = {},
}) => {
  if (
    !mongoose.isValidObjectId(
      paymentId
    )
  ) {
    throw createServiceError(
      "Invalid payment ID",
      400
    );
  }

  const payment =
    await Payment.findOne({
      _id: paymentId,
      tenantId,
      customerId,
    });

  if (!payment) {
    throw createServiceError(
      "Payment not found",
      404
    );
  }

  if (
    payment.status === "PAID"
  ) {
    throw createServiceError(
      "Paid payment cannot be marked as failed",
      409
    );
  }

  if (
    ["REFUNDED", "PARTIALLY_REFUNDED"].includes(
      payment.status
    )
  ) {
    throw createServiceError(
      "Refunded payment cannot be marked as failed",
      409
    );
  }

  payment.status = "FAILED";

  payment.failureReason =
    failureReason;

  payment.failedAt =
    new Date();

  payment.metadata = {
    ...(payment.metadata || {}),
    ...metadata,
  };

  await payment.save();

  return payment;
};

const getCustomerPayment = async ({
  tenantId,
  customerId,
  paymentId,
}) => {
  if (
    !mongoose.isValidObjectId(
      paymentId
    )
  ) {
    throw createServiceError(
      "Invalid payment ID",
      400
    );
  }

  const payment =
    await Payment.findOne({
      _id: paymentId,
      tenantId,
      customerId,
    }).populate(
      "orderId",
      "orderNumber status paymentStatus totalAmount currency"
    );

  if (!payment) {
    throw createServiceError(
      "Payment not found",
      404
    );
  }

  return payment;
};

const getCustomerPayments = async ({
  tenantId,
  customerId,
  page = 1,
  limit = 20,
}) => {
  const pageNumber = Math.max(
    Number(page) || 1,
    1
  );

  const limitNumber = Math.min(
    Math.max(
      Number(limit) || 20,
      1
    ),
    100
  );

  const filter = {
    tenantId,
    customerId,
  };

  const [
    payments,
    total,
  ] = await Promise.all([
    Payment.find(filter)
      .populate(
        "orderId",
        "orderNumber status paymentStatus totalAmount currency"
      )
      .sort({
        createdAt: -1,
      })
      .skip(
        (pageNumber - 1) *
          limitNumber
      )
      .limit(limitNumber),

    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(
        total / limitNumber
      ),
    },
  };
};

const getTenantPayment = async ({
  tenantId,
  paymentId,
}) => {
  if (
    !mongoose.isValidObjectId(
      paymentId
    )
  ) {
    throw createServiceError(
      "Invalid payment ID",
      400
    );
  }

  const payment =
    await Payment.findOne({
      _id: paymentId,
      tenantId,
    })
      .populate(
        "orderId",
        "orderNumber status paymentStatus totalAmount currency"
      )
      .populate(
        "customerId",
        "name email"
      );

  if (!payment) {
    throw createServiceError(
      "Payment not found",
      404
    );
  }

  return payment;
};

const getTenantPayments = async ({
  tenantId,
  page = 1,
  limit = 20,
  status,
}) => {
  const pageNumber = Math.max(
    Number(page) || 1,
    1
  );

  const limitNumber = Math.min(
    Math.max(
      Number(limit) || 20,
      1
    ),
    100
  );

  const filter = {
    tenantId,
  };

  if (status) {
    filter.status = status;
  }

  const [
    payments,
    total,
  ] = await Promise.all([
    Payment.find(filter)
      .populate(
        "orderId",
        "orderNumber status paymentStatus totalAmount currency"
      )
      .populate(
        "customerId",
        "name email"
      )
      .sort({
        createdAt: -1,
      })
      .skip(
        (pageNumber - 1) *
          limitNumber
      )
      .limit(limitNumber),

    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(
        total / limitNumber
      ),
    },
  };
};

module.exports = {
  createPayment,
  markPaymentProcessing,
  markPaymentPaid,
  markPaymentFailed,
  getCustomerPayment,
  getCustomerPayments,
  getTenantPayment,
  getTenantPayments,
};