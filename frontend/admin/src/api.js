const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1"
).replace(/\/$/, "");

const TOKEN_KEY = "nova_admin_token";
const USER_KEY = "nova_admin_user";
const TENANT_KEY = "nova_admin_tenant";

/*
|--------------------------------------------------------------------------
| Local Storage Helpers
|--------------------------------------------------------------------------
*/

const read = (key) => {
  return localStorage.getItem(key);
};

const save = (key, value) => {
  if (value == null) {
    localStorage.removeItem(key);
    return;
  }

  localStorage.setItem(key, value);
};

/*
|--------------------------------------------------------------------------
| Generic API Request
|--------------------------------------------------------------------------
*/

async function request(
  path,
  {
    method = "GET",
    body,
    auth = true,
  } = {}
) {
  const headers = {};

  /*
   * Only send JSON content type when
   * a request actually has a body.
   */
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = read(TOKEN_KEY);

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}${path}`,
      {
        method,
        headers,

        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      }
    );
  } catch (error) {
    throw new Error(
      "Unable to reach backend API. Make sure the backend is running on http://localhost:5000."
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed (${response.status})`
    );
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

export const login = async (
  email,
  password
) => {
  const response = await request(
    "/auth/login",
    {
      method: "POST",

      body: {
        email,
        password,
      },

      auth: false,
    }
  );

  const data = response?.data || {};

  save(
    TOKEN_KEY,
    data.accessToken || ""
  );

  save(
    USER_KEY,
    JSON.stringify(
      data.user || {}
    )
  );

  save(
    TENANT_KEY,
    JSON.stringify(
      data.tenant || null
    )
  );

  return data;
};

export const logout = () => {
  save(TOKEN_KEY, null);
  save(USER_KEY, null);
  save(TENANT_KEY, null);
};

export const me = () => {
  try {
    return JSON.parse(
      read(USER_KEY) || "null"
    );
  } catch {
    return null;
  }
};

export const tenant = () => {
  try {
    return JSON.parse(
      read(TENANT_KEY) || "null"
    );
  } catch {
    return null;
  }
};

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

export const api = {
  /*
  |--------------------------------------------------------------------------
  | TENANT
  |--------------------------------------------------------------------------
  */

  tenant: () => {
    return request(
      "/tenants/me"
    );
  },

  updateTenant: (body) => {
    return request(
      "/tenants/me",
      {
        method: "PATCH",
        body,
      }
    );
  },

  /*
  |--------------------------------------------------------------------------
  | PRODUCTS
  |--------------------------------------------------------------------------
  */

  products: () => {
    return request(
      "/products"
    );
  },

  product: (id) => {
    return request(
      `/products/${id}`
    );
  },

  createProduct: (body) => {
    return request(
      "/products",
      {
        method: "POST",
        body,
      }
    );
  },

  updateProduct: (
    id,
    body
  ) => {
    return request(
      `/products/${id}`,
      {
        method: "PATCH",
        body,
      }
    );
  },

  deleteProduct: (id) => {
    return request(
      `/products/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  /*
  |--------------------------------------------------------------------------
  | CATEGORIES
  |--------------------------------------------------------------------------
  */

  categories: () => {
    return request(
      "/categories"
    );
  },

  createCategory: (body) => {
    return request(
      "/categories",
      {
        method: "POST",
        body,
      }
    );
  },

  updateCategory: (
    id,
    body
  ) => {
    return request(
      `/categories/${id}`,
      {
        method: "PATCH",
        body,
      }
    );
  },

  deleteCategory: (id) => {
    return request(
      `/categories/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  /*
  |--------------------------------------------------------------------------
  | ORDERS
  |--------------------------------------------------------------------------
  */

  orders: () => {
    return request(
      "/orders/admin"
    );
  },

  order: (id) => {
    return request(
      `/orders/admin/${id}`
    );
  },

  orderStatus: (
    id,
    status
  ) => {
    return request(
      `/orders/admin/${id}/status`,
      {
        method: "PATCH",

        body: {
          status,
        },
      }
    );
  },

  /*
  |--------------------------------------------------------------------------
  | INVENTORY
  |--------------------------------------------------------------------------
  */

  inventory: (
    productId
  ) => {
    return request(
      `/inventory/product/${productId}`
    );
  },

  inventoryHistory: () => {
    return request(
      "/inventory/history"
    );
  },

  adjustInventory: (
    body
  ) => {
    return request(
      "/inventory/adjust",
      {
        method: "POST",
        body,
      }
    );
  },

  /*
  |--------------------------------------------------------------------------
  | PAYMENTS
  |--------------------------------------------------------------------------
  */

  payments: async () => {
    const response =
      await request(
        "/payments/admin"
      );

    /*
     * Backend can return:
     *
     * data: [...]
     *
     * OR:
     *
     * data: {
     *   payments: [...]
     * }
     *
     * Normalize both forms.
     */

    if (
      Array.isArray(
        response?.data
      )
    ) {
      return {
        ...response,

        data: {
          payments:
            response.data,
        },
      };
    }

    if (
      Array.isArray(
        response?.data?.payments
      )
    ) {
      return response;
    }

    return {
      ...response,

      data: {
        payments: [],
      },
    };
  },

  /*
  |--------------------------------------------------------------------------
  | REVIEWS
  |--------------------------------------------------------------------------
  */

  reviews: () => {
    return request(
      "/reviews/admin"
    );
  },

  review: (id) => {
    return request(
      `/reviews/admin/${id}`
    );
  },

  moderateReview: (
    id,
    body
  ) => {
    return request(
      `/reviews/admin/${id}/moderate`,
      {
        method: "PATCH",
        body,
      }
    );
  },

  /*
  |--------------------------------------------------------------------------
  | COUPONS
  |--------------------------------------------------------------------------
  */

  coupons: () => {
    return request(
      "/coupons"
    );
  },

  createCoupon: (body) => {
    return request(
      "/coupons",
      {
        method: "POST",
        body,
      }
    );
  },

  updateCoupon: (
    id,
    body
  ) => {
    return request(
      `/coupons/${id}`,
      {
        method: "PATCH",
        body,
      }
    );
  },

  deactivateCoupon: (
    id
  ) => {
    return request(
      `/coupons/${id}/deactivate`,
      {
        method: "PATCH",
      }
    );
  },

  /*
  |--------------------------------------------------------------------------
  | SHIPPING
  |--------------------------------------------------------------------------
  */

  shippingZones: () => {
    return request(
      "/shipping/zones?includeInactive=true"
    );
  },

  createShippingZone: (
    body
  ) => {
    return request(
      "/shipping/zones",
      {
        method: "POST",
        body,
      }
    );
  },

  updateShippingZone: (
    id,
    body
  ) => {
    return request(
      `/shipping/zones/${id}`,
      {
        method: "PATCH",
        body,
      }
    );
  },

  deleteShippingZone: (
    id
  ) => {
    return request(
      `/shipping/zones/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  shippingRates: (
    zoneId
  ) => {
    return request(
      `/shipping/zones/${zoneId}/rates`
    );
  },

  createShippingRate: (
    zoneId,
    body
  ) => {
    return request(
      `/shipping/zones/${zoneId}/rates`,
      {
        method: "POST",
        body,
      }
    );
  },

  updateShippingRate: (
    id,
    body
  ) => {
    return request(
      `/shipping/rates/${id}`,
      {
        method: "PATCH",
        body,
      }
    );
  },

  deleteShippingRate: (
    id
  ) => {
    return request(
      `/shipping/rates/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  /*
  |--------------------------------------------------------------------------
  | TAXES
  |--------------------------------------------------------------------------
  */

  taxes: () => {
    return request(
      "/taxes"
    );
  },

  createTax: (body) => {
    return request(
      "/taxes",
      {
        method: "POST",
        body,
      }
    );
  },

  updateTax: (
    id,
    body
  ) => {
    return request(
      `/taxes/${id}`,
      {
        method: "PATCH",
        body,
      }
    );
  },

  deleteTax: (
    id
  ) => {
    return request(
      `/taxes/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  notifications: () => {
    return request(
      "/notifications"
    );
  },

  markAllNotificationsRead: () => {
    return request(
      "/notifications/read-all",
      {
        method: "PATCH",
      }
    );
  },

  /*
   * Customer support reply.
   *
   * notificationId = admin's support notification ID
   * message        = reply text
   */

  replyToSupport: (
    notificationId,
    message
  ) => {
    return request(
      `/notifications/support/${notificationId}/reply`,
      {
        method: "POST",

        body: {
          message,
        },
      }
    );
  },

  /*
  |--------------------------------------------------------------------------
  | PLATFORM / SUPER ADMIN
  |--------------------------------------------------------------------------
  */

  platformOverview: () => {
    return request(
      "/platform/overview"
    );
  },

  platformTenants: () => {
    return request(
      "/platform/tenants"
    );
  },

  platformTenantStatus: (
    id,
    status
  ) => {
    return request(
      `/platform/tenants/${id}/status`,
      {
        method: "PATCH",

        body: {
          status,
        },
      }
    );
  },

  platformUsers: () => {
    return request(
      "/platform/users"
    );
  },
};

/*
|--------------------------------------------------------------------------
| SESSION
|--------------------------------------------------------------------------
*/

export const session = {
  token: () => {
    return read(
      TOKEN_KEY
    );
  },

  user: me,

  tenant,

  clear: logout,
};