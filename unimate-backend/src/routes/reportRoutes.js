const express = require('express');
const router = express.Router();
const {
  createReport,
  getAllReports,
  resolveReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

// Student/User: Tạo báo cáo
router.post('/', createReport);

// Admin: Xem tất cả báo cáo
router.get('/', authorize('admin'), getAllReports);
router.get('/admin/all', authorize('admin'), getAllReports); // backward compat

// Admin: Xử lý báo cáo
router.patch('/:id', authorize('admin'), resolveReport);
router.patch('/admin/:id', authorize('admin'), resolveReport); // backward compat

module.exports = router;
