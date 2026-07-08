const Order = require("../models/Order");
const User = require("../models/User");
const { generateOTP } = require("../utils/otpGenerator");
const supabase = require("../config/supabase");
const { ORDER_STATUS } = require("../utils/constants");

class OrderService {
  async createOrder(userId, orderData) {
    const order = new Order({
      userId,
      ...orderData,
      status: ORDER_STATUS.CREATED,
    });

    await order.save();

    // Notify admin via Supabase Realtime
    await this.notifyOrderUpdate(order);

    return order;
  }

  async updateOrderStatus(orderId, status, userId = null) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    // Status-specific logic
    if (status === ORDER_STATUS.ARRIVED_AT_LOCATION) {
      const otp = generateOTP();
      order.deliveryOTP = {
        code: otp,
        generatedAt: new Date(),
      };
    }

    if (status === ORDER_STATUS.OTP_VERIFIED) {
      if (!order.deliveryOTP || !order.deliveryOTP.code) {
        throw new Error("OTP not generated yet");
      }
      order.deliveryOTP.verifiedAt = new Date();
    }

    order.status = status;
    if (userId) {
      if (status === ORDER_STATUS.ASSIGNED_TO_DELIVERY) {
        order.deliveryPartnerId = userId;
      }
    }

    await order.save();

    // Notify relevant parties via Supabase Realtime
    await this.notifyOrderUpdate(order);

    return order;
  }

  async verifyDeliveryOTP(orderId, otp, deliveryPartnerId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    if (order.deliveryPartnerId.toString() !== deliveryPartnerId.toString()) {
      throw new Error("Not authorized to verify OTP for this order");
    }

    if (order.status !== ORDER_STATUS.ARRIVED_AT_LOCATION) {
      throw new Error("Order not in correct status for OTP verification");
    }

    if (!order.deliveryOTP || order.deliveryOTP.code !== otp) {
      throw new Error("Invalid OTP");
    }

    order.status = ORDER_STATUS.OTP_VERIFIED;
    order.deliveryOTP.verifiedAt = new Date();
    await order.save();

    // Auto-mark as delivered after OTP verification
    setTimeout(async () => {
      order.status = ORDER_STATUS.DELIVERED;
      order.actualDeliveryTime = new Date();
      await order.save();
      await this.notifyOrderUpdate(order);
    }, 2000);

    await this.notifyOrderUpdate(order);

    return { success: true, message: "OTP verified successfully" };
  }

  async notifyOrderUpdate(order) {
    try {
      const User = require("../models/User");
      const pushService = require("../services/pushService");

      // Broadcast to Supabase Realtime Channels
      try {
        const orderIdStr = order._id.toString();
        const userIdStr = order.userId.toString();

        // 1. Broadcast to admin channel
        const adminChannel = supabase.channel("admin_orders");
        await adminChannel.send({
          type: "broadcast",
          event: "order_update",
          payload: { orderId: orderIdStr, status: order.status }
        });

        // 2. Broadcast to customer channel
        const customerChannel = supabase.channel(`user_${userIdStr}_orders`);
        await customerChannel.send({
          type: "broadcast",
          event: "order_update",
          payload: { orderId: orderIdStr, status: order.status }
        });

        // 3. Broadcast to delivery partner channel if assigned
        if (order.deliveryPartnerId) {
          const partnerIdStr = order.deliveryPartnerId.toString();
          const deliveryChannel = supabase.channel(`delivery_${partnerIdStr}_orders`);
          await deliveryChannel.send({
            type: "broadcast",
            event: "order_update",
            payload: { orderId: orderIdStr, status: order.status }
          });
        }
      } catch (realtimeErr) {
        console.error("❌ Failed to broadcast order update via Supabase:", realtimeErr.message);
      }

      // 1. Notify Customer (exclude PICKED_UP and OTP_VERIFIED from push notifications)
      if (order.status !== "PICKED_UP" && order.status !== "OTP_VERIFIED") {
        const user = await User.findById(order.userId);
        if (user && user.fcmTokens && user.fcmTokens.length > 0) {
          // Enforce user preference check: order updates should be enabled (default: true)
          const orderPref = user.notificationSettings ? user.notificationSettings.orderUpdates !== false : true;
          if (orderPref) {
            const tokens = user.fcmTokens.map((t) => t.token);

            // Customize headers and body descriptors based on order state transitions
            let title = "Order Update";
            let body = `Your order status has changed to ${order.status.replace(/_/g, " ")}.`;

            if (order.status === "CREATED") {
              title = "🍔 Order Placed successfully!";
              body = `Thank you! Your order is placed and is currently being validated.`;
            } else if (order.status === "ACCEPTED_BY_ADMIN") {
              title = "✅ Order Accepted";
              body = "Great news! The kitchen has accepted your order and will start preparing it.";
            } else if (order.status === "ASSIGNED_TO_DELIVERY") {
              title = "🛵 Rider Assigned";
              body = "A delivery rider has been assigned to your order and is heading to the store.";
            } else if (order.status === "OUT_FOR_DELIVERY") {
              title = "🛵 Out for Delivery";
              body = `Hang tight! Our delivery partner is on the way to your address.`;
            } else if (order.status === "ARRIVED_AT_LOCATION") {
              title = "🚪 Rider Arrived at Doorstep!";
              body = `Our rider has arrived at your doorsteps with your order! Please share OTP: ${order.deliveryOTP?.code || ""} to collect it.`;
            } else if (order.status === "DELIVERED") {
              title = "🎉 Delivered! Enjoy your meal";
              body = `Your order #${order.orderId} was successfully delivered. Rate us now!`;
            } else if (order.status === "CANCELLED") {
              title = "❌ Order Cancelled";
              body = `Your order #${order.orderId} was cancelled. Any coins spent have been refunded.`;
            }

            const payload = {
              title,
              body,
              data: {
                type: "ORDER",
                orderId: order._id.toString(),
              },
            };

            await pushService.sendPushNotification(tokens, payload, user._id);
          }
        }
      }

      // 2. Notify Delivery Partner
      if (order.deliveryPartnerId && order.status === "ASSIGNED_TO_DELIVERY") {
        const partner = await User.findById(order.deliveryPartnerId);
        if (partner && partner.fcmTokens && partner.fcmTokens.length > 0) {
          const tokens = partner.fcmTokens.map((t) => t.token);
          const payload = {
            title: "📦 New Order Assigned!",
            body: `You have been assigned to deliver order #${order.orderId}. Open the app to view details.`,
            data: {
              type: "DELIVERY_ASSIGNED",
              orderId: order._id.toString(),
            },
          };
          await pushService.sendPushNotification(tokens, payload, partner._id);
          console.log(`[PushNotification] Sent order assignment notification to rider ${partner.name}`);
        }
      }

      // 3. Notify Admins on Order Placed / Order Delivered
      if (order.status === "CREATED" || order.status === "DELIVERED") {
        const admins = await User.find({ role: "ADMIN" });
        for (const admin of admins) {
          if (admin.fcmTokens && admin.fcmTokens.length > 0) {
            const tokens = admin.fcmTokens.map((t) => t.token);
            let title = "🔔 New Order Placed!";
            let body = `Order #${order.orderId} for ₹${order.totalAmount || 0} has been created and needs validation.`;
            
            if (order.status === "DELIVERED") {
              title = "🎉 Order Delivered!";
              body = `Order #${order.orderId} has been successfully verified and delivered by the rider.`;
            }

            const payload = {
              title,
              body,
              data: {
                type: "ADMIN_ORDER_UPDATE",
                orderId: order._id.toString(),
                status: order.status,
              },
            };

            await pushService.sendPushNotification(tokens, payload, admin._id);
            console.log(`[PushNotification] Sent order alert to admin ${admin.name || admin.email}`);
          }
        }
      }
    } catch (err) {
      console.error("[Order Push Trigger] Failed to dispatch push transition:", err.message);
    }
  }

  async getDeliveryLocations(orderId) {
    const DeliveryLocation = require("../models/DeliveryLocation");
    return await DeliveryLocation.find({ orderId })
      .sort({ timestamp: -1 })
      .limit(50);
  }

  async updateDeliveryLocation(orderId, deliveryPartnerId, coordinates) {
    const DeliveryLocation = require("../models/DeliveryLocation");

    const location = new DeliveryLocation({
      orderId,
      deliveryPartnerId,
      location: {
        type: "Point",
        coordinates: [coordinates.lng, coordinates.lat],
      },
    });

    await location.save();

    // Future: broadcast location update via Socket.IO
    // io.to(`order_${orderId}_tracking`).emit('location_update', { orderId, location: coordinates });

    return location;
  }
}

module.exports = new OrderService();
