const express = require('express');
const router = express.Router();
const {
  getPublicVouchers,
  claimVoucher,
  getMyWallet,
  verifyVoucher,
  redeemVoucher,
  getPartnerRedemptions,
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
router.get('/partner/redemptions', authorize('partner'), getPartnerRedemptions);
router.post('/', authorize('partner'), createVoucher);
router.patch('/:id/toggle', authorize('partner', 'admin'), toggleVoucherStatus);

// ─── ĐỐI SOÁT TẠI QUÁN (thu ngân quét QR / nhập mã) ──────────────────────────
router.post('/verify', authorize('partner', 'admin'), verifyVoucher);
router.post('/redeem', authorize('partner', 'admin'), redeemVoucher);

// ─── ADMIN ───────────────────────────────────────────────────────────────────
router.get('/admin/all', authorize('admin'), getAllVouchersAdmin);

module.exports = router;
