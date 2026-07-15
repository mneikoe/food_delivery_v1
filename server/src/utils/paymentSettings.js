const fs = require("fs");
const path = require("path");

const PAYMENT_SETTINGS_PATH = path.join(__dirname, "../../payment-settings.json");

const DEFAULT_SETTINGS = {
  codActive: true,
  onlineActive: true
};

function getPaymentSettings() {
  try {
    if (fs.existsSync(PAYMENT_SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(PAYMENT_SETTINGS_PATH, "utf8"));
      return {
        codActive: data.codActive === true || data.codActive === "true" || data.codActive === undefined,
        onlineActive: data.onlineActive === true || data.onlineActive === "true" || data.onlineActive === undefined
      };
    }
  } catch (err) {
    console.error("paymentSettings: read error", err.message);
  }
  return { ...DEFAULT_SETTINGS };
}

function setPaymentSettings(data) {
  const current = getPaymentSettings();
  const next = {
    codActive: data.codActive !== undefined ? (data.codActive === true || data.codActive === "true") : current.codActive,
    onlineActive: data.onlineActive !== undefined ? (data.onlineActive === true || data.onlineActive === "true") : current.onlineActive
  };
  fs.writeFileSync(PAYMENT_SETTINGS_PATH, JSON.stringify(next, null, 2));
  return next;
}

module.exports = {
  getPaymentSettings,
  setPaymentSettings
};
