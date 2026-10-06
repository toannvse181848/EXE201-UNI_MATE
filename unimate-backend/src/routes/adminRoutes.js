const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect, authorize('admin'));

router.get('/stats', getStats);

module.exports = router;
