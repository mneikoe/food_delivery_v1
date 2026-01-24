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

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

module.exports = upload;
