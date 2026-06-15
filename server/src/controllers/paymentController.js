const paymentService = require("../services/paymentService");
const Order = require("../models/Order");
const ProcessedWebhook = require("../models/ProcessedWebhook");
const logger = require("../utils/logger");

/**
 * POST /api/payment/create-order
 * Create a Razorpay order for an existing food order
 * Body: { orderId, amount }
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    // Phase 4: Pending Order Cleanup
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const pendingOrdersToCancel = await Order.find({
        userId: req.user._id,
        paymentStatus: "PENDING",
        createdAt: { $lt: thirtyMinutesAgo }
      });

      for (const pendingOrder of pendingOrdersToCancel) {
        pendingOrder.status = "CANCELLED";
        pendingOrder.paymentStatus = "FAILED";
        pendingOrder.paymentLockUntil = new Date(0);
        await pendingOrder.save();

        if (pendingOrder.coinsRedeemed > 0) {
          const User = require("../models/User");
          const userObj = await User.findById(pendingOrder.userId);
          if (userObj) {
            userObj.coins = (userObj.coins || 0) + pendingOrder.coinsRedeemed;
            await userObj.save();
          }
        }
        
        const orderService = require("../services/orderService");
        await orderService.notifyOrderUpdate(pendingOrder).catch(e => console.error("Failed to notify order cancel update:", e));
      }
    } catch (cleanupErr) {
      console.error("[PaymentController] Pending order cleanup error:", cleanupErr.message);
    }

    // Try to acquire atomic lock check using paymentLockUntil
    const now = new Date();
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        $or: [
          { paymentLockUntil: { $exists: false } },
          { paymentLockUntil: null },
          { paymentLockUntil: { $lt: now } }
        ]
      },
      {
        $set: {
          paymentLockUntil: new Date(Date.now() + 30000) // 30-second lock window
        }
      },
      { new: true }
    );

    if (!order) {
      logger.log("PAYMENT_FAILED", { orderId, reason: "LOCKED" });
      return res.status(409).json({ error: "Payment is already being processed" });
    }

    // Verify order belongs to this user
    if (order.userId.toString() !== req.user._id.toString()) {
      order.paymentLockUntil = new Date(0);
      await order.save();
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      if (order.paymentStatus === "PAID") {
        order.paymentLockUntil = new Date(0);
        await order.save();
        logger.log("PAYMENT_FAILED", { orderId, reason: "ALREADY_PAID" });
        return res.status(400).json({ error: "Order already paid" });
      }

      // Reuse Razorpay order only if created within last 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (
        order.razorpayOrderId &&
        order.paymentStatus === "PENDING" &&
        order.paymentInitiatedAt &&
        order.paymentInitiatedAt > fifteenMinutesAgo
      ) {
        order.paymentLockUntil = new Date(0);
        await order.save();

        logger.log("PAYMENT_CREATED", { orderId, razorpayOrderId: order.razorpayOrderId, reused: true });

        return res.json({
          razorpayOrderId: order.razorpayOrderId,
          amount: Math.round(order.totalAmount * 100), // in paise
          currency: "INR",
          keyId: process.env.RAZORPAY_KEY_ID,
          order: {
            id: order._id,
            orderId: order.orderId,
            totalAmount: order.totalAmount,
          },
          prefill: {
            name: req.user.name || "",
            email: req.user.email || "",
            contact: req.user.phone || "",
          },
        });
      }

      // Create Razorpay order
      const razorpayOrder = await paymentService.createRazorpayOrder(
        order.totalAmount,
        order.orderId || order._id,
        {
          foodOrderId: order._id.toString(),
          userId: req.user._id.toString(),
          userEmail: req.user.email,
        }
      );

      // Store Razorpay order ID on our order
      order.razorpayOrderId = razorpayOrder.id;
      order.paymentStatus = "PENDING";
      order.paymentInitiatedAt = new Date();
      order.paymentLockUntil = new Date(0);
      await order.save();

      logger.log("PAYMENT_CREATED", { orderId, razorpayOrderId: razorpayOrder.id, reused: false });

      res.json({
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount, // in paise
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        order: {
          id: order._id,
          orderId: order.orderId,
          totalAmount: order.totalAmount,
        },
        prefill: {
          name: req.user.name || "",
          email: req.user.email || "",
          contact: req.user.phone || "",
        },
      });
    } catch (err) {
      order.paymentLockUntil = new Date(0);
      await order.save().catch(e => console.error("Failed to release lock on order save:", e));
      throw err;
    }
  } catch (err) {
    console.error("[PaymentController] createRazorpayOrder:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/payment/verify
 * Verify Razorpay payment signature and mark order as PAID
 * Body: { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: "Payment details are required for verification" });
    }

    // Verify signature
    const isValid = paymentService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      console.error("[PaymentController] Invalid signature for order:", razorpayOrderId);
      logger.log("PAYMENT_FAILED", { orderId, razorpayOrderId, reason: "INVALID_SIGNATURE" });
      return res.status(400).json({ error: "Payment verification failed. Invalid signature." });
    }

    // Perform atomic update to mark the order as PAID
    const order = await Order.findOneAndUpdate(
      { _id: orderId, paymentStatus: { $ne: "PAID" } },
      {
        $set: {
          paymentStatus: "PAID",
          razorpayPaymentId: razorpayPaymentId,
          paymentMethod: "RAZORPAY",
          paymentCompletedAt: new Date(),
          paymentLockUntil: new Date(0) // release lock immediately
        }
      },
      { new: true }
    );

    if (order) {
      const userController = require("./userController");
      userController.clearCart(order.userId);
    }

    if (!order) {
      // Check if the order was already paid
      const existingOrder = await Order.findById(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (existingOrder.paymentStatus === "PAID") {
        logger.log("PAYMENT_VERIFIED", { orderId, razorpayPaymentId, alreadyPaid: true });
        return res.json({
          success: true,
          message: "Payment verified successfully",
          order: {
            id: existingOrder._id,
            orderId: existingOrder.orderId,
            paymentStatus: existingOrder.paymentStatus,
            paymentMethod: existingOrder.paymentMethod,
          },
        });
      }
      return res.status(400).json({ error: "Order payment status cannot be updated" });
    }

    logger.log("PAYMENT_VERIFIED", { orderId, razorpayPaymentId, alreadyPaid: false });

    res.json({
      success: true,
      message: "Payment verified successfully",
      order: {
        id: order._id,
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
    });
  } catch (err) {
    console.error("[PaymentController] verifyPayment:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/payment/webhook
 * Razorpay webhook (optional, for server-side confirmations)
 * Note: Add RAZORPAY_WEBHOOK_SECRET to .env for production
 */
exports.razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const crypto = require("crypto");
      const signature = req.headers["x-razorpay-signature"];
      const body = JSON.stringify(req.body);
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");
      if (signature !== expectedSig) {
        logger.log("WEBHOOK_RECEIVED", { success: false, reason: "INVALID_SIGNATURE" });
        return res.status(400).json({ error: "Invalid webhook signature" });
      }
    }

    const event = req.body.event;
    const eventId = req.body.id;
    const payload = req.body.payload;

    logger.log("WEBHOOK_RECEIVED", { event, eventId });

    if (!eventId) {
      return res.status(400).json({ error: "Webhook event ID missing" });
    }

    // Check if webhook event already processed
    const alreadyProcessed = await ProcessedWebhook.findOne({ eventId });
    if (alreadyProcessed) {
      return res.status(200).json({ received: true, note: "Already processed" });
    }

    if (event === "payment.captured") {
      const razorpayOrderId = payload.payment?.entity?.order_id;
      const razorpayPaymentId = payload.payment?.entity?.id;
      if (razorpayOrderId) {
        const orderCheck = await Order.findOne({ razorpayOrderId });
        if (orderCheck && orderCheck.paymentStatus === "PAID") {
          await ProcessedWebhook.create({
            eventId,
            eventType: event,
            processedAt: new Date()
          });
          return res.status(200).json({ received: true });
        }

        const order = await Order.findOneAndUpdate(
          { razorpayOrderId, paymentStatus: { $ne: "PAID" } },
          {
            $set: {
              paymentStatus: "PAID",
              paymentCompletedAt: new Date(),
              razorpayPaymentId: razorpayPaymentId || orderCheck?.razorpayPaymentId,
              paymentMethod: "RAZORPAY",
              paymentLockUntil: new Date(0)
            }
          },
          { new: true }
        );

        if (order) {
          const userController = require("./userController");
          userController.clearCart(order.userId);
          logger.log("PAYMENT_VERIFIED", { orderId: order._id, razorpayOrderId, via: "webhook" });
        }
      }
    }

    // Save event only after successful processing
    await ProcessedWebhook.create({
      eventId,
      eventType: event,
      processedAt: new Date()
    });

    res.json({ received: true });
  } catch (err) {
    console.error("[PaymentController] webhook:", err.message);
    res.status(500).json({ error: err.message });
  }
};
