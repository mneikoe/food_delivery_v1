const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const auth = require("./middleware/auth");
const roleCheck = require("./middleware/role");
const upload = require("./middleware/upload");
const adminController = require("./controllers/adminController");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const pushRoutes = require("./routes/pushRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Trust proxy - when behind any reverse proxy (Nginx, platform proxy, etc.)
app.set('trust proxy', 1);

const observability = require("./middleware/observability");
app.use(observability);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP to avoid blocking local assets if any
app.use(cors());

// APK upload BEFORE express.json() so large multipart body is never parsed as JSON (fixes 502)
app.post(
  "/api/admin/apk-upload",
  auth,
  roleCheck("ADMIN"),
  (req, res, next) => {
    req.setTimeout(300000);
    res.setTimeout(300000);
    next();
  },
  upload.single("apk"),
  adminController.uploadApk
);

// Exclude payment webhook from global JSON parsing to let express.raw parse it correctly in routes
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payment/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(mongoSanitize());

// Rate limiting - Configured for proxy environment
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased: 500 requests per window (was 100)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use X-Forwarded-For header to get client IP (when behind proxy)
  skip: (req) => {
    // Skip rate limiting for health check, public endpoints, and large APK upload
    return req.path === '/health' || req.path === '/api/public/apk-info' || req.path === '/api/public/order-window' || req.path === '/api/public/hero-slides' || req.path === '/api/admin/apk-upload';
  },
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    const retryAfter = Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: retryAfter > 0 ? retryAfter : 60, // seconds
      limit: req.rateLimit.limit,
      remaining: 0,
      resetTime: new Date(req.rateLimit.resetTime).toISOString(),
    });
  },
  // Only count failed requests (4xx, 5xx) - successful requests don't count
  skipSuccessfulRequests: true, // Changed: don't count successful requests
  skipFailedRequests: false,
});
app.use("/api/", limiter);

// Public APK endpoint (no auth required) - MUST be before other routes
app.get("/api/public/apk-info", async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const apkInfoPath = path.join(__dirname, '../apk-info.json');
    
    if (fs.existsSync(apkInfoPath)) {
      const apkInfo = JSON.parse(fs.readFileSync(apkInfoPath, 'utf8'));
      res.json(apkInfo);
    } else {
      res.json({ available: false });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Public order window endpoint (no auth required)
app.get("/api/public/order-window", (req, res) => {
  try {
    const orderWindow = require("./utils/orderWindow");
    const settings = orderWindow.getOrderWindowSettings();
    const status = orderWindow.isOrderWindowOpen();
    res.json({
      ...settings,
      ordersOpen: status.open,
      message: status.message || null,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Public hero slides for app home screen (no auth required)
app.get("/api/public/hero-slides", (req, res) => {
  try {
    const heroSlides = require("./utils/heroSlides");
    res.json(heroSlides.getHeroSlides());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Swagger API Documentation Setup
const setupSwagger = require("./config/swagger");
setupSwagger(app);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/push", pushRoutes);

// Health check
app.get("/health", (req, res) => {
  const mongoose = require("mongoose");
  const packageJson = require("../package.json");
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  
  res.json({
    status: "ok",
    database: dbStatus,
    uptime: `${process.uptime().toFixed(2)}s`,
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    version: packageJson.version || "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

// Serve uploaded files (APK downloads) - with proper MIME type
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filepath) => {
    // Set proper MIME type for APK files
    if (filepath.endsWith('.apk')) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="app-release.apk"');
    }
  }
}));

const distPath = path.join(__dirname, "../dist");
const assetHeaders = (res, filepath) => {
  if (filepath.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
  } else if (filepath.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=UTF-8');
  } else if (filepath.endsWith('.json')) {
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  }
};

// Serve /assets explicitly first so CSS/JS always get correct MIME type (avoids proxy returning HTML)
app.use("/assets", express.static(path.join(distPath, "assets"), { setHeaders: assetHeaders }));

// Serve other static files from Vite dist (vite.svg, index.html for later fallback)
app.use(express.static(distPath, { setHeaders: assetHeaders }));

// SPA fallback - serve index.html only for HTML navigation, never for asset requests
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
    return next();
  }
  if (req.path.startsWith("/assets/") ||
      req.path.endsWith(".js") || req.path.endsWith(".css") ||
      req.path.endsWith(".svg") || req.path.endsWith(".png") ||
      req.path.endsWith(".jpg") || req.path.endsWith(".ico") ||
      req.path.endsWith(".woff2") || req.path.endsWith(".woff")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// 404 for any unhandled request (e.g. missing /assets file) - never return HTML for assets
app.use((req, res) => {
  res.status(404).setHeader("Content-Type", "text/plain").send("Not Found");
});

// Error handler
app.use(errorHandler);

module.exports = app;
