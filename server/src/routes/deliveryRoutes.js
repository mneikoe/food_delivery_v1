const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/role");
const deliveryController = require("../controllers/deliveryController");

// All routes require authentication and DELIVERY_PARTNER role
router.use(auth);
router.use(roleCheck("DELIVERY_PARTNER"));

// Orders
router.get("/assigned-orders", deliveryController.getAssignedOrders);
router.get("/delivery-history", deliveryController.getDeliveryHistory);
router.post("/orders/:id/accept", deliveryController.acceptOrder);
router.post("/orders/:id/status", deliveryController.updateOrderStatus);
router.post("/orders/:id/verify-otp", deliveryController.verifyDeliveryOTP);

// Location
router.post("/location/update", deliveryController.updateLocation);

// Earnings
router.get("/earnings", deliveryController.getEarnings);

// FCM Token (shared with user)
router.post(
  "/fcm-token",
  require("../controllers/authController").updateFCMToken
);

module.exports = router;
