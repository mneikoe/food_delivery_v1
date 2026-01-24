const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

console.log('🚀 Initializing Express App...');

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

console.log('✅ Security middleware loaded');

// Public APK endpoint (no auth required, no rate limiting) - MUST be FIRST
app.get("/api/public/apk-info", (req, res) => {
  console.log('[APK INFO] Request received for /api/public/apk-info');
  try {
    const fs = require('fs');
    const path = require('path');
    const apkInfoPath = path.join(__dirname, '../apk-info.json');
    console.log('[APK INFO] Looking for APK info at:', apkInfoPath);
    
    if (fs.existsSync(apkInfoPath)) {
      const apkInfo = JSON.parse(fs.readFileSync(apkInfoPath, 'utf8'));
      console.log('[APK INFO] Found APK info:', apkInfo);
      return res.json(apkInfo);
    } else {
      console.log('[APK INFO] No APK info file found, returning unavailable');
      return res.json({ available: false });
    }
  } catch (error) {
    console.error('[APK INFO] Error:', error);
    return res.status(500).json({ error: error.message, available: false });
  }
});

console.log('✅ Public APK endpoint registered at: /api/public/apk-info');

// Rate limiting (after public endpoints)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

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

// Serve Vite dist folder
app.use(express.static(path.join(__dirname, "../dist")));

// SPA fallback - serve index.html for non-API routes
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// Error handler
app.use(errorHandler);

module.exports = app;
