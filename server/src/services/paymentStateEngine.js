const Payment = require("../models/Payment");
const PaymentEvent = require("../models/PaymentEvent");
const WebhookLog = require("../models/WebhookLog");
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const orderService = require("./orderService");
const logger = require("../utils/logger");

// Strict payment states
const PAYMENT_STATUS = {
  CREATED: "CREATED",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
};

// State transition rules: only allow moving forward in the lifecycle
const ALLOWED_TRANSITIONS = {
  [PAYMENT_STATUS.CREATED]: [PAYMENT_STATUS.AUTHORIZED, PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.AUTHORIZED]: [PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.CAPTURED]: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.SUCCESS]: [], // Terminal state
  [PAYMENT_STATUS.FAILED]: [],  // Terminal state
};

class PaymentStateEngine {
  /**
   * Process a payment state transition atomically
   */
  async transitionPayment(params) {
    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      eventName,
      newStatus,
      payload = {},
      headers = {},
      webhookLogId = null,
      ipAddress = "",
      userAgent = "",
      environment = process.env.NODE_ENV || "development",
    } = params;

    const startTime = Date.now();

    // 1. Find or create the core Payment record
    let payment = await Payment.findOne({ orderId });
    if (!payment) {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      payment = new Payment({
        orderId,
        userId: order.userId,
        razorpayOrderId,
        amount: order.totalAmount,
        status: PAYMENT_STATUS.CREATED,
      });
      await payment.save();
    }

    const oldStatus = payment.status;

    // If already in target status, return early (idempotence)
    if (oldStatus === newStatus) {
      return payment;
    }

    // 2. Validate state transition
    const validNextStates = ALLOWED_TRANSITIONS[oldStatus] || [];
    if (!validNextStates.includes(newStatus)) {
      console.warn(`[PaymentStateEngine] Invalid status transition from ${oldStatus} to ${newStatus}`);
      return payment; // Prevent invalid transitions
    }

    // 3. Update payment status & details
    payment.status = newStatus;
    if (razorpayPaymentId) payment.razorpayPaymentId = razorpayPaymentId;
    if (razorpaySignature) payment.razorpaySignature = razorpaySignature;
    payment.history.push({
      status: newStatus,
      timestamp: new Date(),
      details: `Transition from ${oldStatus} via event ${eventName}`,
    });
    await payment.save();

    // 4. Create immutable PaymentEvent record
    const processingDuration = Date.now() - startTime;
    const paymentEvent = new PaymentEvent({
      paymentId: payment._id,
      orderId,
      webhookLogId,
      eventName,
      oldStatus,
      newStatus,
      payload,
      headers,
      processingDuration,
      ipAddress,
      userAgent,
      environment,
    });
    await paymentEvent.save();

    // 5. Execute Order Flow Side Effects
    await this.executeStateSideEffects(payment, newStatus, payload);

    // 6. Broadcast Real-time update via Socket.io if available
    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      if (io) {
        io.emit("payment_update", {
          paymentId: payment._id,
          orderId,
          oldStatus,
          newStatus,
          amount: payment.amount,
        });
      }
    } catch (err) {
      // Ignore socket errors
    }

    return payment;
  }

  /**
   * Execute side effects (Inventory, Notifications, Coins, etc.) based on new status
   */
  async executeStateSideEffects(payment, status, payload = {}) {
    const order = await Order.findById(payment.orderId);
    if (!order) return;

    if (status === PAYMENT_STATUS.AUTHORIZED) {
      // payment.authorized -> Set order to AUTHORIZED
      order.paymentStatus = "AUTHORIZED";
      await order.save();
      await orderService.notifyOrderUpdate(order);
    }

    else if (status === PAYMENT_STATUS.CAPTURED || status === PAYMENT_STATUS.SUCCESS) {
      // payment.captured / verified -> Settle PAID, reduce inventory, clear cart, reward coins
      if (order.paymentStatus !== "PAID") {
        order.paymentStatus = "PAID";
        order.status = "CREATED"; // Start validation
        order.paymentCompletedAt = new Date();
        if (payment.razorpayPaymentId) {
          order.razorpayPaymentId = payment.razorpayPaymentId;
        }

        // Save detailed Razorpay payment metadata on Order
        const entity = payload?.payment?.entity || payload;
        if (entity) {
          if (entity.email) order.razorpayEmail = entity.email;
          if (entity.contact) order.razorpayPhone = entity.contact;
          if (entity.method) order.razorpayMethod = entity.method;
          if (entity.vpa) order.razorpayVPA = entity.vpa;
          if (entity.card) {
            order.razorpayCardDetails = `${entity.card.network || entity.card.brand || ""} **** ${entity.card.last4 || ""}`.trim();
          }
        }

        await order.save();

        // Reduce inventory
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity },
          });
        }

        // Clear user's cart
        const userController = require("../controllers/userController");
        if (userController.clearCart) {
          userController.clearCart(order.userId);
        }

        // Award Gamification Coins
        const coinSettings = require("../utils/coinSettings");
        const settings = coinSettings.getCoinSettings();
        const user = await User.findById(order.userId);
        if (user && settings.earnRate) {
          const coinsToEarn = Math.floor(order.totalAmount * settings.earnRate);
          if (coinsToEarn > 0) {
            user.coins = (user.coins || 0) + coinsToEarn;
            await user.save();

            // Record transaction
            const CoinTransaction = require("../models/CoinTransaction");
            await CoinTransaction.create({
              userId: user._id,
              amount: coinsToEarn,
              type: "EARNED",
              description: `Coins earned for order #${order.orderId}`,
            });
          }
        }

        // Send notifications
        await orderService.notifyOrderUpdate(order);
      }
    }

    else if (status === PAYMENT_STATUS.FAILED) {
      // payment.failed -> Set failed status, restore cart/coupon
      order.paymentStatus = "FAILED";
      order.status = "CANCELLED";
      await order.save();

      // Release coupon if used
      if (order.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: order.couponCode },
          { $inc: { usedCount: -1 } }
        );
      }

      await orderService.notifyOrderUpdate(order);
    }
  }
}

module.exports = new PaymentStateEngine();
