const express = require('express');
const router = express.Router();
const {
  getPlans,
  createOrder,
  getMyOrders,
  getOrder,
  cancelMyOrder,
  reviewOrder,
  getAllOrders,
  confirmOrder,
  sepayWebhook,
  adminCancelOrder,
  setPaymentRef,
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
// Bổ sung mã giao dịch ngân hàng cho đơn đã thanh toán (đối chiếu sao kê)
router.patch('/admin/:code/payment-ref', authorize('admin'), setPaymentRef);
// Giao dịch SePay không khớp đơn (chuyển thiếu, sai nội dung, đơn đã đóng) để đối soát tay
router.get('/admin/payments', authorize('admin'), getPayments);
router.patch('/admin/payments/:id', authorize('admin'), resolvePayment);

// ─── NGƯỜI MUA ───────────────────────────────────────────────────────────────
router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/:code', getOrder);
router.post('/:code/cancel', cancelMyOrder);
// Khách đánh giá đơn đã thanh toán của mình (1–5 sao + nhận xét)
router.post('/:code/review', reviewOrder);

module.exports = router;
