const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    // Tên hiển thị = "Tên thương hiệu - Tên chi nhánh" (backend tự ghép khi đối tác lưu)
    name: {
      type: String,
      required: [true, 'Tên địa điểm là bắt buộc'],
      trim: true,
    },
    // Tên chi nhánh / cơ sở, VD: "Sư Vạn Hạnh". Rỗng = quán chỉ có 1 cơ sở.
    // Quán tạo trước khi có quy tắc đặt tên không có trường này.
    branchName: {
      type: String,
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
      default: '',
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
    // Không đặt giá trị mẫu: trước đây quán nào cũng tự có "Wifi 95 Mbps", "Yên tĩnh 4.9/5"
    amenities: {
      wifiSpeed: { type: String },
      powerSockets: { type: String },
      quietScore: { type: String },
      airConditioning: { type: String },
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
    // Điểm đánh giá trung bình; chỉ có ý nghĩa khi reviewsCount > 0 (API công khai trả null nếu chưa có đánh giá)
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    // Số lượt sinh viên mở trang chi tiết quán (số liệu hiệu quả cho chủ quán)
    viewCount: {
      type: Number,
      default: 0,
    },
    // Secret in trong mã QR check-in dán tại quán (xem utils/venueCheckin.js)
    checkinSecret: {
      type: String,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

venueSchema.index({ location: '2dsphere' }, { sparse: true });

venueSchema.pre('validate', function () {
  const { extractDistrict } = require('../utils/addressUtils');
  if (this.address) {
    const isFakeQ10 =
      this.district === 'Quận 10' &&
      !this.address.toLowerCase().includes('quận 10') &&
      !this.address.toLowerCase().includes('q.10') &&
      !this.address.toLowerCase().includes('q10');

    if (!this.district || isFakeQ10) {
      this.district = extractDistrict(this.address, this.district);
    }
  }
});

module.exports = mongoose.model('Venue', venueSchema);

