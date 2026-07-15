const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const logger = require("../utils/logger");
const emailService = require("./emailService");

class AuthService {
  // ─── Helpers ─────────────────────────────────────────────────────────────

  _generateOtp() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  _signToken(user) {
    return jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
  }

  _userPayload(user) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || null,
      isEmailVerified: user.isEmailVerified || false,
      referralCode: user.referralCode,
      coins: user.coins || 0,
    };
  }

  // ─── OTP Auth ────────────────────────────────────────────────────────────

  async sendEmailOtp(email) {
    const normalizedEmail = email.trim().toLowerCase();
    
    // Find existing user or create one
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = new User({
        email: normalizedEmail,
        name: normalizedEmail.split("@")[0],
        role: "USER",
      });
    }

    // Cooldown check: 60 seconds
    const now = Date.now();
    if (user.lastOtpSentAt && (now - new Date(user.lastOtpSentAt).getTime() < 60000)) {
      throw new Error("Please wait 60 seconds before requesting a new OTP.");
    }

    // Email rate limiting: Max 3 requests per 10 minutes
    const tenMinutes = 10 * 60 * 1000;
    if (user.otpWindowStart && (now - new Date(user.otpWindowStart).getTime() < tenMinutes)) {
      if (user.otpCount >= 3) {
        throw new Error("Too many OTP requests. Please try again later.");
      }
      user.otpCount += 1;
    } else {
      user.otpCount = 1;
      user.otpWindowStart = new Date();
    }

    const otp = this._generateOtp();
    const otpExpiry = new Date(now + 30 * 60 * 1000); // 30 minutes
    const otpHash = await bcrypt.hash(otp, 10);

    user.otpHash = otpHash;
    user.otpExpiry = otpExpiry;
    user.lastOtpSentAt = new Date();
    user.otpAttempts = 0; // Reset verification attempts
    await user.save();

    logger.log("OTP_REQUEST", { email: normalizedEmail });

    await emailService.sendOtpEmail(normalizedEmail, otp);

    return { success: true, message: "OTP sent to email" };
  }

  async verifyEmailOtp(email, otp, referralCode = "") {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) throw new Error("No account found with this email");
    
    // If attempts already exceeded, block immediately
    if (user.otpAttempts >= 5) {
      // Invalidate active OTP if not already invalidated
      user.otpHash = undefined;
      user.otpExpiry = undefined;
      await user.save();
      logger.log("OTP_VERIFY", { email: normalizedEmail, success: false, reason: "ATTEMPTS_EXCEEDED" });
      throw new Error("Too many failed attempts. Please generate a new OTP.");
    }

    if (!user.otpHash || !user.otpExpiry) throw new Error("OTP not requested. Please send OTP first.");
    if (new Date() > new Date(user.otpExpiry)) throw new Error("OTP has expired. Please request a new one.");

    const isMatch = await bcrypt.compare(String(otp).trim(), user.otpHash);
    
    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= 5) {
        // Invalidate OTP on 5th failure
        user.otpHash = undefined;
        user.otpExpiry = undefined;
        await user.save();
        logger.log("OTP_VERIFY", { email: normalizedEmail, success: false, reason: "MAX_FAILED_ATTEMPTS" });
        throw new Error("Too many failed attempts. OTP has been invalidated. Please generate a new OTP.");
      }
      await user.save();
      logger.log("OTP_VERIFY", { email: normalizedEmail, success: false, reason: "INVALID_CODE" });
      throw new Error("Invalid OTP. Please check and try again.");
    }

    // Clear OTP after successful verification
    const isNewUser = !user.isEmailVerified;
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    user.isEmailVerified = true;

    // Apply referral code if it's a new user and referralCode is provided
    if (isNewUser && referralCode && referralCode.trim()) {
      const cleanRefCode = referralCode.trim().toUpperCase();
      const referrer = await User.findOne({ referralCode: cleanRefCode });
      
      // Prevent self-referral and ensure referrer is valid
      if (referrer && referrer._id.toString() !== user._id.toString() && !user.referredBy) {
        const Referral = require("../models/Referral");
        const CoinTransaction = require("../models/CoinTransaction");
        const { getCoinSettings } = require("../utils/coinSettings");
        
        const settings = getCoinSettings();
        const referrerReward = settings.referrerReward || 100;
        const referredReward = settings.referredReward || 50;
        
        // Link referral
        user.referredBy = referrer._id;
        
        // Save referral record
        const referral = new Referral({
          referrerId: referrer._id,
          referredId: user._id,
          coinsEarnedReferrer: referrerReward,
          coinsEarnedReferred: referredReward,
          status: "COMPLETED",
        });
        await referral.save();
        
        // Award referrer
        referrer.coins = (referrer.coins || 0) + referrerReward;
        await referrer.save();
        
        const tx1 = new CoinTransaction({
          userId: referrer._id,
          coins: referrerReward,
          type: "REFERRAL_BONUS",
          source: "Refer & Earn",
          metadata: { referredUserId: user._id }
        });
        await tx1.save();
        
        // Award referred user
        user.coins = (user.coins || 0) + referredReward;
        
        const tx2 = new CoinTransaction({
          userId: user._id,
          coins: referredReward,
          type: "REFERRAL_SIGNUP_BONUS",
          source: "Referral Sign Up",
          metadata: { referrerUserId: referrer._id }
        });
        await tx2.save();
      }
    }

    await user.save();

    const token = this._signToken(user);
    return { token, user: this._userPayload(user) };
  }


  // ─── Password Auth ───────────────────────────────────────────────────────

  async registerWithPassword(email, password, name) {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.passwordHash) {
        throw new Error("Email already registered. Please login instead.");
      } else {
        // OTP-only user upgrading to password
        existing.passwordHash = await bcrypt.hash(password, 12);
        if (name) existing.name = name.trim();
        await existing.save();
        const token = this._signToken(existing);
        return { token, user: this._userPayload(existing) };
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: normalizedEmail,
      name: (name || normalizedEmail.split("@")[0]).trim(),
      passwordHash,
      role: "USER",
    });

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(normalizedEmail, user.name).catch(() => {});

    const token = this._signToken(user);
    return { token, user: this._userPayload(user) };
  }

  async loginWithPassword(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) throw new Error("Invalid email or password");

    if (!user.passwordHash) {
      throw new Error(
        "This account uses OTP login. Please use the OTP option to login."
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new Error("Invalid email or password");

    if (!user.isActive) throw new Error("Your account has been deactivated. Contact support.");

    const token = this._signToken(user);
    return { token, user: this._userPayload(user) };
  }

  // ─── FCM Token ───────────────────────────────────────────────────────────

  async updateFCMToken(userId, fcmToken) {
    await User.findByIdAndUpdate(userId, { fcmToken });
    return { success: true };
  }

  async verifyReferralCode(code) {
    const cleanCode = (code || "").trim().toUpperCase();
    const referrer = await User.findOne({ referralCode: cleanCode });
    if (!referrer) {
      throw new Error("Invalid referral code");
    }
    return { success: true, name: referrer.name, email: referrer.email };
  }
}


module.exports = new AuthService();
