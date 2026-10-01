import React, { useEffect, useState } from "react";
import { api, login, session } from "./api";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const initials = (name) =>
  (name || "Admin")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const NAV = [
  ["overview", "Overview", "⌂"],
  ["branding", "Storefront", "✦"],
  ["products", "Products", "▦"],
  ["categories", "Categories", "◈"],
  ["orders", "Orders", "◌"],
  ["inventory", "Inventory", "▥"],
  ["payments", "Payments", "₹"],
  ["reviews", "Reviews", "★"],
  ["coupons", "Coupons", "%"],
  ["shipping", "Shipping", "⌁"],
  ["taxes", "Taxes", "⊞"],
  ["notifications", "Notifications", "◔"],
];

const PLATFORM = [
  ["overview", "Platform overview", "⌂"],
  ["tenants", "Tenants", "▦"],
  ["users", "Users", "♙"],
];

function Toast({ text, type = "ok" }) {
  if (!text) return null;

  return (
    <div className={`toast ${type}`}>
      {type === "ok" ? "✓" : "!"} {text}
    </div>
  );
}

function Empty({ title, sub }) {
  return (
    <div className="empty">
      <div className="emptyIcon">◌</div>
      <b>{title}</b>
      <span>{sub}</span>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="modalBack"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal">
        <div className="modalHead">
          <div>
            <span className="eyebrow">WORKSPACE</span>
            <h2>{title}</h2>
          </div>

          <button className="iconBtn" onClick={onClose}>
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

function TextArea({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea {...props} />
    </label>
  );
}

function Status({ children }) {
  const value = String(children || "");
  const className = value.toLowerCase().replaceAll("_", "-");

  return (
    <span className={`status ${className}`}>
      {value.replaceAll("_", " ") || "—"}
    </span>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      const data = await login(email, password);
      onLogin(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="loginGlow one" />
      <div className="loginGlow two" />

      <form className="loginCard" onSubmit={submit}>
        <div className="brandMark">N</div>

        <span className="eyebrow">NOVA COMMERCE</span>

        <h1>
          Run your store
          <br />
          <em>with clarity.</em>
        </h1>

        <p>
          Secure commerce operations for products, orders,
          inventory and your branded storefront.
        </p>

        {error && <div className="alert">{error}</div>}

        <Field
          label="Business email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@store.com"
          required
        />

        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
        />

        <button className="primary big" disabled={busy}>
          {busy ? "Signing in…" : "Sign in to workspace →"}
        </button>

        <small>
          Tenant-scoped access • Role protected • Secure API
        </small>
      </form>
    </div>
  );
}

function AdminSidebarStyles() {
  return (
    <style>{`
      .sidebar nav::-webkit-scrollbar {
        width: 6px;
      }

      .sidebar nav::-webkit-scrollbar-track {
        background: transparent;
      }

      .sidebar nav::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.24);
        border-radius: 999px;
      }

      .sidebar nav::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.36);
      }

      .notificationToolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 14px;
      }

      .notificationHint {
        margin-right: auto;
        color: #7c8598;
        font-size: 12px;
      }

      .supportEmpty {
        margin-top: 14px;
        padding: 16px 18px;
        border: 1px dashed rgba(99, 102, 241, 0.2);
        border-radius: 16px;
        background: rgba(99, 102, 241, 0.035);
        color: #6d7485;
        font-size: 12px;
        line-height: 1.6;
      }

      .tableMeta {
        display: block;
        margin-top: 5px;
        color: #8992a5;
        font-size: 10px;
      }

      .supportRequest {
        margin-bottom: 16px;
        padding: 15px 16px;
        border: 1px solid rgba(99, 102, 241, 0.12);
        border-radius: 16px;
        background: #f8f9ff;
      }

      .supportRequest b {
        display: block;
        margin-top: 5px;
        font-size: 14px;
      }

      .supportRequest p {
        margin: 8px 0;
        color: #5f687b;
        line-height: 1.65;
      }

      .supportRequest small {
        color: #8b93a5;
      }
    `}</style>
  );
}

function SupportReplyModal({
  notification,
  action,
  onClose,
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const customerId =
    notification?.data?.customerId;

  const threadId =
    notification?.data?.supportThreadId;

  async function submit(event) {
    event.preventDefault();

    const value = message.trim();

    if (value.length < 2) {
      setError(
        "Reply must be at least 2 characters."
      );
      return;
    }

    if (value.length > 1000) {
      setError(
        "Reply must be 1000 characters or less."
      );
      return;
    }

    setSending(true);
    setError("");

    await action(
      () =>
        api.replyToSupport(
          notification._id,
          value
        ),
      "Support reply sent to customer"
    );

    setSending(false);
  }

  return (
    <Modal
      title="Reply to customer"
      onClose={onClose}
    >
      <div className="supportRequest">
        <span className="eyebrow">
          CUSTOMER SUPPORT
        </span>

        <b>
          {notification?.title ||
            "Support request"}
        </b>

        <p>
          {notification?.message ||
            "No message provided."}
        </p>

        <small>
          Customer: {
            customerId
              ? String(customerId).slice(-8)
              : "—"
          }

          {threadId
            ? ` • Thread: ${threadId}`
            : ""}
        </small>
      </div>

      {error && (
        <div className="alert">
          {error}
        </div>
      )}

      <TextArea
        label="Your reply"
        value={message}
        onChange={(event) =>
          setMessage(event.target.value)
        }
        placeholder="Write a clear response to the customer…"
        maxLength={1000}
      />

      <div className="modalActions">
        <button
          className="ghost"
          type="button"
          onClick={onClose}
          disabled={sending}
        >
          Cancel
        </button>

        <button
          className="primary"
          type="button"
          onClick={submit}
          disabled={sending}
        >
          {sending
            ? "Sending…"
            : "Send reply →"}
        </button>
      </div>
    </Modal>
  );
}

function App() {
  const [user, setUser] = useState(session.user());
  const [tenant, setTenant] = useState(session.tenant());

  const [page, setPage] = useState("overview");
  const [data, setData] = useState({});

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const platform = user?.role === "SUPER_ADMIN";
  const nav = platform ? PLATFORM : NAV;

  useEffect(() => {
    if (!user) return;

    loadPage(page);
  }, [page, user?.id, platform]);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast("");
    }, 2600);

    return () => clearTimeout(timer);
  }, [toast]);

  async function loadPage(currentPage = page) {
    setBusy(true);
    setError("");

    try {
      if (currentPage === "overview") {
        if (platform) {
          const response = await api.platformOverview();

          setData({
            overview: response?.data || response || {},
          });
        } else {
          const [
            tenantResponse,
            productsResponse,
            ordersResponse,
            paymentsResponse,
          ] = await Promise.all([
            api.tenant(),
            api.products(),
            api.orders(),
            api.payments(),
          ]);

          const currentTenant =
            tenantResponse?.data?.tenant ||
            tenantResponse?.tenant ||
            tenantResponse;

          const products =
            productsResponse?.data?.products ||
            productsResponse?.data ||
            [];

          const orders =
            ordersResponse?.data?.orders ||
            ordersResponse?.data ||
            [];

          const payments =
            paymentsResponse?.data?.payments ||
            paymentsResponse?.data ||
            [];

          setTenant(currentTenant);

          setData({
            products: Array.isArray(products) ? products : [],
            orders: Array.isArray(orders) ? orders : [],
            payments: Array.isArray(payments) ? payments : [],
          });
        }

        return;
      }

      if (currentPage === "tenants") {
        const response = await api.platformTenants();

        setData({
          tenants: response?.data?.tenants || [],
        });

        return;
      }

      if (currentPage === "users") {
        const response = await api.platformUsers();

        setData({
          users: response?.data?.users || [],
        });

        return;
      }

      if (currentPage === "products") {
        const [productsResponse, categoriesResponse] = await Promise.all([
          api.products(),
          api.categories(),
        ]);

        setData({
          products: productsResponse?.data?.products || [],
          categories: categoriesResponse?.data?.categories || [],
        });

        return;
      }

      if (currentPage === "categories") {
        const response = await api.categories();

        setData({
          categories: response?.data?.categories || [],
        });

        return;
      }

      if (currentPage === "orders") {
        const response = await api.orders();

        setData({
          orders: response?.data?.orders || [],
        });

        return;
      }

      if (currentPage === "payments") {
        const response = await api.payments();

        const payments =
          response?.data?.payments ||
          response?.payments ||
          [];

        setData({
          payments: Array.isArray(payments) ? payments : [],
        });

        return;
      }

      if (currentPage === "inventory") {
        const productsResponse = await api.products();
        const historyResponse = await api.inventoryHistory();

        setData({
          products: productsResponse?.data?.products || [],
          history:
            historyResponse?.data?.transactions || [],
        });

        return;
      }

      if (currentPage === "reviews") {
        const response = await api.reviews();

        setData({
          reviews: response?.data?.reviews || [],
        });

        return;
      }

      if (currentPage === "coupons") {
        const response = await api.coupons();

        setData({
          coupons: response?.data?.coupons || [],
        });

        return;
      }

      if (currentPage === "shipping") {
        const response = await api.shippingZones();

        setData({
          zones: response?.data?.zones || [],
        });

        return;
      }

      if (currentPage === "taxes") {
        const response = await api.taxes();

        setData({
          taxes: response?.data?.taxRules || [],
        });

        return;
      }

      if (currentPage === "notifications") {
        const response = await api.notifications();

        const notifications =
          response?.data?.notifications ||
          response?.notifications ||
          [];

        setData({
          notifications: Array.isArray(notifications)
            ? notifications
            : [],
        });

        return;
      }
      if (currentPage === "branding") {
        const response = await api.tenant();

        const currentTenant =
          response?.data?.tenant || response?.tenant || response;

        setTenant(currentTenant);

        setData({
          tenant: currentTenant,
        });
      }
    } catch (error) {
      const message = error.message || "Something went wrong.";

      /*
       * Access token expire hone ke baad dashboard ko
       * stale data ke saath open nahi rakhna.
       */
      if (
        message.toLowerCase().includes("access token expired") ||
        message.toLowerCase().includes("token expired") ||
        message.toLowerCase().includes("invalid token")
      ) {
        session.clear();

        setUser(null);
        setTenant(null);
        setData({});
        setPage("overview");
        setError("Your session expired. Please sign in again.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  function go(nextPage) {
    setPage(nextPage);
    setError("");
  }

  async function action(fn, message) {
    try {
      setBusy(true);

      await fn();

      setToast(message);
      setModal(null);

      await loadPage(page);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    session.clear();

    setUser(null);
    setTenant(null);
    setData({});
    setPage("overview");
  }

  if (!user) {
    return (
      <Login
        onLogin={(data) => {
          setUser(data.user);
          setTenant(data.tenant);
          setPage("overview");
          setError("");
        }}
      />
    );
  }

  return (
    <div className="app">
      <AdminSidebarStyles />

      <aside className="sidebar">
        <div className="sideBrand">
          <div className="brandMark">N</div>

          <div>
            <b>Nova</b>
            <span>
              {platform ? "Platform" : "Commerce"}
            </span>
          </div>
        </div>

        <div className="workspace">
          <span>WORKSPACE</span>
          <b>
            {platform
              ? "Platform Control"
              : tenant?.name || "Store"}
          </b>
        </div>

        <nav
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: 4,
            paddingBottom: 8,
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,.28) transparent",
          }}
        >
          {nav.map(([id, label, icon]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
            >
              <i>{icon}</i>
              {label}
            </button>
          ))}
        </nav>

        <div className="sideBottom">
          <div className="userMini">
            <div className="avatar">
              {initials(user.name)}
            </div>

            <div>
              <b>{user.name}</b>
              <span>
                {user.role.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <button className="logout" onClick={signOut}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div>
            <span className="eyebrow">
              {platform
                ? "PLATFORM CONTROL"
                : "TENANT WORKSPACE"}
            </span>

            <h1>
              {nav.find((item) => item[0] === page)?.[1] ||
                "Overview"}
            </h1>
          </div>

          <div className="topRight">
            <span className="live">
              <i /> LIVE
            </span>

            <button className="avatar topAvatar">
              {initials(user.name)}
            </button>
          </div>
        </header>

        <div className="content">
          {error && (
            <div className="alert">
              {error}

              <button onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}

          {busy && <div className="loadingBar" />}

          {platform ? (
            <PlatformPage
              page={page}
              data={data}
              action={action}
            />
          ) : (
            <SellerPage
              page={page}
              data={data}
              tenant={tenant}
              setModal={setModal}
              action={action}
              reload={() => loadPage(page)}
            />
          )}
        </div>
      </main>

      <Toast text={toast} />

      {modal}
    </div>
  );
}

function Stats({ items }) {
  return (
    <div className="stats">
      {items.map((item, index) => (
        <div className="stat" key={`${item[0]}-${index}`}>
          <span>{item[0]}</span>
          <strong>{item[1]}</strong>
          <small>{item[2]}</small>
          <div className={`spark s${index}`} />
        </div>
      ))}
    </div>
  );
}

function SellerPage({
  page,
  data,
  tenant,
  setModal,
  action,
  reload,
}) {
  const closeModal = () => setModal(null);
  const products = data.products || [];
  const orders = data.orders || [];
  const payments = data.payments || [];

  if (page === "overview") {
    const revenue = payments
      .filter((payment) => payment.status === "PAID")
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );

    return (
      <>
        <Stats
          items={[
            [
              "Products",
              products.length,
              "Live catalogue",
            ],
            [
              "Orders",
              orders.length,
              "Customer orders",
            ],
            [
              "Payments",
              payments.filter(
                (payment) => payment.status === "PAID"
              ).length,
              "Successful",
            ],
            [
              "Revenue",
              money(revenue),
              "Recorded payments",
            ],
          ]}
        />

        <div className="grid2">
          <Panel
            title="Order pipeline"
            action={
              <button
                className="ghost"
                onClick={reload}
              >
                Refresh
              </button>
            }
          >
            <div className="pipeline">
              {[
                "PENDING_PAYMENT",
                "CONFIRMED",
                "PROCESSING",
                "SHIPPED",
                "DELIVERED",
              ].map((status) => (
                <div key={status}>
                  <b>
                    {
                      orders.filter(
                        (order) =>
                          order.status === status
                      ).length
                    }
                  </b>

                  <span>
                    {status.replaceAll("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recent orders">
            <OrderTable
              orders={orders.slice(0, 6)}
            />
          </Panel>
        </div>

        <Panel
          title="Store identity"
          sub="Live tenant configuration"
        >
          <div className="identity">
            <div className="logoPreview">
              {tenant?.name?.[0] || "N"}
            </div>

            <div>
              <h3>{tenant?.name || "Store"}</h3>

              <p>
                {tenant?.slug || "—"} •{" "}
                {tenant?.businessType || "GENERAL"}
              </p>
            </div>

            <button
              className="ghost"
              onClick={() =>
                setModal(
                  <BrandingModal
                    tenant={tenant}
                    action={action}
                    onClose={closeModal}
                  />
                )
              }
            >
              Customize storefront
            </button>
          </div>
        </Panel>
      </>
    );
  }

  if (page === "products") {
    return (
      <ResourcePage
        title="Products"
        count={products.length}
        add="Add product"
        onAdd={() =>
          setModal(
            <ProductModal
              categories={data.categories || []}
              action={action}
              onClose={closeModal}
            />
          )
        }
      >
        <div className="cardsGrid">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              p={product}
              onEdit={() =>
                setModal(
                  <ProductModal
                    product={product}
                    categories={data.categories || []}
                    action={action}
                    onClose={closeModal}
                  />
                )
              }
              onDelete={() =>
                window.confirm(
                  "Delete this product?"
                ) &&
                action(
                  () =>
                    api.deleteProduct(
                      product._id
                    ),
                  "Product deleted"
                )
              }
            />
          ))}
        </div>

        {!products.length && (
          <Empty
            title="No products yet"
            sub="Create your first sellable product."
          />
        )}
      </ResourcePage>
    );
  }

  if (page === "categories") {
    return (
      <ResourcePage
        title="Categories"
        count={(data.categories || []).length}
        add="New category"
        onAdd={() =>
          setModal(
            <CategoryModal action={action} onClose={closeModal} />
          )
        }
      >
        <Table
          rows={data.categories || []}
          cols={["Name", "Slug", "Sort"]}
          render={(category) => (
            <>
              <td>
                <b>{category.name}</b>
              </td>

              <td>{category.slug}</td>

              <td>{category.sortOrder ?? 0}</td>

              <td>
                <button
                  className="tiny"
                  onClick={() =>
                    setModal(
                      <CategoryModal
                        item={category}
                        action={action}
                        onClose={closeModal}
                      />
                    )
                  }
                >
                  Edit
                </button>
              </td>
            </>
          )}
        />
      </ResourcePage>
    );
  }

  if (page === "orders") {
    return (
      <ResourcePage
        title="Orders"
        count={orders.length}
      >
        <OrderTable
          orders={orders}
          onStatus={(id, status) =>
            action(
              () =>
                api.orderStatus(id, status),
              `Order moved to ${status}`
            )
          }
        />
      </ResourcePage>
    );
  }

  if (page === "payments") {
    return (
      <ResourcePage
        title="Payments"
        count={payments.length}
      >
        <Table
          rows={payments}
          cols={[
            "Payment",
            "Order",
            "Amount",
            "Status",
            "Date",
          ]}
          render={(payment) => (
            <>
              <td>
                <b>
                  {String(
                    payment._id || ""
                  ).slice(-8)}
                </b>
              </td>

              <td>
                {String(
                  payment.orderId || ""
                ).slice(-8) || "—"}
              </td>

              <td>{money(payment.amount)}</td>

              <td>
                <Status>
                  {payment.status}
                </Status>
              </td>

              <td>
                {date(payment.createdAt)}
              </td>
            </>
          )}
        />
      </ResourcePage>
    );
  }

  if (page === "inventory") {
    return (
      <InventoryPage
        data={data}
        action={action}
      />
    );
  }

  if (page === "reviews") {
    return (
      <ReviewsPage
        data={data}
        action={action}
      />
    );
  }

  if (page === "coupons") {
    return (
      <CouponsPage
        data={data}
        action={action}
      />
    );
  }

  if (page === "shipping") {
    return (
      <ShippingPage
        data={data}
        action={action}
      />
    );
  }

  if (page === "taxes") {
    return (
      <TaxPage
        data={data}
        action={action}
      />
    );
  }

  if (page === "notifications") {
    const notifications =
      data.notifications || [];

    const supportNotifications =
      notifications.filter(
        (notification) =>
          notification.event ===
          "CUSTOMER_SUPPORT_MESSAGE"
      );

    const unreadCount =
      notifications.filter(
        (notification) =>
          notification.isRead === false
      ).length;

    return (
      <ResourcePage
        title="Notifications"
        count={unreadCount}
        add="Mark all read"
        onAdd={() =>
          action(
            () =>
              api.markAllNotificationsRead(),
            "Notifications marked read"
          )
        }
      >
        <div className="notificationToolbar">
          <span className="notificationHint">
            {supportNotifications.length > 0
              ? `${supportNotifications.length} customer support request${
                  supportNotifications.length === 1
                    ? ""
                    : "s"
                }`
              : "Customer support requests will appear here."}
          </span>

          <button
            className="ghost"
            type="button"
            onClick={reload}
          >
            Refresh
          </button>
        </div>

        <Table
          rows={notifications}
          cols={[
            "Title",
            "Message",
            "Status",
            "Date",
            "Action",
          ]}
          render={(notification) => {
            const isSupportMessage =
              notification.event ===
              "CUSTOMER_SUPPORT_MESSAGE";

            return (
              <>
                <td>
                  <b>
                    {notification.title ||
                      "Notification"}
                  </b>
                </td>

                <td>
                  <div>
                    {notification.message ||
                      "—"}
                  </div>

                  {isSupportMessage &&
                    notification.data?.customerId && (
                      <small className="tableMeta">
                        Customer • {
                          String(
                            notification.data.customerId
                          ).slice(-8)
                        }
                      </small>
                    )}
                </td>

                <td>
                  <Status>
                    {notification.isRead
                      ? "READ"
                      : "UNREAD"}
                  </Status>
                </td>

                <td>
                  {date(
                    notification.createdAt
                  )}
                </td>

                <td>
                  {isSupportMessage ? (
                    <button
                      className="tiny"
                      type="button"
                      onClick={() =>
                        setModal(
                          <SupportReplyModal
                            notification={notification}
                            action={action}
                            onClose={() =>
                              setModal(null)
                            }
                          />
                        )
                      }
                    >
                      Reply
                    </button>
                  ) : (
                    <span className="muted">
                      —
                    </span>
                  )}
                </td>
              </>
            );
          }}
        />

        {supportNotifications.length === 0 && (
          <div className="supportEmpty">
            <strong>Customer support</strong>
            <br />
            When a customer sends a support
            message from the storefront, it will
            appear here with a <b>Reply</b> button.
          </div>
        )}
      </ResourcePage>
    );
  }

  if (page === "branding") {
    return (
      <BrandingPage
        tenant={data.tenant || tenant}
        onEdit={() =>
          setModal(
            <BrandingModal
              tenant={data.tenant || tenant}
              action={action}
              onClose={closeModal}
            />
          )
        }
      />
    );
  }

  return (
    <Empty
      title="Choose a workspace module"
      sub="Use the navigation to manage your store."
    />
  );
}

function PlatformPage({ page, data, action }) {
  if (page === "overview") {
    const overview = data.overview || {};

    return (
      <>
        <Stats
          items={[
            [
              "Tenants",
              overview.tenants ?? 0,
              "All stores",
            ],
            [
              "Users",
              overview.users ?? 0,
              "Platform users",
            ],
            [
              "Orders",
              overview.orders ?? 0,
              "Across stores",
            ],
            [
              "Products",
              overview.products ?? 0,
              "Catalogue items",
            ],
          ]}
        />

        <Panel
          title="Platform control"
          sub="Cross-tenant operational visibility"
        >
          <div className="callout">
            <b>Multi-tenant boundary active</b>

            <span>
              Tenant owners and staff operate only
              inside their assigned store. Platform
              actions are restricted to SUPER_ADMIN.
            </span>
          </div>
        </Panel>
      </>
    );
  }

  if (page === "tenants") {
    return (
      <ResourcePage
        title="Tenants"
        count={(data.tenants || []).length}
      >
        <Table
          rows={data.tenants || []}
          cols={[
            "Store",
            "Slug",
            "Business",
            "Status",
            "Created",
          ]}
          render={(tenant) => (
            <>
              <td>
                <b>{tenant.name}</b>
              </td>

              <td>{tenant.slug}</td>

              <td>{tenant.businessType}</td>

              <td>
                <Status>{tenant.status}</Status>
              </td>

              <td>
                {date(tenant.createdAt)}
              </td>

              <td>
                <select
                  className="tinySelect"
                  value={tenant.status}
                  onChange={(event) =>
                    action(
                      () =>
                        api.platformTenantStatus(
                          tenant._id,
                          event.target.value
                        ),
                      "Tenant status updated"
                    )
                  }
                >
                  <option>ACTIVE</option>
                  <option>SUSPENDED</option>
                  <option>PENDING</option>
                </select>
              </td>
            </>
          )}
        />
      </ResourcePage>
    );
  }

  return (
    <ResourcePage
      title="Users"
      count={(data.users || []).length}
    >
      <Table
        rows={data.users || []}
        cols={[
          "Name",
          "Email",
          "Role",
          "Tenant",
          "Active",
        ]}
        render={(user) => (
          <>
            <td>
              <b>{user.name}</b>
            </td>

            <td>{user.email}</td>

            <td>
              <Status>{user.role}</Status>
            </td>

            <td>
              {user.tenantId?.name ||
                user.tenantId?.slug ||
                "Platform"}
            </td>

            <td>
              {user.isActive ? "Yes" : "No"}
            </td>
          </>
        )}
      />
    </ResourcePage>
  );
}

function Panel({
  title,
  sub,
  action,
  children,
}) {
  return (
    <section className="panel">
      <div className="panelHead">
        <div>
          <h2>{title}</h2>

          {sub && <span>{sub}</span>}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function ResourcePage({
  title,
  count,
  add,
  onAdd,
  children,
}) {
  return (
    <>
      <div className="sectionIntro">
        <div>
          <span className="eyebrow">
            OPERATIONS
          </span>

          <h2>
            {title}{" "}
            <small>{count ?? ""}</small>
          </h2>
        </div>

        {add && (
          <button
            className="primary"
            onClick={onAdd}
          >
            {add} +
          </button>
        )}
      </div>

      {children}
    </>
  );
}

function Table({ rows, cols, render }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {cols.map((column) => (
              <th key={column}>{column}</th>
            ))}

            <th />
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || `row-${index}`}>
              {render(row)}
            </tr>
          ))}
        </tbody>
      </table>

      {!rows.length && (
        <Empty
          title="Nothing here yet"
          sub="Data will appear as your store grows."
        />
      )}
    </div>
  );
}

function OrderTable({ orders, onStatus }) {
  return (
    <Table
      rows={orders}
      cols={[
        "Order",
        "Customer",
        "Total",
        "Status",
        "Date",
      ]}
      render={(order) => (
        <>
          <td>
            <b>
              #{String(order._id || "").slice(-8)}
            </b>
          </td>

          <td>
            {order.customerId?.name ||
              order.customer?.name ||
              "Customer"}
          </td>

          <td>{money(order.total)}</td>

          <td>
            {onStatus ? (
              <select
                className="tinySelect"
                value={order.status}
                onChange={(event) =>
                  onStatus(
                    order._id,
                    event.target.value
                  )
                }
              >
                <option>PENDING_PAYMENT</option>
                <option>CONFIRMED</option>
                <option>PROCESSING</option>
                <option>SHIPPED</option>
                <option>DELIVERED</option>
                <option>CANCELLED</option>
              </select>
            ) : (
              <Status>{order.status}</Status>
            )}
          </td>

          <td>{date(order.createdAt)}</td>
        </>
      )}
    />
  );
}

function ProductCard({
  p,
  onEdit,
  onDelete,
}) {
  const imageUrl = p.images?.[0] || "";

  return (
    <div className="productCard">
      <div className="productVisual">
        {imageUrl ? (
          <img src={imageUrl} alt={p.name || "Product"} />
        ) : (
          <span>{p.name?.[0] || "P"}</span>
        )}

        <b>
          {p.isFeatured ? "FEATURED" : String(p.status || "DRAFT")}
        </b>
      </div>

      <div className="productInfo">
        <h3>{p.name}</h3>

        <p>{p.sku || p.slug || "No SKU"}</p>

        <div>
          <strong>{money(p.price)}</strong>

          <span>
            {p.stockQuantity ?? 0} in stock
          </span>
        </div>

        <footer>
          <button
            className="ghost"
            onClick={onEdit}
          >
            Edit
          </button>

          <button
            className="dangerText"
            onClick={onDelete}
          >
            Delete
          </button>
        </footer>
      </div>
    </div>
  );
}

function InventoryPage({ data, action }) {
  return (
    <>
      <ResourcePage
        title="Inventory"
        count={(data.products || []).length}
      >
        <Table
          rows={data.products || []}
          cols={[
            "Product",
            "Stock",
            "Reserved",
            "Available",
            "Action",
          ]}
          render={(product) => (
            <>
              <td>
                <b>{product.name}</b>
              </td>

              <td>
                {product.stockQuantity ?? 0}
              </td>

              <td>
                {product.reservedQuantity ?? 0}
              </td>

              <td>
                {Math.max(
                  0,
                  (product.stockQuantity || 0) -
                    (product.reservedQuantity || 0)
                )}
              </td>

              <td>
                <button
                  className="tiny"
                  onClick={() => {
                    const input = window.prompt(
                      "Quantity adjustment (+ add / - remove)",
                      "5"
                    );

                    if (input === null) {
                      return;
                    }

                    const quantity = Number(
                      String(input).trim()
                    );

                    if (
                      !Number.isFinite(quantity) ||
                      quantity === 0
                    ) {
                      window.alert(
                        "Enter a valid non-zero quantity. Use a positive number to add stock or a negative number to remove stock."
                      );
                      return;
                    }

                    const type =
                      quantity > 0
                        ? "STOCK_IN"
                        : "STOCK_OUT";

                    action(
                      () =>
                        api.adjustInventory({
                          productId: product._id,
                          quantity: Math.abs(quantity),
                          type,
                          reason:
                            quantity > 0
                              ? "Admin stock addition"
                              : "Admin stock removal",
                        }),
                      "Inventory adjusted"
                    );
                  }}
                >
                  Adjust
                </button>
              </td>
            </>
          )}
        />
      </ResourcePage>

      <Panel title="Recent inventory activity">
        <Table
          rows={(data.history || []).slice(0, 10)}
          cols={[
            "Product",
            "Type",
            "Qty",
            "Date",
          ]}
          render={(item) => (
            <>
              <td>
                {item.productId?.name ||
                  String(
                    item.productId || ""
                  ).slice(-8)}
              </td>

              <td>
                <Status>{item.type}</Status>
              </td>

              <td>{item.quantity}</td>

              <td>{date(item.createdAt)}</td>
            </>
          )}
        />
      </Panel>
    </>
  );
}

function ReviewsPage({ data, action }) {
  return (
    <ResourcePage
      title="Reviews"
      count={(data.reviews || []).length}
    >
      <Table
        rows={data.reviews || []}
        cols={[
          "Customer",
          "Rating",
          "Comment",
          "Status",
          "Date",
        ]}
        render={(review) => (
          <>
            <td>
              <b>
                {review.customerId?.name ||
                  "Customer"}
              </b>
            </td>

            <td>★ {review.rating}</td>

            <td>{review.comment}</td>

            <td>
              <Status>{review.status}</Status>
            </td>

            <td>{date(review.createdAt)}</td>

            <td>
              <button
                className="tiny"
                onClick={() =>
                  action(
                    () =>
                      api.moderateReview(
                        review._id,
                        {
                          status:
                            review.status ===
                            "APPROVED"
                              ? "REJECTED"
                              : "APPROVED",
                        }
                      ),
                    "Review moderated"
                  )
                }
              >
                {review.status === "APPROVED"
                  ? "Reject"
                  : "Approve"}
              </button>
            </td>
          </>
        )}
      />
    </ResourcePage>
  );
}

function CouponsPage({ data, action }) {
  return (
    <ResourcePage
      title="Coupons"
      count={(data.coupons || []).length}
      add="Create coupon"
      onAdd={() =>
        action(
          () =>
            api.createCoupon({
              code: "WELCOME10",
              type: "PERCENTAGE",
              value: 10,
              active: true,
            }),
          "Coupon created"
        )
      }
    >
      <Table
        rows={data.coupons || []}
        cols={[
          "Code",
          "Type",
          "Value",
          "Active",
          "Expires",
        ]}
        render={(coupon) => (
          <>
            <td>
              <b>{coupon.code}</b>
            </td>

            <td>{coupon.type}</td>

            <td>
              {coupon.type === "PERCENTAGE"
                ? `${coupon.value}%`
                : money(coupon.value)}
            </td>

            <td>
              {coupon.active ? "Yes" : "No"}
            </td>

            <td>
              {date(
                coupon.endDate ||
                  coupon.expiresAt
              )}
            </td>

            <td>
              {coupon.active && (
                <button
                  className="tiny"
                  onClick={() =>
                    action(
                      () =>
                        api.deactivateCoupon(
                          coupon._id
                        ),
                      "Coupon deactivated"
                    )
                  }
                >
                  Deactivate
                </button>
              )}
            </td>
          </>
        )}
      />
    </ResourcePage>
  );
}

function ShippingPage({ data, action }) {
  return (
    <ResourcePage
      title="Shipping zones"
      count={(data.zones || []).length}
      add="Add zone"
      onAdd={() =>
        action(
          () =>
            api.createShippingZone({
              name: "India Delivery",
              countries: ["IN", "INDIA"],
              priority: 10,
              isActive: true,
            }),
          "Shipping zone created"
        )
      }
    >
      <Table
        rows={data.zones || []}
        cols={[
          "Zone",
          "Countries",
          "Priority",
          "Active",
        ]}
        render={(zone) => (
          <>
            <td>
              <b>{zone.name}</b>
            </td>

            <td>
              {(zone.countries || []).join(", ") ||
                "All"}
            </td>

            <td>{zone.priority}</td>

            <td>
              {zone.isActive ? "Yes" : "No"}
            </td>

            <td>
              <button
                className="tiny"
                onClick={() =>
                  action(
                    () =>
                      api.deleteShippingZone(
                        zone._id
                      ),
                    "Zone deleted"
                  )
                }
              >
                Delete
              </button>
            </td>
          </>
        )}
      />
    </ResourcePage>
  );
}

function TaxPage({ data, action }) {
  return (
    <ResourcePage
      title="Tax rules"
      count={(data.taxes || []).length}
      add="Create tax"
      onAdd={() =>
        action(
          () =>
            api.createTax({
              name: "GST",
              rate: 18,
              isActive: true,
            }),
          "Tax rule created"
        )
      }
    >
      <Table
        rows={data.taxes || []}
        cols={[
          "Name",
          "Rate",
          "Active",
          "Created",
        ]}
        render={(tax) => (
          <>
            <td>
              <b>{tax.name}</b>
            </td>

            <td>{tax.rate}%</td>

            <td>
              {tax.isActive ? "Yes" : "No"}
            </td>

            <td>{date(tax.createdAt)}</td>

            <td>
              <button
                className="tiny"
                onClick={() =>
                  action(
                    () =>
                      api.deleteTax(tax._id),
                    "Tax rule deleted"
                  )
                }
              >
                Delete
              </button>
            </td>
          </>
        )}
      />
    </ResourcePage>
  );
}

function ProductModal({
  product,
  categories = [],
  action,
  onClose,
}) {
  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    shortDescription: product?.shortDescription || "",
    sku: product?.sku || "",
    price: product?.price ?? "",
    compareAtPrice: product?.compareAtPrice ?? "",
    costPrice: product?.costPrice ?? "",
    stockQuantity: product?.stockQuantity ?? 0,
    categoryId: product?.categoryId?._id || product?.categoryId || "",
    imageUrl: product?.images?.[0] || "",
    status: product?.status || "DRAFT",
    isFeatured: !!product?.isFeatured,
    trackInventory: product?.trackInventory ?? true,
    allowBackorder: product?.allowBackorder ?? false,
  });

  function setField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      description: form.description.trim(),
      shortDescription: form.shortDescription.trim(),
      sku: form.sku.trim().toUpperCase(),
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice === "" ? null : Number(form.compareAtPrice),
      costPrice: form.costPrice === "" ? null : Number(form.costPrice),
      stockQuantity: Number(form.stockQuantity),
      categoryId: form.categoryId,
      images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
      status: form.status,
      isFeatured: form.isFeatured,
      trackInventory: form.trackInventory,
      allowBackorder: form.allowBackorder,
    };
  }

  return (
    <Modal
      title={product ? "Edit product" : "Create product"}
      onClose={onClose}
    >
      <div className="formGrid">
        <Field
          label="Product name"
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
          required
        />

        <Field
          label="SKU"
          value={form.sku}
          onChange={(event) => setField("sku", event.target.value)}
          placeholder="SKU-1001"
          required
        />

        <Field
          label="Price"
          type="number"
          min="0"
          value={form.price}
          onChange={(event) => setField("price", event.target.value)}
          required
        />

        <Field
          label="Compare at price"
          type="number"
          min="0"
          value={form.compareAtPrice}
          onChange={(event) => setField("compareAtPrice", event.target.value)}
        />

        <Field
          label="Cost price"
          type="number"
          min="0"
          value={form.costPrice}
          onChange={(event) => setField("costPrice", event.target.value)}
        />

        <Field
          label="Stock quantity"
          type="number"
          min="0"
          value={form.stockQuantity}
          onChange={(event) => setField("stockQuantity", event.target.value)}
        />

        <Field
          label="Image URL"
          type="url"
          value={form.imageUrl}
          onChange={(event) => setField("imageUrl", event.target.value)}
          placeholder="https://..."
        />

        <label className="field">
          <span>Category</span>
          <select
            value={form.categoryId}
            onChange={(event) => setField("categoryId", event.target.value)}
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option value={category._id} key={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) => setField("status", event.target.value)}
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>

        <TextArea
          label="Short description"
          value={form.shortDescription}
          onChange={(event) => setField("shortDescription", event.target.value)}
        />

        <TextArea
          label="Description"
          value={form.description}
          onChange={(event) => setField("description", event.target.value)}
        />
      </div>

      <div className="checkRow">
        <label><input type="checkbox" checked={form.isFeatured} onChange={(e) => setField("isFeatured", e.target.checked)} /> Featured product</label>
        <label><input type="checkbox" checked={form.trackInventory} onChange={(e) => setField("trackInventory", e.target.checked)} /> Track inventory</label>
        <label><input type="checkbox" checked={form.allowBackorder} onChange={(e) => setField("allowBackorder", e.target.checked)} /> Allow backorders</label>
      </div>

      <div className="modalActions">
        <button className="ghost" onClick={onClose}>Cancel</button>
        <button
          className="primary"
          onClick={() =>
            action(
              () => product
                ? api.updateProduct(product._id, buildPayload())
                : api.createProduct(buildPayload()),
              product ? "Product updated" : "Product created"
            )
          }
        >
          {product ? "Save changes" : "Create product"}
        </button>
      </div>
    </Modal>
  );
}

function CategoryModal({
  item,
  action,
  onClose,
}) {
  const [name, setName] = useState(item?.name || "");

  return (
    <Modal
      title={item ? "Edit category" : "New category"}
      onClose={onClose}
    >
      <Field
        label="Category name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />

      <div className="modalActions">
        <button className="ghost" onClick={onClose}>Cancel</button>
        <button
          className="primary"
          disabled={!name.trim()}
          onClick={() =>
            action(
              () => item
                ? api.updateCategory(item._id, { name: name.trim() })
                : api.createCategory({ name: name.trim() }),
              "Category saved"
            )
          }
        >
          Save category
        </button>
      </div>
    </Modal>
  );
}

function BrandingModal({
  tenant,
  action,
  onClose,
}) {
  const branding = tenant?.branding || {};

  const [form, setForm] = useState({
    primaryColor:
      branding.primaryColor ||
      "#6C5CE7",

    secondaryColor:
      branding.secondaryColor ||
      "#00B894",

    accentColor:
      branding.accentColor ||
      "#FD79A8",

    backgroundColor:
      branding.backgroundColor ||
      "#FFFFFF",

    textColor:
      branding.textColor ||
      "#1F2937",

    fontFamily:
      branding.fontFamily ||
      "Inter",

    borderRadius:
      branding.borderRadius ||
      "MEDIUM",

    themeMode:
      branding.themeMode ||
      "LIGHT",
  });

  function setField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <Modal
      title="Storefront branding"
      onClose={onClose}
    >
      <div className="colorGrid">
        {Object.entries(form).map(
          ([key, value]) => (
            <Field
              key={key}
              label={key.replace(
                /([A-Z])/g,
                " $1"
              )}
              value={value}
              onChange={(event) =>
                setField(
                  key,
                  event.target.value
                )
              }
            />
          )
        )}
      </div>

      <div className="modalActions">
        <button className="ghost" onClick={onClose}>Cancel</button>
        <button
          className="primary"
          onClick={() =>
            action(
              () => api.updateTenant({ branding: form }),
              "Storefront branding saved"
            )
          }
        >
          Save branding
        </button>
      </div>
    </Modal>
  );
}

function BrandingPage({
  tenant,
  onEdit,
}) {
  const branding = tenant?.branding || {};

  return (
    <Panel
      title="Storefront identity"
      sub="Your store's visual system"
    >
      <div className="brandEditor">
        <div className="identity" style={{ marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0 }}>Storefront appearance</h3>
            <p style={{ margin: "4px 0 0" }}>Manage colors, typography and theme behavior.</p>
          </div>
          <button className="primary" onClick={onEdit}>Edit branding</button>
        </div>

        <div
          className="brandHero"
          style={{
            background: `linear-gradient(
              135deg,
              ${branding.primaryColor || "#6C5CE7"},
              ${branding.secondaryColor || "#00B894"}
            )`,
          }}
        >
          <div className="logoPreview">
            {tenant?.name?.[0] || "N"}
          </div>

          <h2>{tenant?.name}</h2>

          <p>Live storefront theme</p>
        </div>

        <div className="swatches">
          {[
            "primaryColor",
            "secondaryColor",
            "accentColor",
            "backgroundColor",
            "textColor",
          ].map((key) => (
            <div key={key}>
              <span
                style={{
                  background:
                    branding[key],
                }}
              />

              <b>{key}</b>

              <small>
                {branding[key] || "—"}
              </small>
            </div>
          ))}
        </div>

        <p className="muted">
          Branding is connected to the tenant
          configuration and can be customized
          from the storefront settings.
        </p>
      </div>
    </Panel>
  );
}

export default App;