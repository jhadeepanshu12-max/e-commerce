const {
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
} = require("./notification.service");

/* =========================================================
   HELPERS
========================================================= */

const getTenantId = (req) => {
  return (
    req.tenantId ||
    req.user?.tenantId
  );
};

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId
  );
};

/* =========================================================
   CREATE NOTIFICATION
   Admin/internal use
========================================================= */

const create = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const notification =
      await createNotification({
        tenantId,

        recipientId:
          req.body?.recipientId,

        recipientType:
          req.body?.recipientType ||
          "CUSTOMER",

        type:
          req.body?.type,

        event:
          req.body?.event,

        title:
          req.body?.title,

        message:
          req.body?.message,

        data:
          req.body?.data || {},

        actionUrl:
          req.body?.actionUrl ||
          "",

        priority:
          req.body?.priority ||
          "NORMAL",

        expiresAt:
          req.body?.expiresAt ||
          null,
      });

    return res.status(201).json({
      success: true,
      message:
        "Notification created successfully",
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   LIST MY NOTIFICATIONS
========================================================= */

const listMine = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const userId =
      getUserId(req);

    const isCustomer =
      req.user?.role ===
      "CUSTOMER";

    const result = isCustomer
      ? await getCustomerNotifications({
          tenantId,
          customerId:
            userId,
          page:
            req.query?.page,
          limit:
            req.query?.limit,
          unreadOnly:
            req.query?.unreadOnly ===
            "true",
        })
      : await getUserNotifications({
          tenantId,
          userId,
          page:
            req.query?.page,
          limit:
            req.query?.limit,
          unreadOnly:
            req.query?.unreadOnly ===
            "true",
        });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET ONE
========================================================= */

const getMineById = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const recipientId =
      getUserId(req);

    const notification =
      await getNotificationById({
        tenantId,
        recipientId,
        notificationId:
          req.params
            .notificationId,
      });

    return res.status(200).json({
      success: true,
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   MARK READ
========================================================= */

const markRead = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const recipientId =
      getUserId(req);

    const notification =
      await markNotificationAsRead({
        tenantId,
        recipientId,
        notificationId:
          req.params
            .notificationId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Notification marked as read",
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   MARK ALL READ
========================================================= */

const markAllRead = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const recipientId =
      getUserId(req);

    const recipientType =
      req.user?.role ===
      "CUSTOMER"
        ? "CUSTOMER"
        : "USER";

    const result =
      await markAllNotificationsAsRead({
        tenantId,
        recipientId,
        recipientType,
      });

    return res.status(200).json({
      success: true,
      message:
        "All notifications marked as read",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE
========================================================= */

const remove = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const recipientId =
      getUserId(req);

    await deleteNotification({
      tenantId,
      recipientId,
      notificationId:
        req.params
          .notificationId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UNREAD COUNT
========================================================= */

const unreadCount = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const recipientId =
      getUserId(req);

    const recipientType =
      req.user?.role ===
      "CUSTOMER"
        ? "CUSTOMER"
        : "USER";

    const count =
      await getUnreadCount({
        tenantId,
        recipientId,
        recipientType,
      });

    return res.status(200).json({
      success: true,
      data: {
        unreadCount:
          count,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   CUSTOMER SEND SUPPORT MESSAGE
========================================================= */

const sendSupport = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const customerId =
      getUserId(req);

    const result =
      await createSupportMessage({
        tenantId,
        customerId,
        message:
          req.body?.message,
        threadId:
          req.body?.threadId ||
          null,
      });

    return res.status(201).json({
      success: true,
      message:
        "Support message sent successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   ADMIN REPLY TO CUSTOMER SUPPORT
========================================================= */

const replyToSupport = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const adminUserId =
      getUserId(req);

    const reply =
      await createSupportReply({
        tenantId,
        adminUserId,
        notificationId:
          req.params
            .notificationId,
        message:
          req.body?.message,
      });

    return res.status(201).json({
      success: true,
      message:
        "Support reply sent successfully",
      data: {
        notification:
          reply,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  create,
  listMine,
  getMineById,
  markRead,
  markAllRead,
  remove,
  unreadCount,
  sendSupport,
  replyToSupport,
};