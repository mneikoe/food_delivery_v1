const app = require("./src/app");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    // 5 min timeout for large APK uploads (61MB+)
    server.timeout = 300000;
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });
