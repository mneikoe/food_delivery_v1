const Category = require("../models/Category");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Offer = require("../models/Offer");
const Order = require("../models/Order");
const User = require("../models/User");
const orderService = require("../services/orderService");

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
    
    // Store APK info with actual file details
    const apkInfo = {
      name: req.file.originalname,
      size: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadDate: new Date().toISOString(),
      url: `/uploads/${req.file.filename}`,
      available: true,
      filename: req.file.filename,
      path: req.file.path
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