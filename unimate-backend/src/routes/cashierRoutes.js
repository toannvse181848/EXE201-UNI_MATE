const express = require('express');
const router = express.Router();
const { getMyCashiers, createCashier, updateCashier, deleteCashier } = require('../controllers/cashierController');
const { protect, authorize } = require('../middlewares/auth');

// Chủ quán quản lý tài khoản thu ngân của các chi nhánh
router.use(protect, authorize('partner'));
router.get('/', getMyCashiers);
router.post('/', createCashier);
router.patch('/:id', updateCashier);
router.delete('/:id', deleteCashier);

module.exports = router;
