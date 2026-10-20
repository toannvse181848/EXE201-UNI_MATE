const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const {
  authLimiter,
  registerLimiter,
  forgotPasswordLimiter,
} = require('../middlewares/security');

router.post('/register', registerLimiter, authController.register);
router.post('/register/student', registerLimiter, authController.registerStudent);
router.post('/register/partner', registerLimiter, authController.registerPartner);

router.post('/login', authLimiter, authController.login);
router.post('/google', authLimiter, authController.googleLogin);
router.get('/me', protect, authController.getMe);
router.post('/change-password', protect, authController.changePassword);

// Quên mật khẩu & Reset mật khẩu
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

module.exports = router;
