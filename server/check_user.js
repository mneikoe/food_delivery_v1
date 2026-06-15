const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    const users = await User.find({ email: /raj117557/i });
    console.log("Found users matching raj117557:", users.map(u => ({ id: u._id, email: u.email, isEmailVerified: u.isEmailVerified, otpCode: u.otpCode })));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
