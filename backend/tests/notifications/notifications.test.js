const mongoose = require("mongoose");

const Notification = require(
  "../../src/modules/notifications/notification.model"
);

const {
  createNotification,
  getCustomerNotifications,
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
} = require(
  "../../src/modules/notifications/notification.service"
);

describe("Notification Service", () => {
  let tenantA;
  let tenantB;
  let customerA;
  let customerB;
  let userA;

  beforeEach(() => {
    tenantA =
      new mongoose.Types.ObjectId();

    tenantB =
      new mongoose.Types.ObjectId();

    customerA =
      new mongoose.Types.ObjectId();

    customerB =
      new mongoose.Types.ObjectId();

    userA =
      new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await Notification.deleteMany({});
  });

  test("should create a customer notification", async () => {
    const notification =
      await createNotification({
        tenantId: tenantA,
        recipientId: customerA,
        recipientType: "CUSTOMER",
        type: "ORDER",
        event: "ORDER_PLACED",
        title: "Order placed",
        message:
          "Your order has been placed successfully.",
        data: {
          orderId:
            new mongoose.Types.ObjectId(),
        },
        priority: "HIGH",
      });

    expect(
      notification._id
    ).toBeDefined();

    expect(
      String(notification.tenantId)
    ).toBe(String(tenantA));

    expect(
      String(notification.recipientId)
    ).toBe(String(customerA));

    expect(
      notification.recipientType
    ).toBe("CUSTOMER");

    expect(
      notification.type
    ).toBe("ORDER");

    expect(
      notification.event
    ).toBe("ORDER_PLACED");

    expect(
      notification.isRead
    ).toBe(false);
  });

  test("should list only customer's own tenant notifications", async () => {
    await createNotification({
      tenantId: tenantA,
      recipientId: customerA,
      recipientType: "CUSTOMER",
      type: "ORDER",
      event: "ORDER_PLACED",
      title: "Tenant A",
      message: "Tenant A notification",
    });

    await createNotification({
      tenantId: tenantB,
      recipientId: customerA,
      recipientType: "CUSTOMER",
      type: "ORDER",
      event: "ORDER_PLACED",
      title: "Tenant B",
      message: "Tenant B notification",
    });

    const result =
      await getCustomerNotifications({
        tenantId: tenantA,
        customerId: customerA,
      });

    expect(
      result.notifications
    ).toHaveLength(1);

    expect(
      result.notifications[0].title
    ).toBe("Tenant A");
  });

  test("should not expose another customer's notifications", async () => {
    await createNotification({
      tenantId: tenantA,
      recipientId: customerA,
      recipientType: "CUSTOMER",
      type: "PAYMENT",
      event: "PAYMENT_SUCCESS",
      title: "Private notification",
      message: "Private message",
    });

    const result =
      await getCustomerNotifications({
        tenantId: tenantA,
        customerId: customerB,
      });

    expect(
      result.notifications
    ).toHaveLength(0);

    expect(
      result.total
    ).toBeUndefined();

    expect(
      result.pagination.total
    ).toBe(0);
  });

  test("should return unread count", async () => {
    await createNotification({
      tenantId: tenantA,
      recipientId: customerA,
      recipientType: "CUSTOMER",
      type: "ORDER",
      event: "ORDER_PLACED",
      title: "One",
      message: "One",
    });

    await createNotification({
      tenantId: tenantA,
      recipientId: customerA,
      recipientType: "CUSTOMER",
      type: "SHIPPING",
      event: "ORDER_SHIPPED",
      title: "Two",
      message: "Two",
    });

    const count =
      await getUnreadCount({
        tenantId: tenantA,
        recipientId: customerA,
        recipientType: "CUSTOMER",
      });

    expect(count).toBe(2);
  });

  test("should mark one notification as read", async () => {
    const notification =
      await createNotification({
        tenantId: tenantA,
        recipientId: customerA,
        recipientType: "CUSTOMER",
        type: "ORDER",
        event: "ORDER_PLACED",
        title: "Order",
        message: "Order placed",
      });

    const updated =
      await markNotificationAsRead({
        tenantId: tenantA,
        recipientId: customerA,
        notificationId:
          notification._id,
      });

    expect(
      updated.isRead
    ).toBe(true);

    expect(
      updated.readAt
    ).toBeInstanceOf(Date);
  });

  test("should mark all customer notifications as read", async () => {
    await createNotification({
      tenantId: tenantA,
      recipientId: customerA,
      recipientType: "CUSTOMER",
      type: "ORDER",
      event: "ORDER_PLACED",
      title: "One",
      message: "One",
    });

    await createNotification({
      tenantId: tenantA,
      recipientId: customerA,
      recipientType: "CUSTOMER",
      type: "PAYMENT",
      event: "PAYMENT_SUCCESS",
      title: "Two",
      message: "Two",
    });

    const result =
      await markAllNotificationsAsRead({
        tenantId: tenantA,
        recipientId: customerA,
        recipientType: "CUSTOMER",
      });

    expect(
      result.modifiedCount
    ).toBe(2);

    const count =
      await getUnreadCount({
        tenantId: tenantA,
        recipientId: customerA,
        recipientType: "CUSTOMER",
      });

    expect(count).toBe(0);
  });

  test("should delete customer's own notification", async () => {
    const notification =
      await createNotification({
        tenantId: tenantA,
        recipientId: customerA,
        recipientType: "CUSTOMER",
        type: "SYSTEM",
        event: "SYSTEM_MESSAGE",
        title: "System",
        message: "System message",
      });

    const deleted =
      await deleteNotification({
        tenantId: tenantA,
        recipientId: customerA,
        notificationId:
          notification._id,
      });

    expect(
      String(deleted._id)
    ).toBe(
      String(notification._id)
    );

    const found =
      await Notification.findById(
        notification._id
      );

    expect(found).toBeNull();
  });

  test("should prevent tenant A from reading tenant B notification", async () => {
    const notification =
      await createNotification({
        tenantId: tenantB,
        recipientId: customerB,
        recipientType: "CUSTOMER",
        type: "ORDER",
        event: "ORDER_PLACED",
        title: "Tenant B",
        message: "Tenant B message",
      });

    await expect(
      getNotificationById({
        tenantId: tenantA,
        recipientId: customerB,
        notificationId:
          notification._id,
      })
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test("should support user/admin notifications separately", async () => {
    const notification =
      await createNotification({
        tenantId: tenantA,
        recipientId: userA,
        recipientType: "USER",
        type: "INVENTORY",
        event: "LOW_STOCK",
        title: "Low stock",
        message:
          "Product stock is running low.",
        priority: "URGENT",
      });

    const result =
      await getUserNotifications({
        tenantId: tenantA,
        userId: userA,
      });

    expect(
      result.notifications
    ).toHaveLength(1);

    expect(
      result.notifications[0].type
    ).toBe("INVENTORY");

    expect(
      result.notifications[0].priority
    ).toBe("URGENT");

    expect(
      String(
        result.notifications[0]._id
      )
    ).toBe(
      String(notification._id)
    );
  });

  test("should reject invalid notification type", async () => {
    await expect(
      createNotification({
        tenantId: tenantA,
        recipientId: customerA,
        recipientType: "CUSTOMER",
        type: "INVALID",
        event: "TEST",
        title: "Test",
        message: "Test",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("should reject invalid notification priority", async () => {
    await expect(
      createNotification({
        tenantId: tenantA,
        recipientId: customerA,
        recipientType: "CUSTOMER",
        type: "SYSTEM",
        event: "TEST",
        title: "Test",
        message: "Test",
        priority: "INVALID",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("should reject invalid recipient type", async () => {
    await expect(
      createNotification({
        tenantId: tenantA,
        recipientId: customerA,
        recipientType: "INVALID",
        type: "SYSTEM",
        event: "TEST",
        title: "Test",
        message: "Test",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("should ignore expired notifications", async () => {
    await createNotification({
      tenantId: tenantA,
      recipientId: customerA,
      recipientType: "CUSTOMER",
      type: "COUPON",
      event: "COUPON_EXPIRED",
      title: "Expired",
      message: "This has expired.",
      expiresAt:
        new Date(
          Date.now() - 60 * 1000
        ),
    });

    const result =
      await getCustomerNotifications({
        tenantId: tenantA,
        customerId: customerA,
      });

    expect(
      result.notifications
    ).toHaveLength(0);

    expect(
      result.pagination.total
    ).toBe(0);
  });
});