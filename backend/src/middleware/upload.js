const fs = require('fs');
const path = require('path');
const multer = require('multer');

const createDirectory = (folder) => {
  const directory = path.join(__dirname, '..', '..', 'uploads', folder);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
};

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const folder = file.fieldname === 'avatar' ? 'avatars' : file.fieldname === 'storyMedia' ? 'stories' : file.fieldname === 'chatMedia' ? 'chat' : 'posts';
    cb(null, createDirectory(folder));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/\s+/g, '-')}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    return cb(null, true);
  }
  cb(new Error('Only image and video files are supported'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } });

module.exports = upload;