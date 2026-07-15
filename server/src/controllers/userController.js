const User = require("../models/User");
const Address = require("../models/Address");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Offer = require("../models/Offer");
const Review = require("../models/Review");
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
    const allowedUpdates = ["name", "email", "phone"];
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
exports.clearCart = (userId) => {
  delete userCarts[userId];
};

module.exports = exports;

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
    const orderWindow = require("../utils/orderWindow");
    const windowStatus = orderWindow.isOrderWindowOpen();
    if (!windowStatus.open) {
      return res.status(503).json({ error: windowStatus.message });
    }

    const { addressId, paymentMethod = "COD", couponCode, redeemCoins } = req.body;

    const paymentSettings = require("../utils/paymentSettings");
    const paySettings = paymentSettings.getPaymentSettings();
    if (paymentMethod === "COD" && !paySettings.codActive) {
      return res.status(400).json({ error: "Cash On Delivery (COD) is currently deactivated. Please choose another payment method." });
    }
    if (paymentMethod === "RAZORPAY" && !paySettings.onlineActive) {
      return res.status(400).json({ error: "Online payment (Razorpay) is currently deactivated. Please choose another payment method." });
    }

    const userId = req.user._id;

    // Check if user has phone number
    const user = await User.findById(userId);
    if (user.isEmailVerified === false) {
      return res.status(403).json({ error: "Email verification required. Please login using OTP to verify and place orders." });
    }
    if (!user.phone || user.phone.trim() === "") {
      return res.status(400).json({ error: "Phone number is required to place an order" });
    }

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

    // Calculate discount if coupon is provided
    let discount = 0;
    let appliedCouponCode = null;

    if (couponCode && couponCode.trim() !== "") {
      try {
        const validation = await couponService.validateCoupon(
          couponCode,
          cart.subtotal,
          userId
        );
        discount = Math.ceil(validation.discount);
        appliedCouponCode = validation.code;

        // Increment coupon usage count
        const Coupon = require("../models/Coupon");
        await Coupon.findOneAndUpdate(
          { code: appliedCouponCode },
          { $inc: { usedCount: 1 } }
        );
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }

    // Create order
    const deliveryFee = 28;
    const subtotalWithFee = cart.subtotal + deliveryFee;
    const tax = Math.ceil(subtotalWithFee * 0.05); // 5% tax
    
    // Calculate coin discount if requested (uses admin setting coinsPerRupee)
    let coinDiscount = 0;
    let coinsRedeemed = 0;

    if (redeemCoins) {
      const coinSettings = require("../utils/coinSettings");
      const { coinsPerRupee } = coinSettings.getCoinSettings();
      const userCoins = user.coins || 0;
      const blocksOf100 = Math.floor(userCoins / 100);
      if (blocksOf100 > 0) {
        const totalRedeemableCoins = blocksOf100 * 100;
        const potentialDiscount = Math.ceil(totalRedeemableCoins / coinsPerRupee);
        
        const remainingToPay = subtotalWithFee - discount + tax;
        if (potentialDiscount > remainingToPay) {
          coinDiscount = Math.ceil(remainingToPay);
          coinsRedeemed = Math.ceil(coinDiscount * coinsPerRupee);
        } else {
          coinDiscount = potentialDiscount;
          coinsRedeemed = totalRedeemableCoins;
        }
      }
    }

    const totalAmount = Math.ceil(subtotalWithFee - discount - coinDiscount + tax);
    
    const orderData = {
      deliveryAddress,
      items: cart.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal: cart.subtotal,
      deliveryFee: deliveryFee,
      tax: tax,
      discount: discount,
      coinDiscount: coinDiscount,
      coinsRedeemed: coinsRedeemed,
      couponCode: appliedCouponCode,
      totalAmount: Math.max(totalAmount, 0),
      paymentMethod: ["COD", "RAZORPAY"].includes(paymentMethod) ? paymentMethod : "COD",
      paymentStatus: paymentMethod === "RAZORPAY" ? "PENDING" : "NA",
    };

    const order = await orderService.createOrder(userId, orderData);

    // Deduct coins from user if redeemed
    if (coinsRedeemed > 0) {
      user.coins = Math.max(0, (user.coins || 0) - coinsRedeemed);
      await user.save();
    }

    // Clear cart only if not paying online (online verification clears it later)
    if (paymentMethod !== "RAZORPAY") {
      delete userCarts[userId];
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.previewOrder = async (req, res) => {
  try {
    const { couponCode, redeemCoins } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const cart = userCarts[userId];
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    let discount = 0;
    let appliedCouponCode = null;

    if (couponCode && couponCode.trim() !== "") {
      try {
        const validation = await couponService.validateCoupon(
          couponCode,
          cart.subtotal,
          userId
        );
        discount = Math.ceil(validation.discount);
        appliedCouponCode = validation.code;
      } catch (error) {
        // Silently ignore coupon error in preview
      }
    }

    const deliveryFee = 28;
    const subtotalWithFee = cart.subtotal + deliveryFee;
    const tax = Math.ceil(subtotalWithFee * 0.05);

    let coinDiscount = 0;
    let coinsRedeemed = 0;

    if (redeemCoins) {
      const coinSettings = require("../utils/coinSettings");
      const { coinsPerRupee } = coinSettings.getCoinSettings();
      const userCoins = user.coins || 0;
      const blocksOf100 = Math.floor(userCoins / 100);
      if (blocksOf100 > 0) {
        const totalRedeemableCoins = blocksOf100 * 100;
        const potentialDiscount = Math.ceil(totalRedeemableCoins / coinsPerRupee);
        const remainingToPay = subtotalWithFee - discount + tax;
        if (potentialDiscount > remainingToPay) {
          coinDiscount = Math.ceil(remainingToPay);
          coinsRedeemed = Math.ceil(coinDiscount * coinsPerRupee);
        } else {
          coinDiscount = potentialDiscount;
          coinsRedeemed = totalRedeemableCoins;
        }
      }
    }

    const totalAmount = Math.ceil(Math.max(0, subtotalWithFee - discount - coinDiscount + tax));

    res.json({
      subtotal: cart.subtotal,
      deliveryFee,
      tax,
      discount,
      coinDiscount,
      coinsRedeemed,
      totalAmount,
    });
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
    if (order.coinsRedeemed > 0) {
      const userObj = await User.findById(order.userId);
      if (userObj) {
        userObj.coins = (userObj.coins || 0) + order.coinsRedeemed;
        await userObj.save();
      }
    }
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
    const userId = req.user._id;

    if (!code || !orderAmount) {
      return res.status(400).json({ error: "Code and order amount required" });
    }

    const validation = await couponService.validateCoupon(code, orderAmount, userId);
    res.json(validation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAvailableCoupons = async (req, res) => {
  try {
    const Coupon = require("../models/Coupon");
    const userId = req.user._id;
    
    // Check if user has already placed an order
    const orderCount = await Order.countDocuments({ userId, status: { $nin: ['CANCELLED'] } });
    
    // If user has already placed at least one order, return empty coupons
    if (orderCount > 0) {
      return res.json([]);
    }
    
    // Only show coupons for first-time users
    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: new Date() },
      $or: [{ validUntil: { $gte: new Date() } }, { validUntil: null }],
    }).select("code discountType discountValue minOrderValue maxDiscount validUntil");
    res.json(coupons);
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

// Offers
exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find({
      isActive: true,
      validFrom: { $lte: new Date() },
      $or: [{ validUntil: { $gte: new Date() } }, { validUntil: null }],
    })
      .sort({ priority: -1, createdAt: -1 })
      .select("-__v");
    res.json(offers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Reviews
exports.createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment } = req.body;

    if (!productId || !orderId || !rating) {
      return res.status(400).json({ error: "Product ID, Order ID, and rating are required" });
    }

    // Verify order belongs to user and is delivered
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id,
      status: "DELIVERED",
    });

    if (!order) {
      return res.status(400).json({ error: "Order not found or not delivered" });
    }

    // Check if product was in the order
    const orderItem = order.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!orderItem) {
      return res.status(400).json({ error: "Product not found in order" });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      userId: req.user._id,
      productId,
      orderId,
    });

    if (existingReview) {
      return res.status(400).json({ error: "Review already exists for this order" });
    }

    const review = new Review({
      userId: req.user._id,
      productId,
      orderId,
      rating,
      comment: comment || "",
    });

    await review.save();
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .select("-__v");
    res.json(reviews);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// APK Info - Public endpoint (no auth required)
exports.getApkInfo = async (req, res) => {
  try {
    // For now, return stored APK info from a simple JSON file or database
    // In production, you'd store this in database
    const fs = require('fs');
    const path = require('path');
    const apkInfoPath = path.join(__dirname, '../../apk-info.json');
    
    if (fs.existsSync(apkInfoPath)) {
      const apkInfo = JSON.parse(fs.readFileSync(apkInfoPath, 'utf8'));
      res.json(apkInfo);
    } else {
      res.json({ available: false });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCoins = async (req, res) => {
  try {
    const { coinsChange } = req.body;
    if (typeof coinsChange !== 'number') {
      return res.status(400).json({ error: "coinsChange must be a number" });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.coins = Math.max(0, (user.coins || 0) + coinsChange);
    await user.save();
    res.json({ coins: user.coins });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getGameSettings = async (req, res) => {
  try {
    const coinSettings = require("../utils/coinSettings");
    const settings = coinSettings.getCoinSettings();
    res.json({
      maxPlaysPerDay: settings.maxPlaysPerDay || 5,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
