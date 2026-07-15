const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    const User = require("./src/models/User");

    // Find all users who do not have a referral code
    const usersWithoutCode = await User.find({ referralCode: { $exists: false } });
    console.log(`Found ${usersWithoutCode.length} users without a referral code.`);

    let migratedCount = 0;
    for (const user of usersWithoutCode) {
      // Auto-generate code using the pre-save logic
      // Saving the user triggers the pre-save hook which generates the unique referralCode
      user.referralCode = undefined;
      await user.save();
      migratedCount++;
      console.log(`Migrated user ${user.email} -> code: ${user.referralCode}`);
    }

    // Also check for users who might have null or empty string referralCode
    const usersWithEmptyCode = await User.find({ $or: [{ referralCode: null }, { referralCode: "" }] });
    console.log(`Found ${usersWithEmptyCode.length} users with empty/null referral codes.`);
    
    for (const user of usersWithEmptyCode) {
      user.referralCode = undefined;
      await user.save();
      migratedCount++;
      console.log(`Migrated user ${user.email} -> code: ${user.referralCode}`);
    }

    console.log(`Successfully migrated ${migratedCount} users!`);
    process.exit(0);
  })
  .catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
