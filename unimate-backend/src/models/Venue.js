const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên địa điểm là bắt buộc'],
      trim: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Địa chỉ là bắt buộc'],
      trim: true,
    },
    district: {
      type: String,
      trim: true,
      default: 'Quận 10',
    },
    city: {
      type: String,
      default: 'TP.HCM',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [106.6667, 10.7769],
      },
    },
    phone: {
      type: String,
      trim: true,
    },
    openHours: {
      type: String,
      default: '07:00 - 22:30',
    },
    priceRange: {
      type: String,
      default: '35.000 - 65.000 VNĐ',
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
    },
    images: [{ type: String }],
    category: {
      type: String,
      enum: ['study', 'chill', 'boardgame', 'group', 'other'],
      default: 'study',
    },
    tags: [{ type: String }],
    amenities: {
      wifiSpeed: { type: String, default: '95 Mbps' },
      powerSockets: { type: String, default: 'Mỗi bàn đều có' },
      quietScore: { type: String, default: '4.9/5.0' },
      airConditioning: { type: String, default: 'Mát lạnh 24/7' },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 1,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

venueSchema.index({ location: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Venue', venueSchema);
