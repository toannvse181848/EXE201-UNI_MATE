const express = require('express');
const router = express.Router();
const {
  getVenues,
  getVenueById,
  getMyVenues,
  uploadVenueImages,
  createVenue,
  updateVenue,
  getAllVenuesAdmin,
  updateVenueStatus,
} = require('../controllers/venueController');
const { protect, authorize } = require('../middlewares/auth');
const { uploadVenueImages: uploadImages } = require('../config/cloudinary');

// Public routes
router.get('/', getVenues);
router.get('/:id', getVenueById);

// Partner routes
router.get('/my/list', protect, authorize('partner'), getMyVenues);
router.post(
  '/images',
  protect,
  authorize('partner', 'admin'),
  uploadImages.array('images', 10),
  uploadVenueImages
);
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
