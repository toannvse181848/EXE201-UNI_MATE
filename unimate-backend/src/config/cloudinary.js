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

const uploadChatMedia = multer({
  storage: isCloudinaryConfigured
    ? new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => {
          let originalName = file.originalname || 'file';
          try {
            originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
          } catch (e) {}

          const ext = path.extname(originalName) || '';
          const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_') || 'file';
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
          const isRaw = !file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/');

          return {
            folder: 'unimate/chat',
            resource_type: isRaw ? 'raw' : 'auto',
            // File raw cần giữ đuôi trong public_id; ảnh/video Cloudinary tự gắn đuôi
            // (nếu thêm nữa sẽ thành abc.png.png)
            public_id: isRaw ? `${baseName}_${uniqueSuffix}${ext}` : `${baseName}_${uniqueSuffix}`,
          };
        },
      })
    : (() => {
        const uploadDir = path.join(__dirname, '../../uploads/chat');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        return multer.diskStorage({
          destination: (req, file, cb) => cb(null, uploadDir),
          filename: (req, file, cb) => {
            const ext = path.extname(file.originalname) || '';
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `chat-${uniqueSuffix}${ext}`);
          },
        });
      })(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max cho video / tài liệu / ảnh
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
  uploadChatMedia,
  getUploadedFileUrl,
  isCloudinaryConfigured,
};
