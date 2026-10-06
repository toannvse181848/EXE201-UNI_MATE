const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Tạo middleware multer upload ảnh.
 * - Có Cloudinary: lưu lên Cloudinary trong thư mục `unimate/<subdir>`
 * - Chưa có: lưu tạm vào ổ đĩa `uploads/<subdir>` (Render free sẽ xoá khi restart)
 */
const createImageUploader = ({ subdir, transformation }) => {
  let storage;

  if (isCloudinaryConfigured) {
    storage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: `unimate/${subdir}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation,
      },
    });
  } else {
    const uploadDir = path.join(__dirname, '../../uploads', subdir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${subdir}-${uniqueSuffix}${ext}`);
      },
    });
  }

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new ApiError(400, 'Chỉ chấp nhận file hình ảnh (jpg, png, webp...)'), false);
      }
      cb(null, true);
    },
  });
};

const uploadAvatar = createImageUploader({
  subdir: 'avatars',
  transformation: [
    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    { quality: 'auto', fetch_format: 'auto' },
  ],
});

const uploadVenueImages = createImageUploader({
  subdir: 'venues',
  transformation: [
    { width: 1200, height: 900, crop: 'limit' },
    { quality: 'auto', fetch_format: 'auto' },
  ],
});

/** Lấy URL public của file vừa upload (URL Cloudinary hoặc link static local) */
const getUploadedFileUrl = (req, file, subdir) => {
  if (file.path && /^https?:\/\//.test(file.path)) return file.path;
  return `${req.protocol}://${req.get('host')}/uploads/${subdir}/${file.filename}`;
};

module.exports = {
  cloudinary,
  uploadAvatar,
  uploadVenueImages,
  getUploadedFileUrl,
  isCloudinaryConfigured,
};
