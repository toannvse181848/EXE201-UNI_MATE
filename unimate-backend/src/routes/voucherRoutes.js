const express = require('express');
const router = express.Router();
const {
  getPublicVouchers,
  getMyPartnerVouchers,
  createVoucher,
  redeemVoucher,
  toggleVoucherStatus,
  getAllVouchersAdmin,
} = require('../controllers/voucherController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes (Sinh viên)
router.get('/', getPublicVouchers);

// Partner routes
router.get('/my/list', protect, authorize('partner'), getMyPartnerVouchers);
router.post('/', protect, authorize('partner'), createVoucher);
router.post('/redeem', protect, authorize('partner', 'admin'), redeemVoucher);
router.patch('/:id/toggle', protect, authorize('partner', 'admin'), toggleVoucherStatus);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllVouchersAdmin);

module.exports = router;
