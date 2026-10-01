const mongoose = require("mongoose");

const Notification = require("./notification.model");

const createServiceError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

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

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
};

const normalizeLimit = (value) => {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1) {
    return 20;
  }

  return Math.min(limit, 100);
};

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
    !allowedPriorities.includes(priority)
  ) {
    throw createServiceError(
      "Invalid notification priority",
      400
    );
  }

  if (
    !String(event || "").trim()
  ) {
    throw createServiceError(
      "Notification event is required",
      400
    );
  }

  if (
    !String(title || "").trim()
  ) {
    throw createServiceError(
      "Notification title is required",
      400
    );
  }

  if (
    !String(message || "").trim()
  ) {
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
      event: String(event).trim(),
      title: String(title).trim(),
      message: String(message).trim(),
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
  };

  if (unreadOnly === true) {
    filter.isRead = false;
  }

  filter.$or = [
    {
      expiresAt: null,
    },
    {
      expiresAt: {
        $gt: new Date(),
      },
    },
  ];

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
      .limit(limitNumber),

    Notification.countDocuments(
      filter
    ),

    Notification.countDocuments({
      tenantId,
      recipientId: customerId,
      recipientType: "CUSTOMER",
      isRead: false,
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
  };

  if (unreadOnly === true) {
    filter.isRead = false;
  }

  filter.$or = [
    {
      expiresAt: null,
    },
    {
      expiresAt: {
        $gt: new Date(),
      },
    },
  ];

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
      .limit(limitNumber),

    Notification.countDocuments(
      filter
    ),

    Notification.countDocuments({
      tenantId,
      recipientId: userId,
      recipientType: "USER",
      isRead: false,
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
    notification.readAt = new Date();

    await notification.save();
  }

  return notification;
};

const markAllNotificationsAsRead = async ({
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
};

module.exports = {
  createNotification,
  getCustomerNotifications,
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
};