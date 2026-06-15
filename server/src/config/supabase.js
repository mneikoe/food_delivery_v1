// Supabase is no longer used for authentication.
// Auth is now handled via Nodemailer OTP + custom JWT (see authService.js)
// This file is kept as a stub to avoid breaking any remaining imports.

const supabase = {
  auth: {
    signInWithOtp: async () => {
      throw new Error("Supabase auth is deprecated. Use /api/auth/send-email-otp instead.");
    },
    verifyOtp: async () => {
      throw new Error("Supabase auth is deprecated. Use /api/auth/verify-email-otp instead.");
    },
  },
};

module.exports = supabase;
