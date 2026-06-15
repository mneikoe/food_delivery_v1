const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/role");
const userController = require("../controllers/userController");
const gameController = require("../controllers/gameController");
const validate = require("../middleware/validate");

const { updateProfileSchema } = require("../validators/profileValidator");
const { createAddressSchema, updateAddressSchema } = require("../validators/addressValidator");
const { createOrderSchema } = require("../validators/orderValidator");
const { validateCouponSchema } = require("../validators/couponValidator");
const { createReviewSchema } = require("../validators/reviewValidator");

// Catalog (Public)
router.get("/categories", userController.getCategories);
router.get("/products", userController.getProducts);

// All routes require authentication and USER role
router.use(auth);
router.use(roleCheck("USER","CUSTOMER"));

// Profile
router.get("/profile", userController.getProfile);
router.put("/profile", validate(updateProfileSchema), userController.updateProfile);
router.post("/profile/coins", userController.updateCoins);

// Addresses
router.get("/addresses", userController.getAddresses);
router.post("/addresses", validate(createAddressSchema), userController.createAddress);
router.put("/addresses/:id", validate(updateAddressSchema), userController.updateAddress);
router.delete("/addresses/:id", userController.deleteAddress);

// Cart
router.get("/cart", userController.getCart);
router.post("/cart/items", userController.addToCart);
router.put("/cart/items/:id", userController.updateCartItem);

// Orders
router.post("/orders/preview", userController.previewOrder);
router.post("/orders", validate(createOrderSchema), userController.createOrder);
router.get("/orders", userController.getOrders);
router.get("/orders/:id", userController.getOrderDetails);
router.post("/orders/:id/cancel", userController.cancelOrder);

// Coupons
router.post("/coupons/validate", validate(validateCouponSchema), userController.validateCoupon);
router.get("/coupons", userController.getAvailableCoupons);

// Offers
router.get("/offers", userController.getOffers);

// Reviews
router.post("/reviews", validate(createReviewSchema), userController.createReview);
router.get("/products/:productId/reviews", userController.getProductReviews);

// Tracking
router.get("/orders/:id/track", userController.trackOrder);

// Location
router.post("/location/update", userController.updateLocation);

// Gamification Ecosystem Routes
router.post("/game/start", gameController.startGame);
router.post("/game/submit", gameController.submitGame);
router.post("/game/daily-reward/claim", gameController.claimDailyReward);
router.post("/game/missions/claim", gameController.claimMissionReward);
router.post("/game/streak/claim", gameController.claimStreakReward);
router.get("/game/leaderboard", gameController.getLeaderboard);
router.get("/game/dashboard", gameController.getDashboardInfo);
router.get("/game/rewards", gameController.getRewardTiers);
router.post("/game/redeem", gameController.redeemReward);

// Game settings (legacy support fallback)
router.get("/game-settings", userController.getGameSettings);

// APK Info (public endpoint)
router.get("/apk-info", userController.getApkInfo);

module.exports = router;
