const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/role");
const adminController = require("../controllers/adminController");
const upload = require("../middleware/upload");

// All routes require authentication and ADMIN role
router.use(auth);
router.use(roleCheck("ADMIN"));

// Categories
router.get("/categories", adminController.getCategories);
router.post("/categories", adminController.createCategory);
router.put("/categories/:id", adminController.updateCategory);
router.delete("/categories/:id", adminController.deleteCategory);

// Products
router.get("/products", adminController.getProducts);
router.post("/products", adminController.createProduct);
router.put("/products/:id", adminController.updateProduct);
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

// APK Management
router.post("/apk-upload", upload.single('apk'), adminController.uploadApk);
router.get("/apk-info", adminController.getApkInfo);
router.delete("/apk", adminController.deleteApk);

// Order window (accept orders on/off and time duration)
router.get("/order-window", adminController.getOrderWindow);
router.put("/order-window", adminController.updateOrderWindow);

module.exports = router;
