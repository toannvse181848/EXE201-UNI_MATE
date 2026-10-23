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
  sepayWebhook,
  adminCancelOrder,
  exportOrders,
  getPayments,
  resolvePayment,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/auth');

// GET /api/orders/plans — bảng giá (công khai)
router.get('/plans', getPlans);

// POST /api/orders/webhook/sepay — SePay báo tiền về (xác thực bằng API key, không dùng JWT)
router.post('/webhook/sepay', sepayWebhook);

router.use(protect);

// ─── ADMIN (khai báo trước /:code để không bị nhận nhầm là mã đơn) ─────────────
router.get('/admin/all', authorize('admin'), getAllOrders);
router.get('/admin/export', authorize('admin'), exportOrders);
router.patch('/admin/:code/confirm', authorize('admin'), confirmOrder);
router.patch('/admin/:code/cancel', authorize('admin'), adminCancelOrder);
// Giao dịch SePay không khớp đơn (chuyển thiếu, sai nội dung, đơn đã đóng) để đối soát tay
router.get('/admin/payments', authorize('admin'), getPayments);
router.patch('/admin/payments/:id', authorize('admin'), resolvePayment);

// ─── NGƯỜI MUA ───────────────────────────────────────────────────────────────
router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/:code', getOrder);
router.post('/:code/cancel', cancelMyOrder);

module.exports = router;
