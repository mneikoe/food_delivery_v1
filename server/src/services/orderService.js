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
    // Notify user
    await supabase.channel(`user_${order.userId}_orders`).send({
      type: "broadcast",
      event: "order_update",
      payload: { orderId: order._id, status: order.status },
    });

    // Notify delivery partner if assigned
    if (order.deliveryPartnerId) {
      await supabase
        .channel(`delivery_${order.deliveryPartnerId}_orders`)
        .send({
          type: "broadcast",
          event: "order_update",
          payload: { orderId: order._id, status: order.status },
        });
    }

    // Notify admin
    await supabase.channel("admin_orders").send({
      type: "broadcast",
      event: "order_update",
      payload: { orderId: order._id, status: order.status },
    });
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

    // Broadcast location update via Supabase
    await supabase.channel(`order_${orderId}_tracking`).send({
      type: "broadcast",
      event: "location_update",
      payload: {
        orderId,
        location: coordinates,
        timestamp: new Date().toISOString(),
      },
    });

    return location;
  }
}

module.exports = new OrderService();
