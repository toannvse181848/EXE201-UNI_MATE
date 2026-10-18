const Voucher = require('../models/Voucher');
const UserVoucher = require('../models/UserVoucher');
const Venue = require('../models/Venue');
const Redemption = require('../models/Redemption');
const VoucherCode = require('../models/VoucherCode');
const User = require('../models/User');
const { earnCoins } = require('../utils/coinService');
const XLSX = require('xlsx');

// UniCoin thưởng cho sinh viên khi quán xác nhận dùng voucher tại quầy
const VOUCHER_REDEEM_COIN = 20;
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const crypto = require('crypto');
const {
  parseSpreadsheetBuffer,
  fetchGoogleSheetData,
  generateVoucherTemplate,
  parseDateValue,
} = require('../utils/voucherSpreadsheetParser');
const { extractDistrict } = require('../utils/addressUtils');
const { isPremiumActive } = require('../utils/subscription');


// ─── PUBLIC / STUDENT ────────────────────────────────────────────────────────

/** Danh sách voucher công khai còn hạn (Sinh viên xem) */
const getPublicVouchers = catchAsync(async (req, res) => {
  const { venueId, code } = req.query;
  const filter = {
    isActive: true,
    validUntil: { $gte: new Date() },
    $or: [{ isUnlimited: true }, { quantity: { $gt: 0 } }],
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
  if (voucher.codeType === 'shared' && !voucher.isUnlimited && voucher.usedCount >= voucher.quantity) {
    throw new ApiError(400, 'Voucher đã hết số lượng');
  }
  if (voucher.premiumOnly && !isPremiumActive(req.user.studentProfile)) {
    throw new ApiError(403, 'Voucher này chỉ dành cho thành viên Premium. Nâng cấp Premium để nhận nhé!');
  }

  // Kiểm tra đã claim chưa
  const existing = await UserVoucher.findOne({ userId, voucherId });
  if (existing) throw new ApiError(400, 'Bạn đã lưu voucher này vào ví rồi');

  const coinCost = voucher.coinCost || 0;
  if (coinCost > 0 && (req.user.studentProfile?.uniCoin ?? 0) < coinCost) {
    throw new ApiError(400, `Bạn cần ${coinCost} UniCoin để đổi voucher này`);
  }

  // Voucher mã riêng: giữ trước 1 mã còn trống cho sinh viên
  let reservedCode = null;
  if (voucher.codeType === 'unique') {
    reservedCode = await VoucherCode.findOneAndUpdate(
      { voucherId: voucher._id, userId: null },
      { userId, assignedAt: new Date() },
      { returnDocument: 'after', sort: { _id: 1 } }
    );
    if (!reservedCode) throw new ApiError(400, 'Voucher đã được phát hết mã');
  }

  const releaseReservedCode = async () => {
    if (reservedCode) {
      await VoucherCode.updateOne(
        { _id: reservedCode._id },
        { userId: null, userVoucherId: null, assignedAt: null }
      );
    }
  };

  // Tạo QR payload ngẫu nhiên để đối soát
  const qrPayload = `UVM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

  let userVoucher;
  try {
    userVoucher = await UserVoucher.create({
      userId,
      voucherId,
      qrPayload,
      assignedCode: reservedCode?.code || null,
    });
  } catch (err) {
    await releaseReservedCode();
    if (err.code === 11000) throw new ApiError(400, 'Bạn đã lưu voucher này vào ví rồi');
    throw err;
  }

  if (reservedCode) {
    await VoucherCode.updateOne({ _id: reservedCode._id }, { userVoucherId: userVoucher._id });
  }

  // Trừ UniCoin có điều kiện để không bị âm khi bấm đổi nhiều lần cùng lúc
  if (coinCost > 0) {
    const paid = await User.updateOne(
      { _id: userId, 'studentProfile.uniCoin': { $gte: coinCost } },
      {
        $inc: { 'studentProfile.uniCoin': -coinCost },
        $push: {
          'studentProfile.coinLog': {
            $each: [{
              type: 'voucher_exchange',
              amount: -coinCost,
              description: `Đổi voucher "${voucher.title}"`,
              createdAt: new Date(),
            }],
            $slice: -100,
          },
        },
      }
    );
    if (paid.modifiedCount === 0) {
      await UserVoucher.deleteOne({ _id: userVoucher._id });
      await releaseReservedCode();
      throw new ApiError(400, `Bạn cần ${coinCost} UniCoin để đổi voucher này`);
    }
  }

  const populated = await userVoucher.populate('voucherId', 'title code codeType discountPercent discountAmount validUntil minBill coinCost');

  res.status(201).json({
    success: true,
    message: coinCost > 0
      ? `Đã đổi ${coinCost} UniCoin lấy voucher thành công!`
      : 'Đã lưu voucher vào ví thành công!',
    data: populated,
  });
});

/** Sinh viên: Xem ví voucher của mình */
const getMyWallet = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const wallet = await UserVoucher.find({ userId })
    .populate({
      path: 'voucherId',
      select: 'title code codeType discountPercent discountAmount validUntil minBill terms isActive',
      populate: { path: 'venueId', select: 'name address image' },
    })
    .sort({ claimedAt: -1 });

  // Auto-expire phía JS: nếu voucher hết hạn, đánh dấu expired
  const now = new Date();
  const expiredIds = [];
  const enriched = wallet.map((uv) => {
    const obj = uv.toObject();
    // Mã sinh viên đọc cho thu ngân: mã riêng nếu có, không thì mã chung của quán
    obj.displayCode = obj.assignedCode || obj.voucherId?.code || null;
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

  // Thu ngân gõ mã riêng của voucher loại "unique" → tìm ra voucher trong ví sinh viên được gán mã đó
  if (!qrPayload && code) {
    const isSharedCode = await Voucher.exists({ code });
    if (!isSharedCode) {
      const voucherCode = await VoucherCode.findOne({ code });
      if (voucherCode) {
        if (!voucherCode.userVoucherId) throw new ApiError(400, 'Mã này chưa được phát cho sinh viên nào');
        const owned = await UserVoucher.findById(voucherCode.userVoucherId).select('qrPayload');
        if (!owned) throw new ApiError(404, 'Không tìm thấy voucher trong ví sinh viên');
        qrPayload = owned.qrPayload;
        code = '';
      }
    }
  }

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
    if (voucher.codeType === 'unique') {
      throw new ApiError(400, 'Đây là mã chiến dịch. Vui lòng nhập mã riêng hoặc mã UVM-... trong ví của sinh viên');
    }
    if (!voucher.isUnlimited && voucher.usedCount >= voucher.quantity) {
      throw new ApiError(400, 'Voucher đã hết số lượng');
    }
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
      assignedCode: userVoucher?.assignedCode || null,
      // null = không giới hạn lượt
      remainingCount: voucher.isUnlimited ? null : voucher.quantity - voucher.usedCount,
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
  } else if (voucher.isUnlimited) {
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

  // Quán đã xác nhận sinh viên dùng voucher tại quầy → thưởng UniCoin (vẫn tính trong giới hạn ngày)
  let coinAwarded = 0;
  if (userVoucher?.userId?._id) {
    const student = await User.findById(userVoucher.userId._id);
    if (student) {
      coinAwarded = earnCoins(student, VOUCHER_REDEEM_COIN, {
        type: 'voucher_redeem',
        description: `Dùng voucher tại ${voucher.venueId?.name || 'quán đối tác'} ☕`,
      });
      if (coinAwarded > 0) await student.save({ validateBeforeSave: false });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Đối soát & áp dụng voucher thành công! 🎉',
    data: {
      coinAwarded,
      id: redemption._id,
      code: voucher.code,
      title: voucher.title,
      discountPercent: voucher.discountPercent,
      discountAmount: voucher.discountAmount,
      venueName: voucher.venueId?.name,
      student: userVoucher?.userId?.fullName || null,
      remainingCount: voucher.isUnlimited ? null : voucher.quantity - voucher.usedCount - 1,
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
    const defaultAddr = req.user.partnerProfile?.address || 'Khu đô thị ĐHQG TP.HCM, Dĩ An, Bình Dương';
    venue = await Venue.create({
      name: req.user.partnerProfile?.businessName || req.user.fullName || 'Địa điểm đối tác UNI-MATE',
      partnerId: req.user._id,
      address: defaultAddr,
      district: extractDistrict(defaultAddr),
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

  const isUnique = req.body.codeType === 'unique';
  const voucher = await Voucher.create({
    ...req.body,
    venueId: venue._id,
    validUntil: parsedDate,
    code: code.toUpperCase().trim(),
    partnerId: req.user._id,
    usedCount: 0,
    codeType: isUnique ? 'unique' : 'shared',
    isUnlimited: !isUnique && Boolean(req.body.isUnlimited),
    premiumOnly: Boolean(req.body.premiumOnly),
    // Mã riêng: số lượng tự tính khi nạp danh sách mã (POST /api/vouchers/:id/codes)
    ...(isUnique ? { quantity: 0 } : {}),
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

// ─── NHẬP LIỆU TỪ EXCEL / GOOGLE SHEET ─────────────────────────────────────────

/** Tải file Excel mẫu (.xlsx) chuẩn */
const downloadVoucherTemplate = catchAsync(async (req, res) => {
  const buffer = generateVoucherTemplate();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="mau_nhap_voucher_unimate.xlsx"'
  );
  res.send(buffer);
});

/** Xem trước (Preview) dữ liệu từ file Excel hoặc link Google Sheet trước khi lưu */
const previewImportVouchers = catchAsync(async (req, res) => {
  let buffer = null;

  if (req.file && req.file.buffer) {
    buffer = req.file.buffer;
  } else if (req.body.sheetUrl) {
    buffer = await fetchGoogleSheetData(req.body.sheetUrl);
  } else {
    throw new ApiError(400, 'Vui lòng tải lên file Excel (.xlsx) hoặc cung cấp link Google Sheet');
  }

  const parsed = parseSpreadsheetBuffer(buffer);

  // Lấy các mã để kiểm tra xem đã tồn tại trong DB chưa
  const codes = parsed.items.filter((i) => i.code).map((i) => i.code);
  const existingVouchers = await Voucher.find({ code: { $in: codes } }).select('code title partnerId');
  const existingMap = new Map(existingVouchers.map((v) => [v.code, v]));

  // Đếm tần suất xuất hiện trong file
  const codeFrequency = {};
  parsed.items.forEach((item) => {
    if (item.code) {
      codeFrequency[item.code] = (codeFrequency[item.code] || 0) + 1;
    }
  });

  const enrichedItems = parsed.items.map((item) => {
    const isDuplicateInFile = item.code && codeFrequency[item.code] > 1;
    const existing = item.code ? existingMap.get(item.code) : null;
    const isExistingInDb = Boolean(existing);
    const isMine = existing && existing.partnerId.toString() === req.user._id.toString();

    return {
      ...item,
      isDuplicateInFile,
      isExistingInDb,
      isMine,
      existingTitle: existing?.title || null,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      totalRows: parsed.totalRows,
      validRows: parsed.validRows,
      invalidRows: parsed.invalidRows,
      items: enrichedItems,
      errors: parsed.errors,
    },
  });
});

/** Nhập dữ liệu voucher từ Excel hoặc Google Sheet vào database */
const importVouchersSpreadsheet = catchAsync(async (req, res) => {
  let { venueId, duplicateMode = 'skip', sheetUrl, items } = req.body;
  // duplicateMode: 'skip' | 'update'

  let rawItems = [];

  if (Array.isArray(items) && items.length > 0) {
    // Dữ liệu đã preview xong từ client
    rawItems = items;
  } else {
    let buffer = null;
    if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
    } else if (sheetUrl) {
      buffer = await fetchGoogleSheetData(sheetUrl);
    } else {
      throw new ApiError(400, 'Vui lòng cung cấp file Excel hoặc đường link Google Sheet');
    }
    const parsed = parseSpreadsheetBuffer(buffer);
    rawItems = parsed.items;
  }

  const validItems = rawItems.filter((item) => item.code && item.title);
  if (validItems.length === 0) {
    throw new ApiError(400, 'Không tìm thấy dòng voucher hợp lệ nào để nhập');
  }

  // Xác định cơ sở của quán
  let venue = null;
  if (venueId) {
    venue = await Venue.findById(venueId);
  }
  if (!venue) {
    venue = await Venue.findOne({ partnerId: req.user._id });
  }
  if (!venue) {
    const defaultAddr = req.user.partnerProfile?.address || 'Khu đô thị ĐHQG TP.HCM, Dĩ An, Bình Dương';
    venue = await Venue.create({
      name: req.user.partnerProfile?.businessName || req.user.fullName || 'Địa điểm đối tác UNI-MATE',
      partnerId: req.user._id,
      address: defaultAddr,
      district: extractDistrict(defaultAddr),
      description: 'Quán đối tác liên kết của UNI-MATE dành cho sinh viên.',
      phone: req.user.phone || '0901234567',
      status: 'approved',
    });
  }


  if (venue.partnerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Bạn không sở hữu cơ sở / địa điểm này');
  }

  const codes = validItems.map((i) => i.code.toUpperCase().trim());
  const existingVouchers = await Voucher.find({ code: { $in: codes } });
  const existingMap = new Map(existingVouchers.map((v) => [v.code, v]));

  const importedList = [];
  const updatedList = [];
  const skippedList = [];
  const processedCodes = new Set();

  for (const item of validItems) {
    const code = item.code.toUpperCase().trim();
    if (processedCodes.has(code)) {
      skippedList.push({ code, reason: 'Mã voucher trùng lặp trong file' });
      continue;
    }
    processedCodes.add(code);

    const existing = existingMap.get(code);

    let parsedDate = parseDateValue(item.validUntil);
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      parsedDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    }

    const isUnique = item.codeType === 'unique';
    const voucherData = {
      code,
      title: item.title,
      description: item.description || '',
      discountPercent: Number(item.discountPercent) || 0,
      discountAmount: Number(item.discountAmount) || 0,
      minBill: Number(item.minBill) || 0,
      codeType: isUnique ? 'unique' : 'shared',
      isUnlimited: !isUnique && Boolean(item.isUnlimited),
      // Mã riêng: số lượng = số mã nạp sau qua POST /api/vouchers/:id/codes
      quantity: isUnique ? 0 : (Number(item.quantity) || 100),
      coinCost: Math.max(0, Number(item.coinCost) || 0),
      validUntil: parsedDate,
      terms: Array.isArray(item.terms) ? item.terms : [],
      venueId: venue._id,
      // Admin nhập hộ thì voucher vẫn thuộc về quán, không thuộc về admin
      partnerId: venue.partnerId,
      isActive: item.isActive !== false,
    };

    if (existing) {
      if (duplicateMode === 'skip') {
        skippedList.push({ code, reason: 'Mã voucher đã tồn tại trong hệ thống' });
      } else if (duplicateMode === 'update') {
        if (existing.partnerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
          skippedList.push({ code, reason: 'Mã voucher thuộc về đối tác khác' });
          continue;
        }
        // Không ghi đè số lượng / loại mã của voucher mã riêng đã nạp danh sách mã
        if (existing.codeType === 'unique') {
          delete voucherData.quantity;
          delete voucherData.codeType;
          delete voucherData.isUnlimited;
        }
        Object.assign(existing, voucherData);
        await existing.save();
        updatedList.push(existing);
      }
    } else {
      const created = await Voucher.create(voucherData);
      importedList.push(created);
    }
  }

  res.status(200).json({
    success: true,
    message: `Đã nhập xong: thêm mới ${importedList.length} voucher, cập nhật ${updatedList.length} voucher, bỏ qua ${skippedList.length} voucher.`,
    data: {
      total: validItems.length,
      importedCount: importedList.length,
      updatedCount: updatedList.length,
      skippedCount: skippedList.length,
      skipped: skippedList,
      imported: importedList,
    },
  });
});

// ─── MÃ RIÊNG (voucher loại "unique") ────────────────────────────────────────

const findManagedVoucher = async (req) => {
  const voucher = await Voucher.findById(req.params.id);
  if (!voucher) throw new ApiError(404, 'Không tìm thấy voucher');
  if (req.user.role !== 'admin' && voucher.partnerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Bạn không có quyền chỉnh sửa voucher này');
  }
  return voucher;
};

/** Lấy danh sách mã từ body.codes (mảng hoặc chuỗi nhiều dòng) hoặc cột đầu tiên của file Excel/CSV */
const readCodeList = (req) => {
  let raw = [];
  if (req.file?.buffer) {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    raw = rows.map((r) => r[0]);
    // Bỏ dòng tiêu đề nếu có
    if (raw.length && /ma|code/i.test(String(raw[0]).normalize('NFD').replace(/[̀-ͯ]/g, ''))) {
      raw = raw.slice(1);
    }
  } else if (Array.isArray(req.body.codes)) {
    raw = req.body.codes;
  } else if (typeof req.body.codes === 'string') {
    raw = req.body.codes.split(/[\n,;]+/);
  }
  return raw.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
};

/** POST /api/vouchers/:id/codes — nạp danh sách mã riêng (mỗi mã dùng 1 lần) */
const addVoucherCodes = catchAsync(async (req, res) => {
  const voucher = await findManagedVoucher(req);
  const codes = readCodeList(req);
  if (codes.length === 0) {
    throw new ApiError(400, 'Không có mã nào. Gửi codes (mảng hoặc mỗi mã 1 dòng) hoặc file Excel có mã ở cột đầu tiên');
  }
  if (codes.length > 5000) throw new ApiError(400, 'Mỗi lần nạp tối đa 5000 mã');

  const uniqueInFile = [...new Set(codes)];
  const duplicateInFile = codes.length - uniqueInFile.length;

  // Mã riêng không được trùng mã riêng khác hoặc mã chung của voucher nào
  const [takenCodes, takenShared] = await Promise.all([
    VoucherCode.find({ code: { $in: uniqueInFile } }).select('code'),
    Voucher.find({ code: { $in: uniqueInFile } }).select('code'),
  ]);
  const taken = new Set([...takenCodes, ...takenShared].map((d) => d.code));
  const toInsert = uniqueInFile.filter((c) => !taken.has(c));

  if (toInsert.length > 0) {
    await VoucherCode.insertMany(toInsert.map((code) => ({ voucherId: voucher._id, code })), { ordered: false });
  }

  voucher.codeType = 'unique';
  voucher.isUnlimited = false;
  voucher.quantity = await VoucherCode.countDocuments({ voucherId: voucher._id });
  await voucher.save();

  res.status(200).json({
    success: true,
    message: `Đã thêm ${toInsert.length} mã. Voucher hiện có ${voucher.quantity} mã riêng.`,
    data: {
      added: toInsert.length,
      skippedExisting: [...taken],
      duplicateInFile,
      totalCodes: voucher.quantity,
    },
  });
});

/** GET /api/vouchers/:id/codes — xem danh sách mã riêng và mã nào đã phát cho ai */
const getVoucherCodes = catchAsync(async (req, res) => {
  const voucher = await findManagedVoucher(req);
  const codes = await VoucherCode.find({ voucherId: voucher._id })
    .populate('userId', 'fullName studentProfile.studentId')
    .populate('userVoucherId', 'status usedAt')
    .sort({ _id: 1 });

  const data = codes.map((c) => ({
    code: c.code,
    status: !c.userId ? 'available' : (c.userVoucherId?.status === 'used' ? 'used' : 'assigned'),
    student: c.userId ? { fullName: c.userId.fullName, studentId: c.userId.studentProfile?.studentId || null } : null,
    assignedAt: c.assignedAt,
    usedAt: c.userVoucherId?.usedAt || null,
  }));

  res.status(200).json({
    success: true,
    total: data.length,
    available: data.filter((d) => d.status === 'available').length,
    data,
  });
});

module.exports = {
  addVoucherCodes,
  getVoucherCodes,
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
  downloadVoucherTemplate,
  previewImportVouchers,
  importVouchersSpreadsheet,
};

