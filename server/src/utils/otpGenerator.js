const generateOTP = (length = 4) => {
  // Default: 4-digit OTP for delivery (1000 to 9999)
  // Can be used with length parameter: generateOTP(6) for auth OTP
  if (length === 6) {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  // 4-digit OTP for delivery
  return Math.floor(1000 + Math.random() * 9000).toString();
};

module.exports = { generateOTP };
