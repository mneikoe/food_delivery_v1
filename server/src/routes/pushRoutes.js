const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/role");
const pushController = require("../controllers/pushController");

// --- User Authenticated Endpoints ---
router.post("/push-token", auth, pushController.savePushToken);
router.delete("/push-token", auth, pushController.deletePushToken);
router.get("/push-preferences", auth, pushController.getPreferences);
router.put("/push-preferences", auth, pushController.updatePreferences);

// --- Admin Restricted Endpoints ---
router.get("/admin/push/audience-preview", auth, roleCheck("ADMIN"), pushController.previewAudience);
router.post("/admin/push/broadcast", auth, roleCheck("ADMIN"), pushController.broadcastPush);
router.get("/admin/push/history", auth, roleCheck("ADMIN"), pushController.getHistoryLogs);

// Admin templates management
router.get("/admin/push/templates", auth, roleCheck("ADMIN"), pushController.getTemplates);
router.post("/admin/push/templates", auth, roleCheck("ADMIN"), pushController.createTemplate);
router.put("/admin/push/templates/:id", auth, roleCheck("ADMIN"), pushController.updateTemplate);
router.delete("/admin/push/templates/:id", auth, roleCheck("ADMIN"), pushController.deleteTemplate);

// Push testing tool endpoint
router.post("/admin/push/test-single", auth, roleCheck("ADMIN"), pushController.testPushSingle);

module.exports = router;
