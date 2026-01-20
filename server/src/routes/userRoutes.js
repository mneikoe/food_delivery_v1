const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/role");
const userController = require("../controllers/userController");

// All routes require authentication and USER role
router.use(auth);
router.use(roleCheck("USER","CUSTOMER"));

// Profile
router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);

// Addresses
router.get("/addresses", userController.getAddresses);
router.post("/addresses", userController.createAddress);
router.put("/addresses/:id", userController.updateAddress);
router.delete("/addresses/:id", userController.deleteAddress);

// Catalog
router.get("/categories", userController.getCategories);
router.get("/products", userController.getProducts);

// Cart
router.get("/cart", userController.getCart);
router.post("/cart/items", userController.addToCart);
router.put("/cart/items/:id", userController.updateCartItem);

// Orders
router.post("/orders", userController.createOrder);
router.get("/orders", userController.getOrders);
router.get("/orders/:id", userController.getOrderDetails);
router.post("/orders/:id/cancel", userController.cancelOrder);

// Coupons
router.post("/coupons/validate", userController.validateCoupon);

// Offers
router.get("/offers", userController.getOffers);

// Reviews
router.post("/reviews", userController.createReview);
router.get("/products/:productId/reviews", userController.getProductReviews);

// Tracking
router.get("/orders/:id/track", userController.trackOrder);

// Location
router.post("/location/update", userController.updateLocation);

// FCM Token (shared with delivery)
//router.post("/fcm-token", userController.updateFCMToken);

module.exports = router;
