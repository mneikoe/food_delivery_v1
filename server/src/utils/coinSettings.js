const fs = require("fs");
const path = require("path");

const COIN_SETTINGS_PATH = path.join(__dirname, "../../coin-settings.json");

const DEFAULT_COIN_SETTINGS = {
  coinsPerRupee: 10,
  maxPlaysPerDay: 5,
  referrerReward: 100,
  referredReward: 50,
  deliveryFee: 28,      // Default standard fee
  taxPercent: 5,        // Default 5% tax
};

function getCoinSettings() {
  try {
    if (fs.existsSync(COIN_SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(COIN_SETTINGS_PATH, "utf8"));
      return {
        coinsPerRupee: typeof data.coinsPerRupee === "number" && data.coinsPerRupee > 0 ? data.coinsPerRupee : 10,
        maxPlaysPerDay: typeof data.maxPlaysPerDay === "number" && data.maxPlaysPerDay > 0 ? data.maxPlaysPerDay : 5,
        referrerReward: typeof data.referrerReward === "number" && data.referrerReward >= 0 ? data.referrerReward : 100,
        referredReward: typeof data.referredReward === "number" && data.referredReward >= 0 ? data.referredReward : 50,
        deliveryFee: typeof data.deliveryFee === "number" && data.deliveryFee >= 0 ? data.deliveryFee : 28,
        taxPercent: typeof data.taxPercent === "number" && data.taxPercent >= 0 ? data.taxPercent : 5,
      };
    }
  } catch (err) {
    console.error("coinSettings: read error", err.message);
  }
  return { ...DEFAULT_COIN_SETTINGS };
}

function setCoinSettings(data) {
  const current = getCoinSettings();
  const next = {
    coinsPerRupee: typeof data.coinsPerRupee === "number" && data.coinsPerRupee > 0 ? data.coinsPerRupee : current.coinsPerRupee,
    maxPlaysPerDay: typeof data.maxPlaysPerDay === "number" && data.maxPlaysPerDay > 0 ? data.maxPlaysPerDay : current.maxPlaysPerDay,
    referrerReward: typeof data.referrerReward === "number" && data.referrerReward >= 0 ? data.referrerReward : current.referrerReward,
    referredReward: typeof data.referredReward === "number" && data.referredReward >= 0 ? data.referredReward : current.referredReward,
    deliveryFee: typeof data.deliveryFee === "number" && data.deliveryFee >= 0 ? data.deliveryFee : current.deliveryFee,
    taxPercent: typeof data.taxPercent === "number" && data.taxPercent >= 0 ? data.taxPercent : current.taxPercent,
  };
  fs.writeFileSync(COIN_SETTINGS_PATH, JSON.stringify(next, null, 2));
  return next;
}

module.exports = {
  getCoinSettings,
  setCoinSettings,
};
