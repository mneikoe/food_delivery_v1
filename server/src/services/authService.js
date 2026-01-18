const jwt = require("jsonwebtoken");
const User = require("../models/User");
const supabase = require("../config/supabase");

class AuthService {
  async sendEmailOtp(email) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    console.log("SUPABASE OTP DATA:", data);
    console.log("SUPABASE OTP ERROR:", error);

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: "OTP sent to email",
    };
  }

  async verifyEmailOtp(email, otp) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) throw new Error("Invalid or expired OTP");

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name: email.split("@")[0],
        supabaseId: data.user.id,
        role: "USER",
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}

module.exports = new AuthService();
