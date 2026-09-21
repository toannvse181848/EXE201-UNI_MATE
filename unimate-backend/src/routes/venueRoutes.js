const express = require('express');
const router = express.Router();
const {
  getVenues,
  getVenueById,
  getMyVenues,
  createVenue,
  updateVenue,
  getAllVenuesAdmin,
  updateVenueStatus,
} = require('../controllers/venueController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', getVenues);
router.get('/:id', getVenueById);

// Partner routes
router.get('/my/list', protect, authorize('partner'), getMyVenues);
router.post('/', protect, authorize('partner'), createVenue);
router.put('/:id', protect, authorize('partner', 'admin'), updateVenue);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllVenuesAdmin);
router.patch(
  '/:id/status',
  protect,
  authorize('admin'),
  updateVenueStatus
);

module.exports = router;
