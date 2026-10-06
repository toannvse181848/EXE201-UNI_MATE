const Voucher = require('../models/Voucher');
const UserVoucher = require('../models/UserVoucher');
const Venue = require('../models/Venue');
const Redemption = require('../models/Redemption');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const crypto = require('crypto');

// ─── PUBLIC / STUDENT ────────────────────────────────────────────────────────

/** Danh sách voucher công khai còn hạn (Sinh viên xem) */
const getPublicVouchers = catchAsync(async (req, res) => {
  const { venueId, code } = req.query;
  const filter = {
    isActive: true,
    validUntil: { $gte: new Date() },
    quantity: { $gt: 0 },
  };

  if (venueId) filter.venueId = venueId;
  if (code) filter.code = String(code).toUpperCase().trim();

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

/**
 * Tìm voucher cần đối soát từ body { code } hoặc { qrPayload } và kiểm tra hợp lệ.
 * - qrPayload (UVM-xxxx): voucher trong ví của một sinh viên cụ thể
 * - code: mã voucher chung của quán
 * Partner chỉ được đối soát voucher của chính mình, admin thì được tất cả.
 */
const findRedeemTarget = async (req) => {
  let { code, qrPayload } = req.body;
  code = typeof code === 'string' ? code.trim().toUpperCase() : '';
  qrPayload = typeof qrPayload === 'string' ? qrPayload.trim().toUpperCase() : '';

  // Thu ngân có thể dán QR payload vào ô nhập mã
  if (!qrPayload && code.startsWith('UVM-')) {
    qrPayload = code;
    code = '';
  }

  if (!code && !qrPayload) {
    throw new ApiError(400, 'Vui lòng cung cấp mã code hoặc QR payload');
  }

  let voucher;
  let userVoucher = null;

  if (qrPayload) {
    userVoucher = await UserVoucher.findOne({ qrPayload }).populate(
      'userId',
      'fullName avatar studentProfile'
    );
    if (!userVoucher) throw new ApiError(404, 'Mã QR không hợp lệ');
    if (userVoucher.status === 'used') throw new ApiError(400, 'Voucher này đã được sử dụng');
    if (userVoucher.status === 'expired') throw new ApiError(400, 'Voucher đã hết hạn');

    voucher = await Voucher.findById(userVoucher.voucherId).populate('venueId', 'name address');
    if (!voucher) throw new ApiError(404, 'Voucher không còn tồn tại');
  } else {
    voucher = await Voucher.findOne({ code }).populate('venueId', 'name address');
    if (!voucher) throw new ApiError(404, 'Mã voucher không tồn tại');
    if (voucher.usedCount >= voucher.quantity) throw new ApiError(400, 'Voucher đã hết số lượng');
  }

  if (req.user.role !== 'admin' && voucher.partnerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Voucher này không thuộc quán của bạn');
  }
  if (!voucher.isActive) throw new ApiError(400, 'Voucher đã bị tạm ngưng');
  if (new Date(voucher.validUntil) < new Date()) throw new ApiError(400, 'Voucher đã hết hạn sử dụng');

  return { voucher, userVoucher };
};

const toStudentInfo = (student) =>
  student
    ? {
        id: student._id,
        fullName: student.fullName,
        avatar: student.avatar,
        studentId: student.studentProfile?.studentId || null,
        university: student.studentProfile?.university || null,
      }
    : null;

/** Partner: Kiểm tra voucher trước khi áp dụng (không trừ lượt) */
const verifyVoucher = catchAsync(async (req, res) => {
  const { voucher, userVoucher } = await findRedeemTarget(req);

  res.status(200).json({
    success: true,
    data: {
      method: userVoucher ? 'qr' : 'code',
      code: voucher.code,
      qrPayload: userVoucher?.qrPayload || null,
      title: voucher.title,
      description: voucher.description,
      discountPercent: voucher.discountPercent,
      discountAmount: voucher.discountAmount,
      minBill: voucher.minBill,
      validUntil: voucher.validUntil,
      venueName: voucher.venueId?.name || null,
      remainingCount: voucher.quantity - voucher.usedCount,
      student: toStudentInfo(userVoucher?.userId),
    },
  });
});

/** Partner: Quét QR để đối soát & tiêu voucher của sinh viên */
const redeemVoucher = catchAsync(async (req, res) => {
  const { voucher, userVoucher } = await findRedeemTarget(req);

  if (userVoucher) {
    // Cập nhật có điều kiện để 2 lần quét cùng lúc không tiêu voucher 2 lần
    const marked = await UserVoucher.findOneAndUpdate(
      { _id: userVoucher._id, status: 'saved' },
      { status: 'used', usedAt: new Date() }
    );
    if (!marked) throw new ApiError(400, 'Voucher này đã được sử dụng');
    await Voucher.updateOne({ _id: voucher._id }, { $inc: { usedCount: 1 } });
  } else {
    const updated = await Voucher.updateOne(
      { _id: voucher._id, $expr: { $lt: ['$usedCount', '$quantity'] } },
      { $inc: { usedCount: 1 } }
    );
    if (updated.modifiedCount === 0) throw new ApiError(400, 'Voucher đã hết số lượng');
  }

  const redemption = await Redemption.create({
    voucherId: voucher._id,
    venueId: voucher.venueId?._id,
    partnerId: voucher.partnerId,
    redeemedBy: req.user._id,
    userId: userVoucher?.userId?._id || null,
    userVoucherId: userVoucher?._id || null,
    method: userVoucher ? 'qr' : 'code',
  });

  res.status(200).json({
    success: true,
    message: 'Đối soát & áp dụng voucher thành công! 🎉',
    data: {
      id: redemption._id,
      code: voucher.code,
      title: voucher.title,
      discountPercent: voucher.discountPercent,
      discountAmount: voucher.discountAmount,
      venueName: voucher.venueId?.name,
      student: userVoucher?.userId?.fullName || null,
      remainingCount: voucher.quantity - voucher.usedCount - 1,
      redeemedAt: redemption.createdAt,
    },
  });
});

/** Partner: Lịch sử check-in / đối soát voucher tại quán */
const getPartnerRedemptions = catchAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const filter = { partnerId: req.user._id };

  const [total, redemptions] = await Promise.all([
    Redemption.countDocuments(filter),
    Redemption.find(filter)
      .populate('voucherId', 'code title discountPercent discountAmount')
      .populate('userId', 'fullName avatar studentProfile.studentId studentProfile.university')
      .populate('redeemedBy', 'fullName')
      .sort({ createdAt: -1 })
      .limit(limit),
  ]);

  res.status(200).json({
    success: true,
    total,
    count: redemptions.length,
    data: redemptions,
  });
});

// ─── PARTNER ─────────────────────────────────────────────────────────────────

/** Gắn thêm claimedCount (số lượt sinh viên đã lưu vào ví) cho từng voucher */
const withClaimedCount = async (vouchers) => {
  const counts = await UserVoucher.aggregate([
    { $match: { voucherId: { $in: vouchers.map((v) => v._id) } } },
    { $group: { _id: '$voucherId', count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((c) => [c._id.toString(), c.count]));
  return vouchers.map((v) => ({ ...v.toObject(), claimedCount: countById.get(v._id.toString()) || 0 }));
};

/** Partner: Lấy danh sách voucher do mình phát hành */
const getMyPartnerVouchers = catchAsync(async (req, res) => {
  const vouchers = await Voucher.find({ partnerId: req.user._id })
    .populate('venueId', 'name address image')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: vouchers.length,
    data: await withClaimedCount(vouchers),
  });
});

/** Partner: Tạo voucher khuyến mãi mới */
const createVoucher = catchAsync(async (req, res) => {
  let { venueId, code } = req.body;

  if (!code) {
    throw new ApiError(400, 'Vui lòng nhập mã voucher');
  }

  let venue = null;
  if (venueId) {
    venue = await Venue.findById(venueId);
  }

  // Nếu không truyền venueId hoặc không tìm thấy theo id, tự động lấy venue của chính partner
  if (!venue) {
    venue = await Venue.findOne({ partnerId: req.user._id });
  }

  // Nếu partner vẫn chưa tạo venue nào, khởi tạo nhanh 1 cơ sở mặc định để có thể phát hành voucher ngay
  if (!venue) {
    venue = await Venue.create({
      name: req.user.partnerProfile?.businessName || req.user.fullName || 'Địa điểm đối tác UNI-MATE',
      partnerId: req.user._id,
      address: req.user.partnerProfile?.address || 'Khu đô thị ĐHQG TP.HCM, Dĩ An, Bình Dương',
      description: 'Quán đối tác liên kết của UNI-MATE dành cho sinh viên.',
      phone: req.user.phone || '0901234567',
      status: 'approved',
    });
  }

  if (
    venue.partnerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Bạn không sở hữu địa điểm này');
  }

  const existing = await Voucher.findOne({ code: code.toUpperCase().trim() });
  if (existing) throw new ApiError(400, 'Mã voucher này đã tồn tại');

  // Xử lý hạn sử dụng (validUntil / expiry)
  let rawDate = req.body.validUntil || req.body.expiry;
  let parsedDate = null;
  if (rawDate) {
    if (typeof rawDate === 'string' && rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    } else {
      parsedDate = new Date(rawDate);
    }
  }

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    // Mặc định hạn dùng 6 tháng sau nếu không truyền hoặc không hợp lệ
    parsedDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  }

  const voucher = await Voucher.create({
    ...req.body,
    venueId: venue._id,
    validUntil: parsedDate,
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
    data: await withClaimedCount(vouchers),
  });
});

module.exports = {
  getPublicVouchers,
  claimVoucher,
  getMyWallet,
  verifyVoucher,
  redeemVoucher,
  getPartnerRedemptions,
  getMyPartnerVouchers,
  createVoucher,
  toggleVoucherStatus,
  getAllVouchersAdmin,
};
