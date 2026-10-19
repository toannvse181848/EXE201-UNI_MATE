const express = require('express');
const router = express.Router();
const {
  getStats,
  getOc3Dashboard,
  exportOc3Dashboard,
  getOc3Settings,
  updateOc3Settings,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect, authorize('admin'));

router.get('/stats', getStats);

// Bảng số liệu tổng hợp cho báo cáo OC3
router.get('/oc3', getOc3Dashboard);
router.get('/oc3/export', exportOc3Dashboard);
router.get('/oc3/settings', getOc3Settings);
router.put('/oc3/settings', updateOc3Settings);

module.exports = router;
