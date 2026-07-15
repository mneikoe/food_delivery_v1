const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/role");
const { uploadHero } = require("../middleware/upload");
const adminController = require("../controllers/adminController");
const validate = require("../middleware/validate");

const { createProductSchema, updateProductSchema } = require("../validators/productValidator");
const { createCategorySchema, updateCategorySchema } = require("../validators/categoryValidator");

// All routes require authentication and ADMIN role
router.use(auth);
router.use(roleCheck("ADMIN"));

// Categories
router.get("/categories", adminController.getCategories);
router.post("/categories", validate(createCategorySchema), adminController.createCategory);
router.put("/categories/:id", validate(updateCategorySchema), adminController.updateCategory);
router.delete("/categories/:id", adminController.deleteCategory);

// Products
router.get("/products", adminController.getProducts);
router.post("/products", validate(createProductSchema), adminController.createProduct);
router.put("/products/:id", validate(updateProductSchema), adminController.updateProduct);
router.delete("/products/:id", adminController.deleteProduct);

// Coupons
router.post("/coupons", adminController.createCoupon);
router.get("/coupons", adminController.getCoupons);
router.put("/coupons/:id", adminController.updateCoupon);
router.delete("/coupons/:id", adminController.deleteCoupon);

// Orders
router.get("/orders", adminController.getAllOrders);
router.get("/orders/:id", adminController.getOrderDetails);
router.put("/orders/:id/status", adminController.updateOrderStatus);
router.post(
  "/orders/:id/assign-delivery",
  adminController.assignDeliveryPartner
);

// Delivery Partners
router.get(
  "/delivery-partners/available",
  adminController.getAvailableDeliveryPartners
);
router.get(
  "/delivery-partners",
  adminController.getAllDeliveryPartners
);
router.post(
  "/delivery-partners",
  adminController.createDeliveryPartner
);
router.post(
  "/delivery-partners/verify",
  adminController.verifyAndCreateDeliveryPartner
);
router.put(
  "/delivery-partners/:id",
  adminController.updateDeliveryPartner
);
router.patch(
  "/delivery-partners/:id/status",
  adminController.updateDeliveryPartnerStatus
);

// Offers
router.post("/offers", adminController.createOffer);
router.get("/offers", adminController.getOffers);
router.put("/offers/:id", adminController.updateOffer);
router.delete("/offers/:id", adminController.deleteOffer);

// APK Management (upload is in app.js before express.json() for large file support)
router.get("/apk-info", adminController.getApkInfo);
router.delete("/apk", adminController.deleteApk);

// Order window (accept orders on/off and time duration)
router.get("/order-window", adminController.getOrderWindow);
router.put("/order-window", adminController.updateOrderWindow);

// Payment settings (COD & Online active toggles)
router.get("/payment-settings", adminController.getPaymentSettings);
router.put("/payment-settings", adminController.updatePaymentSettings);

// Coin settings
router.get("/coin-settings", adminController.getCoinSettings);
router.put("/coin-settings", adminController.updateCoinSettings);

// Gamification System Admin Settings
router.get("/gamification/settings", adminController.getGamificationSettings);
router.put("/gamification/settings", adminController.updateGamificationSettings);
router.get("/gamification/reward-tiers", adminController.getRewardTiers);
router.post("/gamification/reward-tiers", adminController.createRewardTier);
router.put("/gamification/reward-tiers/:id", adminController.updateRewardTier);
router.delete("/gamification/reward-tiers/:id", adminController.deleteRewardTier);
router.get("/gamification/missions", adminController.getMissions);
router.post("/gamification/missions", adminController.createMission);
router.put("/gamification/missions/:id", adminController.updateMission);
router.delete("/gamification/missions/:id", adminController.deleteMission);
router.get("/gamification/transactions", adminController.getCoinTransactions);

// Hero slides (home screen – 4 slides with image, headline, text)
router.get("/hero-slides", adminController.getHeroSlides);
router.put("/hero-slides", adminController.updateHeroSlides);
router.post("/hero-slides/upload", uploadHero.single("image"), adminController.uploadHeroImage);

module.exports = router;
