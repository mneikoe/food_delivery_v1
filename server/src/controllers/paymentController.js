const Order = require("../models/Order");
const Payment = require("../models/Payment");
const PaymentEvent = require("../models/PaymentEvent");
const WebhookLog = require("../models/WebhookLog");
const paymentService = require("../services/paymentService");
const paymentStateEngine = require("../services/paymentStateEngine");
const logger = require("../utils/logger");

/**
 * POST /api/payment/create-order
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

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
      { $set: { paymentLockUntil: new Date(Date.now() + 5 * 60 * 1000) } }, // 5 min lock
      { new: true }
    );

    if (!order) {
      return res.status(409).json({ error: "Payment is already being processed. Please wait." });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ error: "Order is already paid" });
    }

    try {
      let rzpOrder;
      if (order.razorpayOrderId) {
        // Reuse existing order
        rzpOrder = { id: order.razorpayOrderId, amount: Math.round(order.totalAmount * 100), currency: "INR" };
      } else {
        rzpOrder = await paymentService.createRazorpayOrder(
          order.totalAmount,
          order._id,
          { orderId: String(order._id), userId: String(req.user._id) }
        );
        order.razorpayOrderId = rzpOrder.id;
        await order.save();
      }

      // Initialize state engine entry as CREATED
      await paymentStateEngine.transitionPayment({
        orderId: order._id,
        razorpayOrderId: rzpOrder.id,
        eventName: "order.created",
        newStatus: "CREATED",
        payload: rzpOrder,
        environment: process.env.NODE_ENV || "development",
      });

      res.json({
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        prefill: {
          name: req.user.name || "",
          email: req.user.email || "",
          contact: req.user.phone || "",
        },
      });
    } catch (err) {
      order.paymentLockUntil = new Date(0);
      await order.save().catch(e => console.error("Failed to release lock:", e));
      throw err;
    }
  } catch (err) {
    console.error("[PaymentController] createRazorpayOrder:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/payment/verify
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
      await paymentStateEngine.transitionPayment({
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        eventName: "payment.verify_failed",
        newStatus: "FAILED",
        payload: { error: "Invalid client signature" },
        environment: process.env.NODE_ENV || "development",
      });
      return res.status(400).json({ error: "Payment verification failed. Invalid signature." });
    }

    let rzpPayload = req.body;
    try {
      const rzpPayment = await paymentService.fetchPayment(razorpayPaymentId);
      if (rzpPayment) {
        rzpPayload = { payment: { entity: rzpPayment } };
      }
    } catch (e) {
      console.error("[PaymentController] Failed to fetch Razorpay payment info for verify:", e.message);
    }

    // Transition state atomically to CAPTURED/SUCCESS
    const payment = await paymentStateEngine.transitionPayment({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      eventName: "payment.verified",
      newStatus: "CAPTURED",
      payload: rzpPayload,
      environment: process.env.NODE_ENV || "development",
    });

    res.json({
      success: true,
      message: "Payment verified successfully",
      payment,
    });
  } catch (err) {
    console.error("[PaymentController] verifyPayment:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/payment/webhook
 */
exports.razorpayWebhook = async (req, res) => {
  const startTime = Date.now();
  const eventId = req.body.id;
  const event = req.body.event;
  const payload = req.body.payload;

  let webhookLog = null;

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Webhook Signature verification
    if (webhookSecret) {
      const crypto = require("crypto");
      const signature = req.headers["x-razorpay-signature"];
      
      // Verification expects the RAW body string.
      // req.body is parsed as Buffer by express.raw({ type: "application/json" }),
      // so convert it back to string for HMAC validation.
      const rawBody = req.body.toString("utf8");
      
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSig) {
        logger.log("WEBHOOK_RECEIVED", { success: false, reason: "INVALID_SIGNATURE" });
        return res.status(400).json({ error: "Invalid webhook signature" });
      }
    }

    // Parse the buffer body to extract JSON properties for logic processing
    const bodyParsed = JSON.parse(req.body.toString("utf8"));
    const eventIdParsed = bodyParsed.id;
    const eventNameParsed = bodyParsed.event;
    const payloadParsed = bodyParsed.payload;

    if (!eventIdParsed) {
      return res.status(400).json({ error: "Webhook event ID missing" });
    }

    // 1. Idempotency Check: Prevent processing identical webhook twice
    const existingLog = await WebhookLog.findOne({ eventId: eventIdParsed });
    if (existingLog) {
      existingLog.retryCount = (existingLog.retryCount || 0) + 1;
      existingLog.status = "DUPLICATE";
      await existingLog.save();
      return res.status(200).json({ received: true, note: "Duplicate webhook event bypassed" });
    }

    // Create immutable WebhookLog record
    const rzpOrderId = payloadParsed.payment?.entity?.order_id;
    const rzpPaymentId = payloadParsed.payment?.entity?.id;

    webhookLog = new WebhookLog({
      eventId: eventIdParsed,
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      eventName: eventNameParsed,
      payload: payloadParsed,
      headers: req.headers,
      signatureVerified: !!webhookSecret,
      status: "SUCCESS",
      ipAddress: req.ip || req.headers["x-forwarded-for"],
      userAgent: req.headers["user-agent"],
      environment: process.env.NODE_ENV || "development",
    });

    // 2. Fetch matched Order record
    if (rzpOrderId) {
      const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
      if (order) {
        // Map Razorpay event into paymentStateEngine transitions
        let nextStatus;
        if (eventNameParsed === "payment.authorized") {
          nextStatus = "AUTHORIZED";
        } else if (eventNameParsed === "payment.captured") {
          nextStatus = "CAPTURED";
        } else if (eventNameParsed === "payment.failed") {
          nextStatus = "FAILED";
        }

        if (nextStatus) {
          await paymentStateEngine.transitionPayment({
            orderId: order._id,
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: rzpPaymentId,
            eventName: eventNameParsed,
            newStatus: nextStatus,
            payload: payloadParsed,
            headers: req.headers,
            webhookLogId: webhookLog._id,
            ipAddress: req.ip || req.headers["x-forwarded-for"],
            userAgent: req.headers["user-agent"],
          });
        }
      }
    }

    webhookLog.latency = Date.now() - startTime;
    await webhookLog.save();

    res.json({ received: true });
  } catch (err) {
    console.error("[PaymentController] webhook error:", err.message);
    
    // Save failed webhook details in db if webhookLog instance exists
    if (webhookLog) {
      webhookLog.status = "FAILED";
      webhookLog.errorMessage = err.message;
      webhookLog.stackTrace = err.stack;
      webhookLog.latency = Date.now() - startTime;
      await webhookLog.save().catch(e => console.error("Failed to save failed WebhookLog:", e));
    } else {
      // Save minimal record
      await WebhookLog.create({
        eventId: eventId || `err-${Date.now()}`,
        eventName: event || "unknown",
        payload: payload || {},
        status: "FAILED",
        errorMessage: err.message,
        stackTrace: err.stack,
        latency: Date.now() - startTime,
      }).catch(e => console.error("Failed to create webhook log trace:", e));
    }

    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/payment/admin/logs
 */
exports.getAdminLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status, eventName } = req.query;

    const query = {};

    if (status) query.status = status;
    if (eventName) query.eventName = eventName;

    if (search) {
      query.$or = [
        { razorpayOrderId: { $regex: search, $options: "i" } },
        { razorpayPaymentId: { $regex: search, $options: "i" } },
        { eventId: { $regex: search, $options: "i" } },
      ];
    }

    const count = await WebhookLog.countDocuments(query);
    const logs = await WebhookLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit),
      logs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/payment/admin/dashboard
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments();
    const successPayments = await Payment.countDocuments({ status: { $in: ["CAPTURED", "SUCCESS"] } });
    const failedPayments = await Payment.countDocuments({ status: "FAILED" });
    const authorizedPayments = await Payment.countDocuments({ status: "AUTHORIZED" });

    // Success Rate
    const successRate = totalPayments > 0 ? Math.round((successPayments / totalPayments) * 100) : 0;

    // Webhook log statuses
    const webhooksTotal = await WebhookLog.countDocuments();
    const webhooksFailed = await WebhookLog.countDocuments({ status: "FAILED" });
    const webhooksDuplicate = await WebhookLog.countDocuments({ status: "DUPLICATE" });

    // Latency averages
    const avgLatencyRes = await WebhookLog.aggregate([
      { $match: { latency: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: "$latency" } } },
    ]);
    const avgLatency = avgLatencyRes.length > 0 ? Math.round(avgLatencyRes[0].avg) : 0;

    // Last 30 transactions
    const recentPayments = await Payment.find()
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      metrics: {
        totalPayments,
        successPayments,
        failedPayments,
        authorizedPayments,
        successRate,
        webhooksTotal,
        webhooksFailed,
        webhooksDuplicate,
        avgLatency,
      },
      recentPayments,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/payment/admin/timeline/:id
 */
exports.getPaymentTimeline = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id).populate("userId", "name email phone");
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const events = await PaymentEvent.find({ paymentId: payment._id })
      .populate("webhookLogId")
      .sort({ createdAt: 1 });

    res.json({
      payment,
      events,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
