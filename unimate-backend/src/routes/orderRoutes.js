const express = require('express');
const router = express.Router();
const {
  getPlans,
  createOrder,
  getMyOrders,
  getOrder,
  cancelMyOrder,
  getAllOrders,
  confirmOrder,
  adminCancelOrder,
  exportOrders,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/auth');

// GET /api/orders/plans — bảng giá (công khai)
router.get('/plans', getPlans);

router.use(protect);

// ─── ADMIN (khai báo trước /:code để không bị nhận nhầm là mã đơn) ─────────────
router.get('/admin/all', authorize('admin'), getAllOrders);
router.get('/admin/export', authorize('admin'), exportOrders);
router.patch('/admin/:code/confirm', authorize('admin'), confirmOrder);
router.patch('/admin/:code/cancel', authorize('admin'), adminCancelOrder);

// ─── NGƯỜI MUA ───────────────────────────────────────────────────────────────
router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/:code', getOrder);
router.post('/:code/cancel', cancelMyOrder);

module.exports = router;
