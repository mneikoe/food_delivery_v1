const User = require("../models/User");
const Address = require("../models/Address");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Order = require("../models/Order");
const orderService = require("../services/orderService");
const couponService = require("../services/couponService");
const reverseGeocode = require("../utils/reverseGeocode");

// Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-__v");
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ["name", "email"];
    const filteredUpdates = {};

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, filteredUpdates, {
      new: true,
      runValidators: true,
    }).select("-__v");

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Addresses
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });
    res.json(addresses);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createAddress = async (req, res) => {
  try {
    const address = new Address({
      userId: req.user._id,
      ...req.body,
    });
    await address.save();
    res.status(201).json(address);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!address) {
      return res.status(404).json({ error: "Address not found" });
    }

    Object.assign(address, req.body);
    await address.save();
    res.json(address);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!address) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Categories & Products
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .select("_id name description image isActive displayOrder createdAt");

    res.json(categories);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    const filter = { isAvailable: true };

    if (categoryId) filter.categoryId = categoryId;
    if (search) filter.name = { $regex: search, $options: "i" };

    const products = await Product.find(filter)
      .populate("categoryId", "name")
      .sort({ name: 1 });

    res.json(products);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Cart simulation (in-memory for Phase-1)
let userCarts = {};

exports.getCart = async (req, res) => {
  try {
    const cart = userCarts[req.user._id] || { items: [], subtotal: 0 };
    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);

    if (!product || !product.isAvailable) {
      return res.status(404).json({ error: "Product not available" });
    }

    if (!userCarts[req.user._id]) {
      userCarts[req.user._id] = { items: [], subtotal: 0 };
    }

    const cart = userCarts[req.user._id];
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image,
      });
    }

    cart.subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { id } = req.params;

    const cart = userCarts[req.user._id];
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id === id || item.productId.toString() === id
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    cart.subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Orders
exports.createOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod = "COD" } = req.body;
    const userId = req.user._id;

    // Get cart
    const cart = userCarts[userId];
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    let deliveryAddress;

    // If addressId is provided, use existing address logic
    if (addressId) {
      const address = await Address.findOne({
        _id: addressId,
        userId,
      });

      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }

      deliveryAddress = {
        addressId: address._id,
        addressDetails: address.toObject(),
      };
    } else {
      // Fallback: Use location from user profile
      if (!req.user.location || !req.user.location.address || !req.user.location.city) {
        return res.status(400).json({ error: "Location required to place order" });
      }

      deliveryAddress = {
        addressDetails: {
          address: req.user.location.address,
          suburb: req.user.location.suburb,
          city: req.user.location.city,
          state: req.user.location.state,
          country: req.user.location.country,
          latitude: req.user.location.latitude,
          longitude: req.user.location.longitude,
        },
      };
    }

    // Create order
    const orderData = {
      deliveryAddress,
      items: cart.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal: cart.subtotal,
      deliveryFee: 30,
      totalAmount: cart.subtotal + 30,
      paymentMethod,
    };

    const order = await orderService.createOrder(userId, orderData);

    // Clear cart
    delete userCarts[userId];

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("deliveryPartnerId", "name phone");

    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("deliveryPartnerId", "name phone")
      .populate("items.productId", "name image");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (order.status !== "CREATED") {
      return res
        .status(400)
        .json({ error: "Cannot cancel order in current status" });
    }

    order.status = "CANCELLED";
    await order.save();
    await orderService.notifyOrderUpdate(order);

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Coupons
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({ error: "Code and order amount required" });
    }

    const validation = await couponService.validateCoupon(code, orderAmount);
    res.json(validation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Tracking
exports.trackOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const locations = await orderService.getDeliveryLocations(order._id);

    res.json({
      order,
      locations: locations.map((loc) => ({
        lat: loc.location.coordinates[1],
        lng: loc.location.coordinates[0],
        timestamp: loc.timestamp,
      })),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Location
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
