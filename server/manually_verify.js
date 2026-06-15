const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    const email = "raj117557@gmail.com";
    const result = await User.findOneAndUpdate(
      { email },
      { $set: { isEmailVerified: true } },
      { new: true }
    );
    console.log("Manually verified user:", result.email, "isEmailVerified status is:", result.isEmailVerified);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
