const Category = require("../models/Category");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Offer = require("../models/Offer");
const Order = require("../models/Order");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const orderService = require("../services/orderService");
const { logAudit } = require("../utils/auditLogger");
const GameEconomySettings = require("../models/GameEconomySettings");
const RewardTier = require("../models/RewardTier");
const MissionTemplate = require("../models/MissionTemplate");
const CoinTransaction = require("../models/CoinTransaction");

// Categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, createdAt: -1 });
    res.json(categories);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    await logAudit({
      action: "CATEGORY_CREATE",
      actorId: req.user?._id,
      entityType: "Category",
      entityId: category._id.toString(),
      metadata: { name: category.name }
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    await logAudit({
      action: "CATEGORY_UPDATE",
      actorId: req.user?._id,
      entityType: "Category",
      entityId: category._id.toString(),
      metadata: req.body
    });

    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    await logAudit({
      action: "CATEGORY_DELETE",
      actorId: req.user?._id,
      entityType: "Category",
      entityId: req.params.id,
      metadata: { name: category.name }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    await logAudit({
      action: "PRODUCT_CREATE",
      actorId: req.user?._id,
      entityType: "Product",
      entityId: product._id.toString(),
      metadata: { name: product.name, price: product.price }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await logAudit({
      action: "PRODUCT_UPDATE",
      actorId: req.user?._id,
      entityType: "Product",
      entityId: product._id.toString(),
      metadata: req.body
    });

    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await logAudit({
      action: "PRODUCT_DELETE",
      actorId: req.user?._id,
      entityType: "Product",
      entityId: req.params.id,
      metadata: { name: product.name }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Coupons
exports.createCoupon = async (req, res) => {
  try {
    const coupon = new Coupon({
      ...req.body,
      code: req.body.code.toUpperCase(),
    });
    await coupon.save();
    await logAudit({
      action: "COUPON_CREATE",
      actorId: req.user?._id,
      entityType: "Coupon",
      entityId: coupon._id.toString(),
      metadata: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue }
    });
    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    await logAudit({
      action: "COUPON_UPDATE",
      actorId: req.user?._id,
      entityType: "Coupon",
      entityId: coupon._id.toString(),
      metadata: req.body
    });

    res.json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    await logAudit({
      action: "COUPON_DELETE",
      actorId: req.user?._id,
      entityType: "Coupon",
      entityId: req.params.id,
      metadata: { code: coupon.code }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .populate("userId", "name phone")
      .populate("deliveryPartnerId", "name phone")
      .populate("items.productId", "name image price")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "name phone")
      .populate("deliveryPartnerId", "name phone")
      .populate("items.productId", "name image price");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status);
    
    await logAudit({
      action: "ORDER_STATUS_CHANGE",
      actorId: req.user?._id,
      entityType: "Order",
      entityId: req.params.id,
      metadata: { status }
    });

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.assignDeliveryPartner = async (req, res) => {
  try {
    const { deliveryPartnerId } = req.body;
    const orderId = req.params.id;

    // Check if delivery partner exists and is active
    const deliveryPartner = await User.findOne({
      _id: deliveryPartnerId,
      role: "DELIVERY_PARTNER",
      isActive: true,
    });

    if (!deliveryPartner) {
      return res.status(404).json({ error: "Delivery partner not found" });
    }

    // Update order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.deliveryPartnerId = deliveryPartnerId;
    order.status = "ASSIGNED_TO_DELIVERY";
    await order.save();

    await orderService.notifyOrderUpdate(order);

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delivery Partners
exports.getAvailableDeliveryPartners = async (req, res) => {
  try {
    const deliveryPartners = await User.find({
      role: "DELIVERY_PARTNER",
      isActive: true,
    }).select("name phone createdAt");

    res.json(deliveryPartners);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllDeliveryPartners = async (req, res) => {
  try {
    const deliveryPartners = await User.find({
      role: "DELIVERY_PARTNER",
    })
      .select("name email phone isActive createdAt")
      .sort({ createdAt: -1 });

    res.json(deliveryPartners);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createDeliveryPartner = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Create delivery partner user
    // Note: For production, you'd want to send OTP or password reset
    // For now, we'll create with a placeholder supabaseId
    const deliveryPartner = new User({
      name,
      email: email.toLowerCase(),
      phone,
      role: "DELIVERY_PARTNER",
      isActive: true,
      supabaseId: `delivery_${Date.now()}`, // Placeholder - in production use proper auth
    });

    await deliveryPartner.save();

    res.status(201).json({
      _id: deliveryPartner._id,
      name: deliveryPartner.name,
      email: deliveryPartner.email,
      phone: deliveryPartner.phone,
      role: deliveryPartner.role,
      isActive: deliveryPartner.isActive,
      createdAt: deliveryPartner.createdAt,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.verifyAndCreateDeliveryPartner = async (req, res) => {
  try {
    const { name, email, phone, otp } = req.body;

    if (!name || !email || !otp) {
      return res.status(400).json({ error: "Name, email, and OTP are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find the user document that has the OTP
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: "No verification request found for this email" });
    }

    // Verify OTP expiry
    if (!user.otpExpiry || new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: "OTP has expired. Please send a new one." });
    }

    // Verify OTP attempts limit
    if (user.otpAttempts >= 5) {
      return res.status(400).json({ error: "Too many failed attempts. Please request a new OTP." });
    }

    // Verify OTP hash
    const isMatch = await bcrypt.compare(otp, user.otpHash || "");
    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ error: "Invalid verification code" });
    }

    // OTP verified! Now register/promote to DELIVERY_PARTNER
    user.name = name.trim();
    user.phone = phone.trim();
    user.role = "DELIVERY_PARTNER";
    user.isActive = true;
    user.supabaseId = user.supabaseId || `delivery_${Date.now()}`;
    
    // Clear OTP fields
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;

    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateDeliveryPartner = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;

    const deliveryPartner = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "DELIVERY_PARTNER",
      },
      updates,
      { new: true, runValidators: true }
    ).select("name email phone isActive createdAt");

    if (!deliveryPartner) {
      return res.status(404).json({ error: "Delivery partner not found" });
    }

    res.json(deliveryPartner);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateDeliveryPartnerStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const deliveryPartner = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "DELIVERY_PARTNER",
      },
      { isActive },
      { new: true }
    ).select("name email phone isActive createdAt");

    if (!deliveryPartner) {
      return res.status(404).json({ error: "Delivery partner not found" });
    }

    res.json(deliveryPartner);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Offers
exports.createOffer = async (req, res) => {
  try {
    const offer = new Offer(req.body);
    await offer.save();
    res.status(201).json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ priority: -1, createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    res.json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// APK Management
exports.uploadApk = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    console.log('📱 APK Upload Request:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No APK file uploaded' });
    }
    
    // Get version from request body or use default
    const version = req.body.version || '1.0.0';
    
    // Store APK info with actual file details
    const apkInfo = {
      name: req.file.originalname,
      size: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadDate: new Date().toISOString(),
      url: `/uploads/${req.file.filename}`,
      available: true,
      filename: req.file.filename,
      path: req.file.path,
      version: version // Add version to APK info
    };
    
    const apkInfoPath = path.join(__dirname, '../../apk-info.json');
    fs.writeFileSync(apkInfoPath, JSON.stringify(apkInfo, null, 2));
    
    console.log('✅ APK uploaded successfully:', apkInfo);
    res.json(apkInfo);
  } catch (error) {
    console.error('❌ APK upload error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.getApkInfo = async (req, res) => {
  try {
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

exports.deleteApk = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const apkInfoPath = path.join(__dirname, '../../apk-info.json');
    
    // Read APK info to get file path
    if (fs.existsSync(apkInfoPath)) {
      const apkInfo = JSON.parse(fs.readFileSync(apkInfoPath, 'utf8'));
      
      // Delete the actual APK file
      if (apkInfo.path && fs.existsSync(apkInfo.path)) {
        fs.unlinkSync(apkInfo.path);
        console.log('🗑️ Deleted APK file:', apkInfo.path);
      }
      
      // Delete the info file
      fs.unlinkSync(apkInfoPath);
      console.log('🗑️ Deleted APK info');
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ APK delete error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Order window (accept orders on/off and optional time duration)
exports.getOrderWindow = async (req, res) => {
  try {
    const orderWindow = require("../utils/orderWindow");
    const settings = orderWindow.getOrderWindowSettings();
    const status = orderWindow.isOrderWindowOpen();
    res.json({
      ...settings,
      ordersOpen: status.open,
      message: status.message || null,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateOrderWindow = async (req, res) => {
  try {
    const orderWindow = require("../utils/orderWindow");
    const { orderWindowEnabled, orderWindowStart, orderWindowEnd } = req.body;
    const updated = orderWindow.setOrderWindowSettings({
      orderWindowEnabled,
      orderWindowStart,
      orderWindowEnd,
    });
    const status = orderWindow.isOrderWindowOpen();
    res.json({
      ...updated,
      ordersOpen: status.open,
      message: status.message || null,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Hero slides (home screen carousel – 4 slides: image, headline, text)
exports.getHeroSlides = async (req, res) => {
  try {
    const heroSlides = require("../utils/heroSlides");
    res.json(heroSlides.getHeroSlides());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateHeroSlides = async (req, res) => {
  try {
    const heroSlides = require("../utils/heroSlides");
    const updated = heroSlides.setHeroSlides(req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Upload hero slide image; save to server uploads/hero/ and return URL
exports.uploadHeroImage = async (req, res) => {
  try {
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ error: "No image file uploaded" });
    }
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const url = `${baseUrl.replace(/\/$/, "")}/uploads/hero/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getCoinSettings = async (req, res) => {
  try {
    const coinSettings = require("../utils/coinSettings");
    res.json(coinSettings.getCoinSettings());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCoinSettings = async (req, res) => {
  try {
    const coinSettings = require("../utils/coinSettings");
    const { coinsPerRupee, maxPlaysPerDay } = req.body;
    const updated = coinSettings.setCoinSettings({ coinsPerRupee, maxPlaysPerDay });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Singleton GameEconomySettings Handlers
exports.getGamificationSettings = async (req, res) => {
  try {
    let settings = await GameEconomySettings.findOne({ isActive: true });
    if (!settings) {
      settings = new GameEconomySettings({
        maxDailyPlays: 5,
        coinsPerTreat: 5,
        goldenBoneSpawnChance: 0.05,
        goldenBoneReward: 25,
        streakRewards: { "1": 10, "2": 15, "3": 20, "4": 25, "5": 30, "6": 35, "7": 50 },
        weeklyCoinRedemptionLimit: 500,
        dailyRewardAmount: 10,
        maxCoinsPerGame: 50,
        isActive: true
      });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateGamificationSettings = async (req, res) => {
  try {
    let settings = await GameEconomySettings.findOne({ isActive: true });
    if (!settings) {
      settings = new GameEconomySettings({ isActive: true });
    }
    Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// RewardTier Handlers
exports.getRewardTiers = async (req, res) => {
  try {
    const list = await RewardTier.find().sort({ sortOrder: 1, coinsRequired: 1 });
    res.json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createRewardTier = async (req, res) => {
  try {
    const tier = new RewardTier(req.body);
    await tier.save();
    res.status(201).json(tier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateRewardTier = async (req, res) => {
  try {
    const tier = await RewardTier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!tier) return res.status(404).json({ error: "Reward tier not found" });
    res.json(tier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteRewardTier = async (req, res) => {
  try {
    const tier = await RewardTier.findByIdAndDelete(req.params.id);
    if (!tier) return res.status(404).json({ error: "Reward tier not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// MissionTemplate Handlers
exports.getMissions = async (req, res) => {
  try {
    const list = await MissionTemplate.find().sort({ difficulty: 1, name: 1 });
    res.json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createMission = async (req, res) => {
  try {
    const mission = new MissionTemplate(req.body);
    await mission.save();
    res.status(201).json(mission);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateMission = async (req, res) => {
  try {
    const mission = await MissionTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!mission) return res.status(404).json({ error: "Mission not found" });
    res.json(mission);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteMission = async (req, res) => {
  try {
    const mission = await MissionTemplate.findByIdAndDelete(req.params.id);
    if (!mission) return res.status(404).json({ error: "Mission not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Coin Transaction Audit Ledger
exports.getCoinTransactions = async (req, res) => {
  try {
    const list = await CoinTransaction.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(list);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};