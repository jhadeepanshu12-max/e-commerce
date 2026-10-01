const express = require("express");

const {
  authenticate,
  authorizeRoles,
} = require("../../middleware/auth.middleware");

const {
  requireTenant,
} = require("../../middleware/tenant.middleware");

const {
  create,
  listMine,
  getMineById,
  markRead,
  markAllRead,
  remove,
  unreadCount,
  sendSupport,
  replyToSupport,
} = require("./notification.controller");

const router =
  express.Router();

/* =========================================================
   COMMON AUTH
========================================================= */

router.use(
  authenticate,
  requireTenant
);

/* =========================================================
   CUSTOMER SUPPORT
========================================================= */

router.post(
  "/support",
  authorizeRoles("CUSTOMER"),
  sendSupport
);

router.post(
  "/support/:notificationId/reply",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  replyToSupport
);

/* =========================================================
   NOTIFICATIONS
========================================================= */

router.get(
  "/",
  listMine
);

router.get(
  "/unread-count",
  unreadCount
);

router.patch(
  "/read-all",
  markAllRead
);

router.get(
  "/:notificationId",
  getMineById
);

router.patch(
  "/:notificationId/read",
  markRead
);

router.delete(
  "/:notificationId",
  remove
);

/* =========================================================
   ADMIN / INTERNAL CREATE
========================================================= */

router.post(
  "/",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF"
  ),
  create
);

module.exports = router;