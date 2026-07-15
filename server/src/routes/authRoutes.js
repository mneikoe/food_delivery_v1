const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { sendOtpSchema, verifyOtpSchema, loginSchema } = require("../validators/authValidator");

const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 requests per minute
  handler: (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime ? new Date(req.rateLimit.resetTime).getTime() : Date.now() + 60000;
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    res.status(429).json({
      success: false,
      error: `Too many OTP requests. Please try again after ${retryAfter > 0 ? retryAfter : 60} seconds.`,
      message: `Too many OTP requests. Please try again after ${retryAfter > 0 ? retryAfter : 60} seconds.`
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /api/auth/send-email-otp:
 *   post:
 *     summary: Send OTP code via email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: raj117557@gmail.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid input or validation error
 *       429:
 *         description: Too many requests
 */
router.post("/send-email-otp", otpLimiter, validate(sendOtpSchema), authController.sendEmailOtp);

/**
 * @openapi
 * /api/auth/verify-email-otp:
 *   post:
 *     summary: Verify email OTP code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: raj117557@gmail.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully, JWT token returned
 *       400:
 *         description: Invalid OTP or validation error
 */
router.post("/verify-email-otp", otpLimiter, validate(verifyOtpSchema), authController.verifyEmailOtp);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new account with password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minimum: 6
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registered successfully
 */
router.post("/register", authController.registerWithPassword);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login using email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: raj117557@gmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       400:
 *         description: Invalid email or password
 */
router.post("/login", validate(loginSchema), authController.loginWithPassword);

// Referral code validation (Public)
router.get("/verify-referral/:code", authController.verifyReferralCode);

// FCM token update (requires auth)
router.post("/fcm-token", auth, authController.updateFCMToken);

module.exports = router;

