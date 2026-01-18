const Order = require("../models/Order");
const orderService = require("../services/orderService");
const reverseGeocode = require("../utils/reverseGeocode");
const User = require("../models/User");
exports.getAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      deliveryPartnerId: req.user._id,
      status: {
        $in: [
          "ASSIGNED_TO_DELIVERY",
          "PICKED_UP",
          "OUT_FOR_DELIVERY",
          "ARRIVED_AT_LOCATION",
        ],
      },
    })
      .populate("userId", "name phone")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.deliveryPartnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not assigned to you" });
    }

    if (order.status !== "ASSIGNED_TO_DELIVERY") {
      return res.status(400).json({ error: "Order not in correct status" });
    }

    const updatedOrder = await orderService.updateOrderStatus(
      order._id,
      "PICKED_UP",
      req.user._id
    );

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const deliveryPartnerId = req.user._id;

    // Verify the order is assigned to this delivery partner
    const order = await Order.findOne({
      _id: orderId,
      deliveryPartnerId,
    });

    if (!order) {
      return res
        .status(404)
        .json({ error: "Order not found or not assigned to you" });
    }

    const validStatusTransitions = {
      PICKED_UP: ["OUT_FOR_DELIVERY"],
      OUT_FOR_DELIVERY: ["ARRIVED_AT_LOCATION"],
      ARRIVED_AT_LOCATION: [], // OTP verification needed
    };

    if (!validStatusTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ error: "Invalid status transition" });
    }

    const updatedOrder = await orderService.updateOrderStatus(
      orderId,
      status,
      deliveryPartnerId
    );

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.verifyDeliveryOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const orderId = req.params.id;
    const deliveryPartnerId = req.user._id;

    if (!otp || otp.length !== 4) {
      return res.status(400).json({ error: "Valid 4-digit OTP required" });
    }

    const result = await orderService.verifyDeliveryOTP(
      orderId,
      otp,
      deliveryPartnerId
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { orderId, lat, lng } = req.body;

    if (!orderId || !lat || !lng) {
      return res
        .status(400)
        .json({ error: "Order ID and coordinates required" });
    }

    // Verify the order is assigned to this delivery partner
    const order = await Order.findOne({
      _id: orderId,
      deliveryPartnerId: req.user._id,
    });

    if (!order) {
      return res
        .status(404)
        .json({ error: "Order not found or not assigned to you" });
    }

    const location = await orderService.updateDeliveryLocation(
      orderId,
      req.user._id,
      { lat, lng }
    );

    res.json(location);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getDeliveryHistory = async (req, res) => {
  try {
    const orders = await Order.find({
      deliveryPartnerId: req.user._id,
      status: "DELIVERED",
    })
      .populate("userId", "name phone")
      .sort({ actualDeliveryTime: -1, createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getEarnings = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      deliveryPartnerId: req.user._id,
      status: "DELIVERED",
      actualDeliveryTime: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    const totalEarnings = orders.reduce((sum, order) => sum + 50, 0); // ₹50 per delivery for Phase-1
    const totalDeliveries = orders.length;

    res.json({
      totalEarnings,
      totalDeliveries,
      orders: orders.map((order) => ({
        orderId: order.orderId,
        deliveryFee: 50,
        deliveredAt: order.actualDeliveryTime,
      })),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    // Reverse geocode to get city, state, country, address
    const geocodeData = await reverseGeocode(latitude, longitude);

    // Update user location
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        location: {
          latitude,
          longitude,
          suburb: geocodeData.suburb,
          city: geocodeData.city,
          state: geocodeData.state,
          country: geocodeData.country,
          address: geocodeData.address,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).select("-__v");

    // Return location object in the format expected by frontend
    const location = {
      city: user.location?.city || geocodeData.city,
      state: user.location?.state || geocodeData.state,
      country: user.location?.country || geocodeData.country,
      address: user.location?.address || geocodeData.address,
    };
    
    // Only include suburb if it exists and is not empty
    const suburb = (user.location?.suburb && user.location.suburb.trim()) || 
                   (geocodeData.suburb && geocodeData.suburb.trim());
    if (suburb) {
      location.suburb = suburb;
    }

    console.log("Returning location to frontend:", location);
    res.json({ location });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};