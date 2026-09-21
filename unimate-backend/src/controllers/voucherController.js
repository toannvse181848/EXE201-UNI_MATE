const Voucher = require('../models/Voucher');
const Venue = require('../models/Venue');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

// Danh sách voucher công khai còn hạn (Dành cho Sinh viên)
const getPublicVouchers = catchAsync(async (req, res) => {
  const { venueId } = req.query;
  const filter = {
    isActive: true,
    validUntil: { $gte: new Date() },
  };

  if (venueId) {
    filter.venueId = venueId;
  }

  const vouchers = await Voucher.find(filter)
    .populate('venueId', 'name address image rating category')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: vouchers.length,
    data: vouchers,
  });
});

// Partner: Lấy danh sách voucher do chính đối tác phát hành
const getMyPartnerVouchers = catchAsync(async (req, res) => {
  const vouchers = await Voucher.find({ partnerId: req.user._id })
    .populate('venueId', 'name address image')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: vouchers.length,
    data: vouchers,
  });
});

// Partner: Tạo Voucher khuyến mãi mới
const createVoucher = catchAsync(async (req, res) => {
  const { venueId, code } = req.body;

  // Kiểm tra quyền sở hữu địa điểm
  const venue = await Venue.findById(venueId);
  if (!venue) {
    throw new ApiError(404, 'Không tìm thấy địa điểm');
  }
  if (
    venue.partnerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Bạn không sở hữu địa điểm này');
  }

  // Kiểm tra trùng mã
  const existing = await Voucher.findOne({ code: code.toUpperCase().trim() });
  if (existing) {
    throw new ApiError(400, 'Mã voucher này đã tồn tại trên hệ thống');
  }

  const voucher = await Voucher.create({
    ...req.body,
    code: code.toUpperCase().trim(),
    partnerId: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Tạo voucher khuyến mãi thành công',
    data: voucher,
  });
});

// Partner: Quét mã QR đối soát và trừ lượt voucher tại quán
const redeemVoucher = catchAsync(async (req, res) => {
  const { code } = req.body;
  if (!code) {
    throw new ApiError(400, 'Vui lòng cung cấp mã voucher cần đối soát');
  }

  const voucher = await Voucher.findOne({
    code: code.toUpperCase().trim(),
  }).populate('venueId', 'name address partnerId');

  if (!voucher) {
    throw new ApiError(404, 'Mã voucher không tồn tại hoặc không hợp lệ');
  }

  if (!voucher.isActive) {
    throw new ApiError(400, 'Voucher này hiện đã bị tạm dừng áp dụng');
  }

  if (new Date(voucher.validUntil) < new Date()) {
    throw new ApiError(400, 'Voucher này đã hết hạn sử dụng');
  }

  if (voucher.usedCount >= voucher.quantity) {
    throw new ApiError(400, 'Voucher này đã hết số lượng phát hành');
  }

  // Tăng lượt sử dụng
  voucher.usedCount += 1;
  await voucher.save();

  res.status(200).json({
    success: true,
    message: 'Đối soát & áp dụng voucher thành công!',
    data: {
      code: voucher.code,
      title: voucher.title,
      discountPercent: voucher.discountPercent,
      venueName: voucher.venueId?.name,
      remainingCount: voucher.quantity - voucher.usedCount,
      redeemedAt: new Date(),
    },
  });
});

// Partner hoặc Admin: Bật/Tắt voucher
const toggleVoucherStatus = catchAsync(async (req, res) => {
  const voucher = await Voucher.findById(req.params.id);
  if (!voucher) {
    throw new ApiError(404, 'Không tìm thấy voucher');
  }

  if (
    voucher.partnerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Bạn không có quyền chỉnh sửa voucher này');
  }

  voucher.isActive = !voucher.isActive;
  await voucher.save();

  res.status(200).json({
    success: true,
    message: `Đã ${voucher.isActive ? 'kích hoạt' : 'tạm ngưng'} voucher thành công`,
    data: voucher,
  });
});

// Admin: Quản lý toàn bộ voucher trong hệ sinh thái
const getAllVouchersAdmin = catchAsync(async (req, res) => {
  const vouchers = await Voucher.find()
    .populate('venueId', 'name address')
    .populate('partnerId', 'fullName email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: vouchers.length,
    data: vouchers,
  });
});

module.exports = {
  getPublicVouchers,
  getMyPartnerVouchers,
  createVoucher,
  redeemVoucher,
  toggleVoucherStatus,
  getAllVouchersAdmin,
};
