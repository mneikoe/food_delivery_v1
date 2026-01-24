const generateOTP = () => {
  // Generate 6-digit OTP (100000 to 999999)
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { generateOTP };
