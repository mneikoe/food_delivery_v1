const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const paymentController = require("../controllers/paymentController");

/**
 * @openapi
 * /api/payment/create-order:
 *   post:
 *     summary: Create Razorpay transaction order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: 65d7a9b1e4b0a1a2b3c4d5f1
 *     responses:
 *       200:
 *         description: Razorpay order details generated successfully
 *       409:
 *         description: Payment already being processed (locked)
 */
router.post("/create-order", auth, paymentController.createRazorpayOrder);

/**
 * @openapi
 * /api/payment/verify:
 *   post:
 *     summary: Verify Razorpay signature and settle payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - razorpayOrderId
 *               - razorpayPaymentId
 *               - razorpaySignature
 *             properties:
 *               orderId:
 *                 type: string
 *               razorpayOrderId:
 *                 type: string
 *               razorpayPaymentId:
 *                 type: string
 *               razorpaySignature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment successfully verified and order updated to PAID
 */
router.post("/verify", auth, paymentController.verifyPayment);

/**
 * @openapi
 * /api/payment/webhook:
 *   post:
 *     summary: Razorpay Webhook receiver (Captures and processes backend settlements)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully
 */
const roleCheck = require("../middleware/role");

router.post("/webhook", express.raw({ type: "application/json" }), paymentController.razorpayWebhook);

// Admin restricted endpoints
router.get("/admin/dashboard", auth, roleCheck("ADMIN"), paymentController.getAdminDashboard);
router.get("/admin/logs", auth, roleCheck("ADMIN"), paymentController.getAdminLogs);
router.get("/admin/timeline/:id", auth, roleCheck("ADMIN"), paymentController.getPaymentTimeline);

module.exports = router;
