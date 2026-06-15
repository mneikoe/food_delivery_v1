const authService = require("../services/authService");
const auth = require("../middleware/auth");

// ─── OTP Auth ────────────────────────────────────────────────────────────────

exports.sendEmailOtp = async (req, res) => {
  try {
    const email = (req.body.email || "").trim();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    const result = await authService.sendEmailOtp(email);
    res.json(result);
  } catch (err) {
    console.error("[AuthController] sendEmailOtp:", err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const email = (req.body.email || "").trim();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const result = await authService.verifyEmailOtp(email, otp);
    
    if (result.user && result.user.role === "ADMIN") {
      const { logAudit } = require("../utils/auditLogger");
      await logAudit({
        action: "ADMIN_LOGIN",
        actorId: result.user.id,
        entityType: "User",
        entityId: result.user.id.toString(),
        metadata: { email: result.user.email, method: "OTP" }
      });
    }

    res.json(result);
  } catch (err) {
    console.error("[AuthController] verifyEmailOtp:", err.message);
    res.status(400).json({ error: err.message });
  }
};

// ─── Password Auth ────────────────────────────────────────────────────────────

exports.registerWithPassword = async (req, res) => {
  try {
    const email = (req.body.email || "").trim();
    const password = req.body.password || "";
    const name = (req.body.name || "").trim();

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const result = await authService.registerWithPassword(email, password, name);
    res.status(201).json(result);
  } catch (err) {
    console.error("[AuthController] registerWithPassword:", err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.loginWithPassword = async (req, res) => {
  try {
    const email = (req.body.email || "").trim();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await authService.loginWithPassword(email, password);
    
    if (result.user && result.user.role === "ADMIN") {
      const { logAudit } = require("../utils/auditLogger");
      await logAudit({
        action: "ADMIN_LOGIN",
        actorId: result.user.id,
        entityType: "User",
        entityId: result.user.id.toString(),
        metadata: { email: result.user.email, method: "PASSWORD" }
      });
    }

    res.json(result);
  } catch (err) {
    console.error("[AuthController] loginWithPassword:", err.message);
    res.status(400).json({ error: err.message });
  }
};

// ─── FCM Token ────────────────────────────────────────────────────────────────

exports.updateFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user._id;

    if (!fcmToken) {
      return res.status(400).json({ error: "FCM token required" });
    }

    const result = await authService.updateFCMToken(userId, fcmToken);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
