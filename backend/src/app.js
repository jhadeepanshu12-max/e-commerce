const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const env = require("./config/env");
const errorHandler = require("./middleware/error.middleware");

const authRoutes = require("./modules/auth/auth.routes");
const tenantRoutes = require("./modules/tenants/routes/tenant.routes");

const categoryRoutes = require("./modules/catalog/routes/category.routes");
const productRoutes = require("./modules/catalog/routes/product.routes");
const inventoryRoutes = require("./modules/catalog/routes/inventory.routes");

const customerRoutes = require("./modules/customer/customer.routes");
const cartRoutes = require("./modules/customer/cart.routes");

const storefrontRoutes = require("./modules/storefront/storefront.routes");

const couponRoutes = require("./modules/coupons/coupon.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const orderRoutes = require("./modules/orders/order.routes");
const paymentRoutes = require("./modules/payments/payment.routes");
const reviewRoutes = require("./modules/reviews/review.routes");
const shippingRoutes = require("./modules/shipping/shipping.routes");
const taxRoutes = require("./modules/taxes/tax.routes");

const app = express();

app.disable("x-powered-by");

app.use(helmet());

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
|
| Development:
| Allow localhost / 127.0.0.1 on any port.
|
| Production:
| Only allow the configured CLIENT_URL.
|
*/

const allowedOrigins = [
  env.clientUrl,

  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5180",

  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5180",
].filter(Boolean);

const localhostPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(
  cors({
    origin: (origin, callback) => {
      /*
       * Requests such as Postman/curl may not have an origin.
       */
      if (!origin) {
        return callback(null, true);
      }

      /*
       * Always allow explicitly configured origins.
       */
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      /*
       * In development, allow any localhost port.
       *
       * This prevents Vite's automatic port changes
       * from breaking CORS during development.
       */
      if (
        process.env.NODE_ENV !== "production" &&
        localhostPattern.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS origin not allowed: ${origin}`)
      );
    },

    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| API Rate Limiter
|--------------------------------------------------------------------------
*/

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "E-Commerce API is running",
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/api/v1/auth", authRoutes);

app.use(
  "/api/v1/customer-auth",
  customerRoutes
);

app.use(
  "/api/v1/tenants",
  tenantRoutes
);

app.use(
  "/api/v1/categories",
  categoryRoutes
);

app.use(
  "/api/v1/products",
  productRoutes
);

app.use(
  "/api/v1/inventory",
  inventoryRoutes
);

app.use(
  "/api/v1/cart",
  cartRoutes
);

app.use(
  "/api/v1/storefront",
  storefrontRoutes
);

app.use(
  "/api/v1/coupons",
  couponRoutes
);

app.use(
  "/api/v1/notifications",
  notificationRoutes
);

app.use(
  "/api/v1/orders",
  orderRoutes
);

app.use(
  "/api/v1/payments",
  paymentRoutes
);

app.use(
  "/api/v1/shipping",
  shippingRoutes
);

app.use(
  "/api/v1/reviews",
  reviewRoutes
);

app.use(
  "/api/v1/taxes",
  taxRoutes
);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/

app.use(errorHandler);

module.exports = app;