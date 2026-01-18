const authService = require("../services/authService");

exports.sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email required" });
    }

    const result = await authService.sendEmailOtp(email);
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim();
    const otp = String(req.body.otp).trim();

    const result = await authService.verifyEmailOtp(email, otp);
    res.json(result);
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err.message);
    res.status(400).json({ error: err.message });
  }
};

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
