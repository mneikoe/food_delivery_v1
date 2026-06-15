require("dotenv").config();

const requiredEnvVars = [
  "NODE_ENV",
  "PORT",
  "JWT_SECRET",
  "MONGODB_URI",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "CLIENT_URL"
];

const validateEnv = () => {
  const missing = [];
  requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.error("FATAL ERROR: Missing required environment variables:");
    missing.forEach((key) => {
      console.error(` - ${key}`);
    });
    process.exit(1);
  }
};

module.exports = {
  validateEnv
};
