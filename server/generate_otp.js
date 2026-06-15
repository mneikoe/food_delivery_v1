const mongoose = require("mongoose");
require("dotenv").config();
const authService = require("./src/services/authService");

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    const email = "raj117557@gmail.com";
    await authService.sendEmailOtp(email);
    const User = require("./src/models/User");
    const user = await User.findOne({ email });
    console.log("Generated OTP code for", email, "is:", user.otpCode);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
