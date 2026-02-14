const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage for APK files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename or use a custom name
    const filename = 'app-release.apk'; // Fixed name for easy reference
    cb(null, filename);
  }
});

// File filter to only accept APK files
const fileFilter = (req, file, cb) => {
  if (file.originalname.endsWith('.apk')) {
    cb(null, true);
  } else {
    cb(new Error('Only .apk files are allowed!'), false);
  }
};

// Configure multer for APK
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

// Hero slide images: save to uploads/hero/
const heroDir = path.join(__dirname, '../../uploads/hero');
if (!fs.existsSync(heroDir)) {
  fs.mkdirSync(heroDir, { recursive: true });
}
const heroStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, heroDir),
  filename: (req, file, cb) => {
    const index = req.query?.slideIndex ?? 0;
    const ext = (file.originalname && path.extname(file.originalname)) || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext.toLowerCase()) ? ext : '.jpg';
    cb(null, `hero-${index}${safeExt}`);
  }
});
const heroFileFilter = (req, file, cb) => {
  const ok = /\.(jpe?g|png|webp|gif)$/i.test(file.originalname) || (file.mimetype && file.mimetype.startsWith('image/'));
  cb(null, !!ok);
};
const uploadHero = multer({
  storage: heroStorage,
  fileFilter: heroFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per image
});

module.exports = upload;
module.exports.uploadHero = uploadHero;
