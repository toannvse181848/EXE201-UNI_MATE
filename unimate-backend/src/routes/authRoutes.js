const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/register/student', authController.registerStudent);
router.post('/register/partner', authController.registerPartner);

router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);
router.post('/change-password', protect, authController.changePassword);

// Quên mật khẩu
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;