const fs = require("fs");
const path = require("path");

// Store in server/data so it persists and is not overwritten by deploys
const DATA_DIR = path.join(__dirname, "../../data");
const HERO_SLIDES_PATH = path.join(DATA_DIR, "hero-slides.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const DEFAULT_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=2070&auto=format&fit=crop",
    headline: "Artisan Gourmet Experiences",
    text: "Handcrafted dishes delivered to your doorstep",
  },
  {
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=2081&auto=format&fit=crop",
    headline: "Fresh & Tasty",
    text: "Order your favorite meals in a few taps",
  },
  {
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=1980&auto=format&fit=crop",
    headline: "Quick Delivery",
    text: "Hot food at your door, fast",
  },
  {
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2080&auto=format&fit=crop",
    headline: "Premium Quality",
    text: "Best ingredients, best taste",
  },
];

const OLD_HERO_SLIDES_PATH = path.join(__dirname, "../../hero-slides.json");

/**
 * Get hero slides from file. Always returns exactly 4 slides (fills with defaults if needed).
 * Migrates from old path (server/hero-slides.json) to server/data/ if old file exists.
 * @returns {{ slides: Array<{ image: string, headline: string, text: string }> }}
 */
function getHeroSlides() {
  try {
    if (fs.existsSync(HERO_SLIDES_PATH)) {
      return readSlidesFrom(HERO_SLIDES_PATH);
    }
    if (fs.existsSync(OLD_HERO_SLIDES_PATH)) {
      const out = readSlidesFrom(OLD_HERO_SLIDES_PATH);
      ensureDataDir();
      fs.writeFileSync(HERO_SLIDES_PATH, JSON.stringify(out, null, 2));
      try { fs.unlinkSync(OLD_HERO_SLIDES_PATH); } catch (_) {}
      return out;
    }
  } catch (err) {
    console.error("heroSlides: read error", err.message);
  }
  return { slides: [...DEFAULT_SLIDES] };
}

function readSlidesFrom(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const slides = Array.isArray(data.slides) ? data.slides : [];
  const result = [];
  for (let i = 0; i < 4; i++) {
    const s = slides[i];
    result.push({
      image: (s && s.image) ? String(s.image).trim() : (DEFAULT_SLIDES[i] && DEFAULT_SLIDES[i].image) || "",
      headline: (s && s.headline) ? String(s.headline).trim() : (DEFAULT_SLIDES[i] && DEFAULT_SLIDES[i].headline) || "",
      text: (s && s.text) ? String(s.text).trim() : (DEFAULT_SLIDES[i] && DEFAULT_SLIDES[i].text) || "",
    });
  }
  return { slides: result };
}

/**
 * Write hero slides to file. Only overwrites a field when the incoming value is non-empty
 * so that empty form fields on admin do not wipe saved data.
 * @param {{ slides: Array<{ image?: string, headline?: string, text?: string }> }} data
 */
function setHeroSlides(data) {
  ensureDataDir();
  const current = getHeroSlides();
  const input = Array.isArray(data.slides) ? data.slides : [];
  const nextSlides = [];
  for (let i = 0; i < 4; i++) {
    const s = input[i] || {};
    const cur = current.slides[i] || {};
    const trim = (v) => (v != null ? String(v).trim() : "");
    const img = trim(s.image);
    const head = trim(s.headline);
    const txt = trim(s.text);
    nextSlides.push({
      image: img !== "" ? img : (cur.image || DEFAULT_SLIDES[i]?.image || ""),
      headline: head !== "" ? head : (cur.headline || DEFAULT_SLIDES[i]?.headline || ""),
      text: txt !== "" ? txt : (cur.text || DEFAULT_SLIDES[i]?.text || ""),
    });
  }
  fs.writeFileSync(HERO_SLIDES_PATH, JSON.stringify({ slides: nextSlides }, null, 2));
  return { slides: nextSlides };
}

module.exports = {
  getHeroSlides,
  setHeroSlides,
};
