const express = require("express");
const path = require("path");
const cors = require("cors");
//const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Trust proxy - Required when behind Nginx/reverse proxy
// This allows Express to trust X-Forwarded-* headers
app.set('trust proxy', 1);

// Security middleware
//app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting - Configured for proxy environment
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased: 500 requests per window (was 100)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use X-Forwarded-For header to get client IP (when behind proxy)
  skip: (req) => {
    // Skip rate limiting for health check and public endpoints
    return req.path === '/health' || req.path === '/api/public/apk-info';
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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: " food delivery v1 app webServer is running",
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

// Serve static files from Vite dist folder with proper MIME types
app.use(express.static(path.join(__dirname, "../dist"), {
  setHeaders: (res, filepath) => {
    // Set proper MIME types for JavaScript modules
    if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    } else if (filepath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    }
  }
}));

// SPA fallback - serve index.html for non-API and non-static routes
app.get("*", (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith("/api/")) {
    return next();
  }
  
  // Skip static asset routes
  if (req.path.startsWith("/assets/") || 
      req.path.startsWith("/uploads/") ||
      req.path.endsWith('.js') || 
      req.path.endsWith('.css') ||
      req.path.endsWith('.svg') ||
      req.path.endsWith('.png') ||
      req.path.endsWith('.jpg') ||
      req.path.endsWith('.ico')) {
    return next();
  }
  
  // Send index.html for SPA routes
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// Error handler
app.use(errorHandler);

module.exports = app;
