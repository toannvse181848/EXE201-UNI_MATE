const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');

const storage = multer.memoryStorage();

const uploadSpreadsheet = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    const mime = file.mimetype || '';
    if (
      allowedExts.includes(ext) ||
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime.includes('csv')
    ) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Chỉ chấp nhận file định dạng Excel (.xlsx, .xls) hoặc CSV (.csv)'), false);
    }
  },
});

module.exports = uploadSpreadsheet;
