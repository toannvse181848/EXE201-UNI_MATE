const express = require('express');
const router = express.Router();
const {
  getPublicVouchers,
  claimVoucher,
  getMyWallet,
  redeemVoucher,
  getMyPartnerVouchers,
  createVoucher,
  toggleVoucherStatus,
  getAllVouchersAdmin,
} = require('../controllers/voucherController');
const { protect, authorize } = require('../middlewares/auth');

// ─── PUBLIC ─────────────────────────────────────────────────────────────────
router.get('/', getPublicVouchers);

// ─── STUDENT (đã đăng nhập) ──────────────────────────────────────────────────
router.use(protect);
router.post('/claim/:id', authorize('student'), claimVoucher);
router.get('/my-wallet', authorize('student'), getMyWallet);

// ─── PARTNER ─────────────────────────────────────────────────────────────────
router.get('/partner/my-vouchers', authorize('partner'), getMyPartnerVouchers);
router.post('/', authorize('partner'), createVoucher);
router.patch('/:id/toggle', authorize('partner', 'admin'), toggleVoucherStatus);

// ─── PARTNER + STUDENT (đối soát tại quán) ───────────────────────────────────
router.post('/redeem', authorize('partner', 'student', 'admin'), redeemVoucher);

// ─── ADMIN ───────────────────────────────────────────────────────────────────
router.get('/admin/all', authorize('admin'), getAllVouchersAdmin);

module.exports = router;
