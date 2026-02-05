const fs = require("fs");
const path = require("path");

const ORDER_WINDOW_PATH = path.join(__dirname, "../../order-window.json");

const DEFAULT_ORDER_WINDOW = {
  orderWindowEnabled: true,
  orderWindowStart: "00:00",
  orderWindowEnd: "23:59",
};

/**
 * Get order window settings from file.
 * @returns {{ orderWindowEnabled: boolean, orderWindowStart: string, orderWindowEnd: string }}
 */
function getOrderWindowSettings() {
  try {
    if (fs.existsSync(ORDER_WINDOW_PATH)) {
      const data = JSON.parse(fs.readFileSync(ORDER_WINDOW_PATH, "utf8"));
      return {
        orderWindowEnabled: data.orderWindowEnabled !== false,
        orderWindowStart: data.orderWindowStart || "00:00",
        orderWindowEnd: data.orderWindowEnd || "23:59",
      };
    }
  } catch (err) {
    console.error("orderWindow: read error", err.message);
  }
  return { ...DEFAULT_ORDER_WINDOW };
}

/**
 * Parse "HH:mm" to minutes since midnight.
 */
function timeToMinutes(timeStr) {
  const [h, m] = (timeStr || "00:00").toString().split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Get current time in IST (India Standard Time) as minutes since midnight.
 */
function getCurrentISTMinutes() {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return ist.getHours() * 60 + ist.getMinutes();
}

/**
 * Check if orders are currently accepted based on order window settings.
 * @returns {{ open: boolean, message?: string }}
 */
function isOrderWindowOpen() {
  const settings = getOrderWindowSettings();
  if (!settings.orderWindowEnabled) {
    return { open: false, message: "Orders are currently closed. Please try again later." };
  }
  const startM = timeToMinutes(settings.orderWindowStart);
  const endM = timeToMinutes(settings.orderWindowEnd);
  const currentM = getCurrentISTMinutes();
  const inWindow = startM <= endM
    ? currentM >= startM && currentM <= endM
    : currentM >= startM || currentM <= endM;
  if (!inWindow) {
    return {
      open: false,
      message: `Orders are accepted only between ${settings.orderWindowStart} and ${settings.orderWindowEnd} (IST). Please try again during this time.`,
    };
  }
  return { open: true };
}

/**
 * Write order window settings to file.
 * @param {{ orderWindowEnabled?: boolean, orderWindowStart?: string, orderWindowEnd?: string }} data
 */
function setOrderWindowSettings(data) {
  const current = getOrderWindowSettings();
  const next = {
    orderWindowEnabled: data.orderWindowEnabled !== undefined ? data.orderWindowEnabled : current.orderWindowEnabled,
    orderWindowStart: data.orderWindowStart !== undefined ? data.orderWindowStart : current.orderWindowStart,
    orderWindowEnd: data.orderWindowEnd !== undefined ? data.orderWindowEnd : current.orderWindowEnd,
  };
  fs.writeFileSync(ORDER_WINDOW_PATH, JSON.stringify(next, null, 2));
  return next;
}

module.exports = {
  getOrderWindowSettings,
  isOrderWindowOpen,
  setOrderWindowSettings,
};
