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
  downloadVoucherTemplate,
  previewImportVouchers,
  importVouchersSpreadsheet,
  addVoucherCodes,
  getVoucherCodes,
  updateVoucher,
  deleteVoucher,
} = require('../controllers/voucherController');
const { protect, authorize } = require('../middlewares/auth');
const uploadSpreadsheet = require('../middlewares/uploadSpreadsheet');

// ─── PUBLIC ─────────────────────────────────────────────────────────────────
router.get('/', getPublicVouchers);

// ─── STUDENT (đã đăng nhập) ──────────────────────────────────────────────────
router.use(protect);
router.post('/claim/:id', authorize('student'), claimVoucher);
router.get('/my-wallet', authorize('student'), getMyWallet);

// ─── PARTNER ─────────────────────────────────────────────────────────────────
router.get('/partner/my-vouchers', authorize('partner'), getMyPartnerVouchers);
router.get('/partner/redemptions', authorize('partner', 'cashier'), getPartnerRedemptions);
router.get('/partner/template', authorize('partner', 'admin'), downloadVoucherTemplate);
router.post(
  '/partner/preview',
  authorize('partner', 'admin'),
  uploadSpreadsheet.single('file'),
  previewImportVouchers
);
router.post(
  '/partner/import',
  authorize('partner', 'admin'),
  uploadSpreadsheet.single('file'),
  importVouchersSpreadsheet
);
router.post('/', authorize('partner'), createVoucher);
router.patch('/:id/toggle', authorize('partner', 'admin'), toggleVoucherStatus);
router.put('/:id', authorize('partner', 'admin'), updateVoucher);
router.delete('/:id', authorize('partner', 'admin'), deleteVoucher);

// Voucher mã riêng: nạp danh sách mã (JSON { codes } hoặc file Excel/CSV, mã ở cột đầu) và xem tình trạng từng mã
router.post('/:id/codes', authorize('partner', 'admin'), uploadSpreadsheet.single('file'), addVoucherCodes);
router.get('/:id/codes', authorize('partner', 'admin'), getVoucherCodes);


// ─── ĐỐI SOÁT TẠI QUÁN (thu ngân quét QR / nhập mã) ──────────────────────────
// Thu ngân chỉ quét được voucher của chi nhánh mình được gắn (xem getScanScope)
router.post('/verify', authorize('partner', 'admin', 'cashier'), verifyVoucher);
router.post('/redeem', authorize('partner', 'admin', 'cashier'), redeemVoucher);

// ─── ADMIN ───────────────────────────────────────────────────────────────────
router.get('/admin/all', authorize('admin'), getAllVouchersAdmin);

module.exports = router;
