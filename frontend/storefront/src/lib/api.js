const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api/v1";

/* =========================================================
   AUTH TOKEN
========================================================= */

const getToken = () => {
  return localStorage.getItem(
    "nova_customer_token"
  );
};

/* =========================================================
   GENERIC REQUEST
========================================================= */

const request = async (
  endpoint,
  options = {}
) => {
  const {
    method = "GET",
    body,
    auth = false,
  } = options;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (auth) {
    const token = getToken();

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        method,
        headers,
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
      }
    );
  } catch (error) {
    throw new Error(
      "Unable to connect to the backend. Please make sure the server is running on port 5000."
    );
  }

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    const error = new Error(
      result?.message ||
        result?.error ||
        "Something went wrong."
    );

    error.status = response.status;
    error.data = result;

    throw error;
  }

  return result;
};

/* =========================================================
   STOREFRONT
========================================================= */

export const getStorefront = async (
  tenantSlug
) => {
  if (!tenantSlug) {
    throw new Error(
      "Tenant slug is required."
    );
  }

  const result = await request(
    `/storefront/${encodeURIComponent(
      tenantSlug
    )}`
  );

  return (
    result?.data?.tenant ||
    null
  );
};

/* =========================================================
   CATEGORIES
========================================================= */

export const getCategories = async (
  tenantSlug
) => {
  if (!tenantSlug) {
    throw new Error(
      "Tenant slug is required."
    );
  }

  const result = await request(
    `/storefront/${encodeURIComponent(
      tenantSlug
    )}/categories`
  );

  return (
    result?.data?.categories ||
    []
  );
};

/* =========================================================
   PRODUCTS
========================================================= */

export const getProducts = async ({
  tenantSlug,
  page = 1,
  limit = 24,
  search = "",
  categoryId = "",
  featured,
} = {}) => {
  if (!tenantSlug) {
    throw new Error(
      "Tenant slug is required."
    );
  }

  const params =
    new URLSearchParams();

  params.set(
    "page",
    String(page)
  );

  params.set(
    "limit",
    String(limit)
  );

  if (
    typeof search === "string" &&
    search.trim()
  ) {
    params.set(
      "search",
      search.trim()
    );
  }

  if (categoryId) {
    params.set(
      "categoryId",
      categoryId
    );
  }

  if (
    featured !== undefined
  ) {
    params.set(
      "featured",
      String(featured)
    );
  }

  const result = await request(
    `/storefront/${encodeURIComponent(
      tenantSlug
    )}/products?${params.toString()}`
  );

  return {
    products:
      result?.data?.products ||
      [],

    pagination:
      result?.data?.pagination || {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
  };
};

/* =========================================================
   SINGLE PRODUCT
========================================================= */

export const getProductById = async (
  tenantSlug,
  productId
) => {
  if (!tenantSlug) {
    throw new Error(
      "Tenant slug is required."
    );
  }

  if (!productId) {
    throw new Error(
      "Product ID is required."
    );
  }

  const result = await request(
    `/storefront/${encodeURIComponent(
      tenantSlug
    )}/products/${encodeURIComponent(
      productId
    )}`
  );

  return (
    result?.data?.product ||
    null
  );
};

/* =========================================================
   CUSTOMER AUTH
========================================================= */

export const customerSignup =
  async ({
    name,
    email,
    password,
    tenantSlug,
  }) => {
    return request(
      "/customer-auth/signup",
      {
        method: "POST",

        body: {
          name,
          email,
          password,
          tenantSlug,
        },
      }
    );
  };

export const customerLogin =
  async ({
    email,
    password,
    tenantSlug,
  }) => {
    return request(
      "/customer-auth/login",
      {
        method: "POST",

        body: {
          email,
          password,
          tenantSlug,
        },
      }
    );
  };

/* =========================================================
   CART
========================================================= */

export const getCart = async () => {
  const result = await request(
    "/cart",
    {
      auth: true,
    }
  );

  return (
    result?.data?.cart ||
    null
  );
};

/* ---------------------------------------------------------
   ADD TO CART
--------------------------------------------------------- */

export const addToCart = async ({
  productId,
  variantId = null,
  quantity = 1,
}) => {
  if (!productId) {
    throw new Error(
      "Product ID is required."
    );
  }

  const result = await request(
    "/cart/items",
    {
      method: "POST",
      auth: true,

      body: {
        productId,
        variantId,
        quantity,
      },
    }
  );

  return (
    result?.data?.cart ||
    null
  );
};

/* ---------------------------------------------------------
   UPDATE CART ITEM
--------------------------------------------------------- */

export const updateCartItem = async (
  itemId,
  quantity
) => {
  if (!itemId) {
    throw new Error(
      "Cart item ID is required."
    );
  }

  const result = await request(
    `/cart/items/${encodeURIComponent(
      itemId
    )}`,
    {
      method: "PATCH",
      auth: true,

      body: {
        quantity,
      },
    }
  );

  return (
    result?.data?.cart ||
    null
  );
};

/* ---------------------------------------------------------
   REMOVE CART ITEM
--------------------------------------------------------- */

export const removeCartItem =
  async (itemId) => {
    if (!itemId) {
      throw new Error(
        "Cart item ID is required."
      );
    }

    const result = await request(
      `/cart/items/${encodeURIComponent(
        itemId
      )}`,
      {
        method: "DELETE",
        auth: true,
      }
    );

    return (
      result?.data?.cart ||
      null
    );
  };

/* ---------------------------------------------------------
   CLEAR CART
--------------------------------------------------------- */

export const clearCart = async () => {
  const result = await request(
    "/cart",
    {
      method: "DELETE",
      auth: true,
    }
  );

  return (
    result?.data?.cart ||
    null
  );
};

/* =========================================================
   ORDERS / CHECKOUT
========================================================= */

/* ---------------------------------------------------------
   CREATE ORDER
--------------------------------------------------------- */

export const createOrder = async ({
  shippingAddress,
}) => {
  if (!shippingAddress) {
    throw new Error(
      "Shipping address is required."
    );
  }

  const result = await request(
    "/orders/checkout",
    {
      method: "POST",
      auth: true,

      body: {
        shippingAddress,
      },
    }
  );

  return (
    result?.data?.order ||
    null
  );
};

/* ---------------------------------------------------------
   GET CUSTOMER ORDERS
--------------------------------------------------------- */

export const getCustomerOrders =
  async ({
    page = 1,
    limit = 20,
  } = {}) => {
    const params =
      new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

    const result = await request(
      `/orders/my-orders?${params.toString()}`,
      {
        auth: true,
      }
    );

    return {
      orders:
        result?.data?.orders ||
        result?.orders ||
        [],

      pagination:
        result?.data?.pagination ||
        result?.pagination || {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
    };
  };

/* ---------------------------------------------------------
   CANCEL CUSTOMER ORDER
--------------------------------------------------------- */

export const cancelCustomerOrder =
  async (
    orderId,
    cancellationReason = ""
  ) => {
    if (!orderId) {
      throw new Error(
        "Order ID is required."
      );
    }

    const result = await request(
      `/orders/my-orders/${encodeURIComponent(
        orderId
      )}/cancel`,
      {
        method: "PATCH",
        auth: true,

        body: {
          cancellationReason,
        },
      }
    );

    return (
      result?.data ||
      result ||
      null
    );
  };

/* =========================================================
   PAYMENTS
========================================================= */

/* ---------------------------------------------------------
   CREATE PAYMENT
--------------------------------------------------------- */

export const createPayment =
  async ({
    orderId,
    provider = "RAZORPAY",
  }) => {
    if (!orderId) {
      throw new Error(
        "Order ID is required."
      );
    }

    const result = await request(
      "/payments",
      {
        method: "POST",
        auth: true,

        body: {
          orderId,
          provider,
        },
      }
    );

    const payment =
      result?.data?.payment ||
      null;

    const checkout =
      result?.data?.checkout ||
      null;

    if (!payment) {
      return null;
    }

    return {
      ...payment,

      razorpayOrderId:
        checkout?.orderId ||
        payment?.providerOrderId ||
        null,

      razorpayKeyId:
        checkout?.keyId ||
        null,

      razorpayAmount:
        checkout?.amount ||
        null,

      razorpayCurrency:
        checkout?.currency ||
        payment?.currency ||
        "INR",

      checkout:
        checkout || null,
    };
  };

/* ---------------------------------------------------------
   VERIFY PAYMENT
--------------------------------------------------------- */

export const verifyPayment =
  async ({
    paymentId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    method = "",
    metadata = {},
  }) => {
    if (!paymentId) {
      throw new Error(
        "Payment ID is required."
      );
    }

    if (!razorpayOrderId) {
      throw new Error(
        "Razorpay order ID is required."
      );
    }

    if (!razorpayPaymentId) {
      throw new Error(
        "Razorpay payment ID is required."
      );
    }

    if (!razorpaySignature) {
      throw new Error(
        "Razorpay signature is required."
      );
    }

    const result =
      await request(
        `/payments/${encodeURIComponent(
          paymentId
        )}/verify`,
        {
          method: "POST",
          auth: true,

          body: {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            method,
            metadata,
          },
        }
      );

    return (
      result?.data?.payment ||
      null
    );
  };

/* =========================================================
   CUSTOMER NOTIFICATIONS
========================================================= */

/* ---------------------------------------------------------
   GET CUSTOMER NOTIFICATIONS
--------------------------------------------------------- */

export const getCustomerNotifications =
  async ({
    page = 1,
    limit = 50,
  } = {}) => {
    const params =
      new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

    const result = await request(
      `/notifications?${params.toString()}`,
      {
        auth: true,
      }
    );

    return {
      notifications:
        result?.data?.notifications ||
        result?.notifications ||
        [],

      pagination:
        result?.data?.pagination ||
        result?.pagination || {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },

      unreadCount:
        result?.data?.unreadCount ??
        result?.unreadCount ??
        0,
    };
  };

/* ---------------------------------------------------------
   MARK NOTIFICATION READ
--------------------------------------------------------- */

export const markNotificationRead =
  async (
    notificationId
  ) => {
    if (!notificationId) {
      throw new Error(
        "Notification ID is required."
      );
    }

    const result = await request(
      `/notifications/${encodeURIComponent(
        notificationId
      )}/read`,
      {
        method: "PATCH",
        auth: true,
      }
    );

    return (
      result?.data?.notification ||
      result?.notification ||
      result?.data ||
      result ||
      null
    );
  };

/* =========================================================
   CUSTOMER SUPPORT
========================================================= */

/* ---------------------------------------------------------
   SEND SUPPORT MESSAGE
--------------------------------------------------------- */

export const sendSupportMessage =
  async ({
    message,
    threadId,
  } = {}) => {
    const normalizedMessage =
      String(
        message || ""
      ).trim();

    if (!normalizedMessage) {
      throw new Error(
        "Support message is required."
      );
    }

    if (
      normalizedMessage.length >
      1000
    ) {
      throw new Error(
        "Support message must be 1000 characters or less."
      );
    }

    const result =
      await request(
        "/notifications/support",
        {
          method: "POST",
          auth: true,

          body: {
            message:
              normalizedMessage,

            threadId:
              threadId || null,
          },
        }
      );

    return (
      result?.data ||
      result ||
      null
    );
  };

/* =========================================================
   CUSTOMER SESSION
========================================================= */

/* ---------------------------------------------------------
   SAVE CUSTOMER SESSION
--------------------------------------------------------- */

export const saveCustomerSession =
  (authData) => {
    if (!authData) {
      return;
    }

    const token =
      authData.accessToken;

    const user =
      authData.user ||
      authData.customer;

    const tenant =
      authData.tenant;

    if (token) {
      localStorage.setItem(
        "nova_customer_token",
        token
      );
    }

    if (user) {
      localStorage.setItem(
        "nova_customer",
        JSON.stringify(user)
      );
    }

    if (tenant) {
      localStorage.setItem(
        "nova_tenant",
        JSON.stringify(tenant)
      );
    }
  };

/* ---------------------------------------------------------
   GET STORED CUSTOMER
--------------------------------------------------------- */

export const getStoredCustomer =
  () => {
    try {
      const customer =
        localStorage.getItem(
          "nova_customer"
        );

      return customer
        ? JSON.parse(customer)
        : null;
    } catch {
      return null;
    }
  };

/* ---------------------------------------------------------
   GET STORED TENANT
--------------------------------------------------------- */

export const getStoredTenant =
  () => {
    try {
      const tenant =
        localStorage.getItem(
          "nova_tenant"
        );

      return tenant
        ? JSON.parse(tenant)
        : null;
    } catch {
      return null;
    }
  };

/* ---------------------------------------------------------
   LOGOUT CUSTOMER
--------------------------------------------------------- */

export const logoutCustomer =
  () => {
    localStorage.removeItem(
      "nova_customer_token"
    );

    localStorage.removeItem(
      "nova_customer"
    );

    localStorage.removeItem(
      "nova_tenant"
    );
  };

/* ---------------------------------------------------------
   CHECK CUSTOMER LOGIN
--------------------------------------------------------- */

export const isCustomerLoggedIn =
  () => {
    return Boolean(
      localStorage.getItem(
        "nova_customer_token"
      )
    );
  };

/* =========================================================
   EXPORTS
========================================================= */

export {
  API_BASE_URL,
  getToken,
};