const { validateEnv } = require("./src/config/env");
// Validate environment variables before running any code
validateEnv();

const app = require("./src/app");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI;

let server;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    // 5 min timeout for large APK uploads (61MB+)
    server.timeout = 300000;

    // Initialize Socket.io
    const socketConfig = require("./src/config/socket");
    socketConfig.init(server);

    // Start daily gamification streak reminder cron
    const streakReminderService = require("./src/services/streakReminderService");
    streakReminderService.initStreakReminderCron();
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Graceful Shutdown Handler
const handleGracefulShutdown = (signal) => {
  console.log(`\n[${signal}] Graceful shutdown initiated.`);
  
  if (server) {
    console.log("Closing HTTP server...");
    server.close(() => {
      console.log("HTTP server closed.");
      
      console.log("Closing MongoDB connection...");
      mongoose.connection.close(false, () => {
        console.log("MongoDB connection closed.");
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }

  // Force exit if shutdown takes too long (e.g. 10s)
  setTimeout(() => {
    console.error("Forcing exit because graceful shutdown timed out.");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
