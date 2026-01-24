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

// Security middleware
//app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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
