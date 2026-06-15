const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

// Load env
dotenv.config({ path: path.join(__dirname, ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
const User = require("./src/models/User");

async function run() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in env!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const email = "admin@chatoradda.in";
  const password = "admin_password"; // wait, user requested: "admin@chatoradda.in passwrod me 123456"
  const passwordText = "123456";
  const passwordHash = await bcrypt.hash(passwordText, 12);

  let user = await User.findOne({ email });

  if (user) {
    user.passwordHash = passwordHash;
    user.role = "ADMIN";
    user.name = "Chatora Admin";
    await user.save();
    console.log("Admin password updated successfully!");
  } else {
    user = new User({
      email,
      name: "Chatora Admin",
      passwordHash,
      role: "ADMIN",
      isEmailVerified: true,
      phone: "9999999999",
    });
    await user.save();
    console.log("Admin user created successfully!");
  }

  await mongoose.connection.close();
  console.log("Connection closed.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Error creating admin user:", err);
  process.exit(1);
});
