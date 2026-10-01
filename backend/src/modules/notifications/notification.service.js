const mongoose = require("mongoose");

const Notification = require("./notification.model");
const User = require("../users/user.model");

/* =========================================================
   COMMON ERROR
========================================================= */

const createServiceError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

/* =========================================================
   VALIDATION HELPERS
========================================================= */

const validateObjectId = (
  value,
  message
) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createServiceError(
      message,
      400
    );
  }
};

const normalizePage = (value) => {
  const page = Number(value);

  if (
    !Number.isInteger(page) ||
    page < 1
  ) {
    return 1;
  }

  return page;
};

const normalizeLimit = (value) => {
  const limit = Number(value);

  if (
    !Number.isInteger(limit) ||
    limit < 1
  ) {
    return 20;
  }

  return Math.min(limit, 100);
};

const activeNotificationFilter = () => ({
  $or: [
    {
      expiresAt: null,
    },
    {
      expiresAt: {
        $gt: new Date(),
      },
    },
  ],
});

/* =========================================================
   CREATE NOTIFICATION
========================================================= */

const createNotification = async ({
  tenantId,
  recipientId,
  recipientType = "CUSTOMER",
  type,
  event,
  title,
  message,
  data = {},
  actionUrl = "",
  priority = "NORMAL",
  expiresAt = null,
}) => {
  validateObjectId(
    tenantId,
    "Invalid tenant ID"
  );

  validateObjectId(
    recipientId,
    "Invalid recipient ID"
  );

  const allowedTypes = [
    "ORDER",
    "PAYMENT",
    "SHIPPING",
    "REVIEW",
    "COUPON",
    "INVENTORY",
    "SYSTEM",
  ];

  if (!allowedTypes.includes(type)) {
    throw createServiceError(
      "Invalid notification type",
      400
    );
  }

  const allowedRecipientTypes = [
    "CUSTOMER",
    "USER",
  ];

  if (
    !allowedRecipientTypes.includes(
      recipientType
    )
  ) {
    throw createServiceError(
      "Invalid recipient type",
      400
    );
  }

  const allowedPriorities = [
    "LOW",
    "NORMAL",
    "HIGH",
    "URGENT",
  ];

  if (
    !allowedPriorities.includes(
      priority
    )
  ) {
    throw createServiceError(
      "Invalid notification priority",
      400
    );
  }

  const normalizedEvent =
    String(event || "").trim();

  const normalizedTitle =
    String(title || "").trim();

  const normalizedMessage =
    String(message || "").trim();

  if (!normalizedEvent) {
    throw createServiceError(
      "Notification event is required",
      400
    );
  }

  if (!normalizedTitle) {
    throw createServiceError(
      "Notification title is required",
      400
    );
  }

  if (!normalizedMessage) {
    throw createServiceError(
      "Notification message is required",
      400
    );
  }

  let normalizedExpiresAt = null;

  if (expiresAt !== null) {
    normalizedExpiresAt =
      new Date(expiresAt);

    if (
      Number.isNaN(
        normalizedExpiresAt.getTime()
      )
    ) {
      throw createServiceError(
        "Invalid notification expiry date",
        400
      );
    }
  }

  const notification =
    await Notification.create({
      tenantId,
      recipientId,
      recipientType,
      type,
      event: normalizedEvent,
      title: normalizedTitle,
      message: normalizedMessage,
      data:
        data &&
        typeof data === "object"
          ? data
          : {},
      actionUrl:
        String(actionUrl || "").trim(),
      priority,
      expiresAt:
        normalizedExpiresAt,
    });

  return notification;
};

/* =========================================================
   CUSTOMER NOTIFICATIONS
========================================================= */

const getCustomerNotifications = async ({
  tenantId,
  customerId,
  page = 1,
  limit = 20,
  unreadOnly = false,
}) => {
  validateObjectId(
    tenantId,
    "Invalid tenant ID"
  );

  validateObjectId(
    customerId,
    "Invalid customer ID"
  );

  const pageNumber =
    normalizePage(page);

  const limitNumber =
    normalizeLimit(limit);

  const filter = {
    tenantId,
    recipientId: customerId,
    recipientType: "CUSTOMER",
    ...activeNotificationFilter(),
  };

  if (unreadOnly === true) {
    filter.isRead = false;
  }

  const skip =
    (pageNumber - 1) *
    limitNumber;

  const [
    notifications,
    total,
    unreadCount,
  ] = await Promise.all([
    Notification.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    Notification.countDocuments(
      filter
    ),

    Notification.countDocuments({
      tenantId,
      recipientId: customerId,
      recipientType: "CUSTOMER",
      isRead: false,
      ...activeNotificationFilter(),
    }),
  ]);

  return {
    notifications,
    unreadCount,
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

/* =========================================================
   USER / ADMIN NOTIFICATIONS
========================================================= */

const getUserNotifications = async ({
  tenantId,
  userId,
  page = 1,
  limit = 20,
  unreadOnly = false,
}) => {
  validateObjectId(
    tenantId,
    "Invalid tenant ID"
  );

  validateObjectId(
    userId,
    "Invalid user ID"
  );

  const pageNumber =
    normalizePage(page);

  const limitNumber =
    normalizeLimit(limit);

  const filter = {
    tenantId,
    recipientId: userId,
    recipientType: "USER",
    ...activeNotificationFilter(),
  };

  if (unreadOnly === true) {
    filter.isRead = false;
  }

  const skip =
    (pageNumber - 1) *
    limitNumber;

  const [
    notifications,
    total,
    unreadCount,
  ] = await Promise.all([
    Notification.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    Notification.countDocuments(
      filter
    ),

    Notification.countDocuments({
      tenantId,
      recipientId: userId,
      recipientType: "USER",
      isRead: false,
      ...activeNotificationFilter(),
    }),
  ]);

  return {
    notifications,
    unreadCount,
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

/* =========================================================
   GET ONE NOTIFICATION
========================================================= */

const getNotificationById = async ({
  tenantId,
  recipientId,
  notificationId,
}) => {
  validateObjectId(
    tenantId,
    "Invalid tenant ID"
  );

  validateObjectId(
    recipientId,
    "Invalid recipient ID"
  );

  validateObjectId(
    notificationId,
    "Invalid notification ID"
  );

  const notification =
    await Notification.findOne({
      _id: notificationId,
      tenantId,
      recipientId,
    });

  if (!notification) {
    throw createServiceError(
      "Notification not found",
      404
    );
  }

  return notification;
};

/* =========================================================
   MARK ONE READ
========================================================= */

const markNotificationAsRead = async ({
  tenantId,
  recipientId,
  notificationId,
}) => {
  const notification =
    await getNotificationById({
      tenantId,
      recipientId,
      notificationId,
    });

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt =
      new Date();

    await notification.save();
  }

  return notification;
};

/* =========================================================
   MARK ALL READ
========================================================= */

const markAllNotificationsAsRead =
  async ({
    tenantId,
    recipientId,
    recipientType,
  }) => {
    validateObjectId(
      tenantId,
      "Invalid tenant ID"
    );

    validateObjectId(
      recipientId,
      "Invalid recipient ID"
    );

    if (
      ![
        "CUSTOMER",
        "USER",
      ].includes(recipientType)
    ) {
      throw createServiceError(
        "Invalid recipient type",
        400
      );
    }

    const result =
      await Notification.updateMany(
        {
          tenantId,
          recipientId,
          recipientType,
          isRead: false,
          ...activeNotificationFilter(),
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        }
      );

    return {
      modifiedCount:
        result.modifiedCount || 0,
    };
  };

/* =========================================================
   DELETE NOTIFICATION
========================================================= */

const deleteNotification = async ({
  tenantId,
  recipientId,
  notificationId,
}) => {
  validateObjectId(
    tenantId,
    "Invalid tenant ID"
  );

  validateObjectId(
    recipientId,
    "Invalid recipient ID"
  );

  validateObjectId(
    notificationId,
    "Invalid notification ID"
  );

  const notification =
    await Notification.findOneAndDelete({
      _id: notificationId,
      tenantId,
      recipientId,
    });

  if (!notification) {
    throw createServiceError(
      "Notification not found",
      404
    );
  }

  return notification;
};

/* =========================================================
   UNREAD COUNT
========================================================= */

const getUnreadCount = async ({
  tenantId,
  recipientId,
  recipientType,
}) => {
  validateObjectId(
    tenantId,
    "Invalid tenant ID"
  );

  validateObjectId(
    recipientId,
    "Invalid recipient ID"
  );

  if (
    ![
      "CUSTOMER",
      "USER",
    ].includes(recipientType)
  ) {
    throw createServiceError(
      "Invalid recipient type",
      400
    );
  }

  return Notification.countDocuments({
    tenantId,
    recipientId,
    recipientType,
    isRead: false,
    ...activeNotificationFilter(),
  });
};

/* =========================================================
   CUSTOMER → SUPPORT
========================================================= */

const createSupportMessage = async ({
  tenantId,
  customerId,
  message,
  threadId = null,
}) => {
  validateObjectId(
    tenantId,
    "Invalid tenant ID"
  );

  validateObjectId(
    customerId,
    "Invalid customer ID"
  );

  const normalizedMessage =
    String(message || "").trim();

  if (normalizedMessage.length < 2) {
    throw createServiceError(
      "Support message must be at least 2 characters",
      400
    );
  }

  if (normalizedMessage.length > 1000) {
    throw createServiceError(
      "Support message must be 1000 characters or less",
      400
    );
  }

  const supportThreadId =
    String(threadId || "").trim() ||
    `support-${customerId}-${Date.now()}`;

  /* ---------------------------------------------------------
     Find active store owner/staff first.
     This prevents creating a customer message when nobody
     is available to receive it.
  --------------------------------------------------------- */

  const adminUsers =
    await User.find({
      tenantId,
      role: {
        $in: [
          "TENANT_OWNER",
          "STAFF",
        ],
      },
      isActive: {
        $ne: false,
      },
    }).select("_id").lean();

  if (!adminUsers.length) {
    throw createServiceError(
      "No active store support user is available",
      503
    );
  }

  /* ---------------------------------------------------------
     Customer-side copy
  --------------------------------------------------------- */

  const customerNotification =
    await createNotification({
      tenantId,
      recipientId: customerId,
      recipientType: "CUSTOMER",
      type: "SYSTEM",
      event: "CUSTOMER_SUPPORT_SENT",
      title: "Support request sent",
      message: normalizedMessage,
      data: {
        supportThreadId,
        customerId,
        direction: "CUSTOMER_TO_ADMIN",
      },
      priority: "NORMAL",
    });

  /* ---------------------------------------------------------
     Admin notification
  --------------------------------------------------------- */

  await Promise.all(
    adminUsers.map((admin) =>
      createNotification({
        tenantId,
        recipientId: admin._id,
        recipientType: "USER",
        type: "SYSTEM",
        event: "CUSTOMER_SUPPORT_MESSAGE",
        title: "New customer support message",
        message: normalizedMessage,
        data: {
          supportThreadId,
          customerId,
          customerNotificationId:
            customerNotification._id,
          direction:
            "CUSTOMER_TO_ADMIN",
        },
        actionUrl:
          "/notifications",
        priority: "HIGH",
      })
    )
  );

  return {
    threadId: supportThreadId,
    notification:
      customerNotification,
  };
};

/* =========================================================
   ADMIN → CUSTOMER SUPPORT REPLY
========================================================= */

const createSupportReply = async ({
  tenantId,
  adminUserId,
  notificationId,
  message,
}) => {
  validateObjectId(
    tenantId,
    "Invalid tenant ID"
  );

  validateObjectId(
    adminUserId,
    "Invalid admin user ID"
  );

  validateObjectId(
    notificationId,
    "Invalid notification ID"
  );

  const normalizedMessage =
    String(message || "").trim();

  if (normalizedMessage.length < 2) {
    throw createServiceError(
      "Support reply must be at least 2 characters",
      400
    );
  }

  if (normalizedMessage.length > 1000) {
    throw createServiceError(
      "Support reply must be 1000 characters or less",
      400
    );
  }

  const supportNotification =
    await Notification.findOne({
      _id: notificationId,
      tenantId,
      recipientId: adminUserId,
      recipientType: "USER",
      type: "SYSTEM",
      event: "CUSTOMER_SUPPORT_MESSAGE",
    });

  if (!supportNotification) {
    throw createServiceError(
      "Support request not found",
      404
    );
  }

  const customerId =
    supportNotification?.data
      ?.customerId;

  const supportThreadId =
    supportNotification?.data
      ?.supportThreadId;

  validateObjectId(
    customerId,
    "Invalid customer ID in support request"
  );

  const reply =
    await createNotification({
      tenantId,
      recipientId: customerId,
      recipientType: "CUSTOMER",
      type: "SYSTEM",
      event: "CUSTOMER_SUPPORT_REPLY",
      title: "Support team replied",
      message: normalizedMessage,
      data: {
        supportThreadId,
        customerId,
        replyToNotificationId:
          supportNotification._id,
        repliedBy:
          adminUserId,
        direction:
          "ADMIN_TO_CUSTOMER",
      },
      priority: "HIGH",
    });

  /* Mark the admin support request read */

  supportNotification.isRead =
    true;

  supportNotification.readAt =
    new Date();

  await supportNotification.save();

  return reply;
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createNotification,
  getCustomerNotifications,
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  createSupportMessage,
  createSupportReply,
};