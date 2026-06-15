const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Blocked Extensions & Script formats
const blockedExtensions = ['.exe', '.bat', '.php', '.sh', '.js', '.cmd', '.com', '.msi'];
const blockedMimeTypes = [
  'application/x-msdownload',
  'application/x-sh',
  'application/x-php',
  'text/javascript',
  'application/javascript'
];

const validateFileSecurity = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Extension check
  if (blockedExtensions.includes(ext)) {
    return { valid: false, message: `Files with extension ${ext} are blocked for security reasons.` };
  }
  
  // MIME type check
  if (blockedMimeTypes.includes(file.mimetype)) {
    return { valid: false, message: `MIME type ${file.mimetype} is blocked.` };
  }
  
  return { valid: true };
};

// Configure multer storage for APK files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const filename = 'app-release.apk'; // Fixed name for easy reference
    cb(null, filename);
  }
});

// File filter to only accept APK files
const fileFilter = (req, file, cb) => {
  const security = validateFileSecurity(file);
  if (!security.valid) {
    return cb(new Error(security.message), false);
  }

  if (file.originalname.toLowerCase().endsWith('.apk')) {
    cb(null, true);
  } else {
    cb(new Error('Only .apk files are allowed!'), false);
  }
};

// Configure multer for APK (limited to 5MB for security requirement)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
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
  const security = validateFileSecurity(file);
  if (!security.valid) {
    return cb(new Error(security.message), false);
  }

  const ok = /\.(jpe?g|png|webp|gif)$/i.test(file.originalname) || (file.mimetype && file.mimetype.startsWith('image/'));
  if (ok) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for hero slides!'), false);
  }
};

const uploadHero = multer({
  storage: heroStorage,
  fileFilter: heroFileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB per image
  }
});

module.exports = upload;
module.exports.uploadHero = uploadHero;
