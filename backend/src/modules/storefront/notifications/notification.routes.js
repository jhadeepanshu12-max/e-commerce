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
} = require("./notification.controller");

const router = express.Router();

router.use(
  authenticate,
  requireTenant
);

router.get(
  "/",
  listMine
);

router.get(
  "/unread-count",
  unreadCount
);

router.get(
  "/:notificationId",
  getMineById
);

router.patch(
  "/:notificationId/read",
  markRead
);

router.patch(
  "/read-all",
  markAllRead
);

router.delete(
  "/:notificationId",
  remove
);

router.post(
  "/",
  authorizeRoles(
    "TENANT_OWNER",
    "STAFF",
    "ADMIN"
  ),
  create
);

module.exports = router;