const Voucher = require('../models/Voucher');
const UserVoucher = require('../models/UserVoucher');
const Venue = require('../models/Venue');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const crypto = require('crypto');

// ─── PUBLIC / STUDENT ────────────────────────────────────────────────────────

/** Danh sách voucher công khai còn hạn (Sinh viên xem) */
const getPublicVouchers = catchAsync(async (req, res) => {
  const { venueId } = req.query;
  const filter = {
    isActive: true,
    validUntil: { $gte: new Date() },
    quantity: { $gt: 0 },
  };

  if (venueId) filter.venueId = venueId;

  const vouchers = await Voucher.find(filter)
    .populate('venueId', 'name address image rating category')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: vouchers.length,
    data: vouchers,
  });
});

/** Sinh viên: Lưu voucher vào ví (claim) */
const claimVoucher = catchAsync(async (req, res) => {
  const { id: voucherId } = req.params;
  const userId = req.user._id;

  const voucher = await Voucher.findById(voucherId);
  if (!voucher) throw new ApiError(404, 'Không tìm thấy voucher');
  if (!voucher.isActive) throw new ApiError(400, 'Voucher đã bị tạm ngưng');
  if (new Date(voucher.validUntil) < new Date()) throw new ApiError(400, 'Voucher đã hết hạn');
  if (voucher.usedCount >= voucher.quantity) throw new ApiError(400, 'Voucher đã hết số lượng');

  // Kiểm tra đã claim chưa
  const existing = await UserVoucher.findOne({ userId, voucherId });
  if (existing) throw new ApiError(400, 'Bạn đã lưu voucher này vào ví rồi');

  // Tạo QR payload ngẫu nhiên để đối soát
  const qrPayload = `UVM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

  const userVoucher = await UserVoucher.create({
    userId,
    voucherId,
    qrPayload,
  });

  const populated = await userVoucher.populate('voucherId', 'title code discountPercent discountAmount validUntil minBill');

  res.status(201).json({
    success: true,
    message: 'Đã lưu voucher vào ví thành công!',
    data: populated,
  });
});

/** Sinh viên: Xem ví voucher của mình */
const getMyWallet = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const wallet = await UserVoucher.find({ userId })
    .populate({
      path: 'voucherId',
      select: 'title code discountPercent discountAmount validUntil minBill terms isActive',
      populate: { path: 'venueId', select: 'name address image' },
    })
    .sort({ claimedAt: -1 });

  // Auto-expire phía JS: nếu voucher hết hạn, đánh dấu expired
  const now = new Date();
  const expiredIds = [];
  const enriched = wallet.map((uv) => {
    const obj = uv.toObject();
    if (
      obj.status === 'saved' &&
      obj.voucherId?.validUntil &&
      new Date(obj.voucherId.validUntil) < now
    ) {
      expiredIds.push(uv._id);
      obj.status = 'expired';
    }
    return obj;
  });

  // Cập nhật DB async (không block response)
  if (expiredIds.length > 0) {
    UserVoucher.updateMany({ _id: { $in: expiredIds } }, { status: 'expired' }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    count: enriched.length,
    data: enriched,
  });
});

/** Partner: Quét QR để đối soát & tiêu voucher của sinh viên */
const redeemVoucher = catchAsync(async (req, res) => {
  const { code, qrPayload } = req.body;

  if (!code && !qrPayload) {
    throw new ApiError(400, 'Vui lòng cung cấp mã code hoặc QR payload');
  }

  let voucher;
  let userVoucher;

  if (qrPayload) {
    // Quét QR từ ví sinh viên
    userVoucher = await UserVoucher.findOne({ qrPayload })
      .populate('voucherId')
      .populate('userId', 'fullName studentProfile');

    if (!userVoucher) throw new ApiError(404, 'Mã QR không hợp lệ');
    if (userVoucher.status === 'used') throw new ApiError(400, 'Voucher này đã được sử dụng');
    if (userVoucher.status === 'expired') throw new ApiError(400, 'Voucher đã hết hạn');

    voucher = userVoucher.voucherId;
    if (!voucher.isActive) throw new ApiError(400, 'Voucher đã bị tạm ngưng');
    if (new Date(voucher.validUntil) < new Date()) throw new ApiError(400, 'Voucher đã hết hạn sử dụng');

    // Đánh dấu đã dùng
    userVoucher.status = 'used';
    userVoucher.usedAt = new Date();
    await userVoucher.save();

    voucher.usedCount += 1;
    await voucher.save();
  } else {
    // Quét bằng code trực tiếp (legacy)
    voucher = await Voucher.findOne({ code: code.toUpperCase().trim() })
      .populate('venueId', 'name address partnerId');

    if (!voucher) throw new ApiError(404, 'Mã voucher không tồn tại');
    if (!voucher.isActive) throw new ApiError(400, 'Voucher đã bị tạm ngưng');
    if (new Date(voucher.validUntil) < new Date()) throw new ApiError(400, 'Voucher đã hết hạn sử dụng');
    if (voucher.usedCount >= voucher.quantity) throw new ApiError(400, 'Voucher đã hết số lượng');

    voucher.usedCount += 1;
    await voucher.save();
  }

  res.status(200).json({
    success: true,
    message: 'Đối soát & áp dụng voucher thành công! 🎉',
    data: {
      code: voucher.code,
      title: voucher.title,
      discountPercent: voucher.discountPercent,
      discountAmount: voucher.discountAmount,
      venueName: voucher.venueId?.name,
      student: userVoucher?.userId?.fullName || null,
      remainingCount: voucher.quantity - voucher.usedCount,
      redeemedAt: new Date(),
    },
  });
});

// ─── PARTNER ─────────────────────────────────────────────────────────────────

/** Partner: Lấy danh sách voucher do mình phát hành */
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

/** Partner: Tạo voucher khuyến mãi mới */
const createVoucher = catchAsync(async (req, res) => {
  const { venueId, code } = req.body;

  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError(404, 'Không tìm thấy địa điểm');
  if (
    venue.partnerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Bạn không sở hữu địa điểm này');
  }

  const existing = await Voucher.findOne({ code: code.toUpperCase().trim() });
  if (existing) throw new ApiError(400, 'Mã voucher này đã tồn tại');

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

/** Partner/Admin: Bật/Tắt voucher */
const toggleVoucherStatus = catchAsync(async (req, res) => {
  const voucher = await Voucher.findById(req.params.id);
  if (!voucher) throw new ApiError(404, 'Không tìm thấy voucher');

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

// ─── ADMIN ───────────────────────────────────────────────────────────────────

/** Admin: Quản lý toàn bộ voucher */
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
  claimVoucher,
  getMyWallet,
  redeemVoucher,
  getMyPartnerVouchers,
  createVoucher,
  toggleVoucherStatus,
  getAllVouchersAdmin,
};
