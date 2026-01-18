const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/send-email-otp", authController.sendEmailOtp);
router.post("/verify-email-otp", authController.verifyEmailOtp);

module.exports = router;
