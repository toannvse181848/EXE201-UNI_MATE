const express = require('express');
const router = express.Router();
const {
  createReport,
  getAllReports,
  resolveReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.post('/', createReport);
router.get('/admin/all', authorize('admin'), getAllReports);
router.patch('/admin/:id', authorize('admin'), resolveReport);

module.exports = router;
