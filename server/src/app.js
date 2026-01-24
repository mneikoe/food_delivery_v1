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
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use X-Forwarded-For header to get client IP (when behind proxy)
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  },
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

// Serve uploaded files (APK downloads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
