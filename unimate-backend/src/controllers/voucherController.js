const Voucher = require('../models/Voucher');
const UserVoucher = require('../models/UserVoucher');
const Venue = require('../models/Venue');
const Redemption = require('../models/Redemption');
const VoucherCode = require('../models/VoucherCode');
const User = require('../models/User');
const Meetup = require('../models/Meetup');
const { earnCoins, MAX_DAILY_EARN } = require('../utils/coinService');
const { MEETUP_COMPLETE_COIN, GROUP_MEETUP_MAX_PEOPLE } = require('../config/meetup');
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
const { isPremiumActive } = require('../utils/subscription');
const { onMeetupVoucherRedeemed } = require('./meetupController');
const {
  DISCOUNT_TYPES,
  getDiscountType,
  describeSchedule,
  isWithinSchedule,
  describeVoucherValue,
  withVoucherLabels,
} = require('../utils/voucherFormat');
const { VOUCHER_STATUS_LABEL, annotateVouchers } = require('../utils/voucherStatus');
const { visibleVenueFilter } = require('../utils/visibility');
const { issuedOf, hasSharedStock, reserveSharedSlot, releaseSharedSlot } = require('../utils/voucherStock');


// ─── PUBLIC / STUDENT ────────────────────────────────────────────────────────

/** Danh sách voucher sinh viên thấy: chỉ voucher có trạng thái "Đang chạy" (luật chung utils/voucherStatus.js) */
const getPublicVouchers = catchAsync(async (req, res) => {
  const { venueId, code } = req.query;
  // Quán đã duyệt + tài khoản quán không bị khoá; ưu đãi hẹn cafe không bày ở đây (chỉ nhận khi chốt hẹn)
  const visibleVenueIds = await Venue.find(await visibleVenueFilter()).distinct('_id');
  const filter = {
    isActive: true,
    validUntil: { $gte: new Date() },
    meetupReward: { $ne: true },
    venueId: venueId
      ? { $in: visibleVenueIds.filter((id) => String(id) === String(venueId)) }
      : { $in: visibleVenueIds },
  };
  if (code) filter.code = String(code).toUpperCase().trim();

  const candidates = await Voucher.find(filter)
    .populate('venueId', 'name address image category status')
    .sort({ createdAt: -1 });
  // Bỏ voucher đã hết lượt / hết mã
  const vouchers = (await annotateVouchers(candidates)).filter((v) => v.status === 'active');

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

  const voucher = await Voucher.findById(voucherId).catch(() => null);
  if (!voucher) throw new ApiError(404, 'Không tìm thấy voucher');
  if (voucher.meetupReward) {
    throw new ApiError(400, 'Ưu đãi này chỉ nhận được khi bạn rủ bạn bè đi cafe và cả hai chốt hẹn tại quán');
  }
  // Cùng một luật trạng thái với trang quán và trang admin
  await voucher.populate('venueId', 'status');
  const [annotated] = await annotateVouchers([voucher]);
  if (annotated.status !== 'active') {
    throw new ApiError(400, `Voucher không còn nhận được: ${VOUCHER_STATUS_LABEL[annotated.status].toLowerCase()}`);
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

  // Voucher mã riêng: giữ trước 1 mã còn trống cho sinh viên. Mã chung: giữ trước 1 lượt phát.
  let reservedCode = null;
  let reservedSlot = false;
  if (voucher.codeType === 'unique') {
    reservedCode = await VoucherCode.findOneAndUpdate(
      { voucherId: voucher._id, userId: null },
      { userId, assignedAt: new Date() },
      { returnDocument: 'after', sort: { _id: 1 } }
    );
    if (!reservedCode) throw new ApiError(400, 'Voucher đã được phát hết mã');
  } else {
    reservedSlot = await reserveSharedSlot(voucher);
    if (!reservedSlot) throw new ApiError(400, 'Voucher đã hết lượt');
  }

  const releaseReservedCode = async () => {
    if (reservedCode) {
      await VoucherCode.updateOne(
        { _id: reservedCode._id },
        { userId: null, userVoucherId: null, assignedAt: null }
      );
    }
    if (reservedSlot) await releaseSharedSlot(voucher);
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
      select: 'title description code codeType discountType discountPercent discountAmount maxDiscount giftItem validUntil applyDays applyFrom applyTo minBill terms isActive meetupReward walletOnly',
      populate: { path: 'venueId', select: 'name address image' },
    })
    .sort({ claimedAt: -1 });

  // Auto-expire phía JS: nếu voucher hết hạn, đánh dấu expired
  const now = new Date();
  const expiredIds = [];
  const enriched = wallet.map((uv) => {
    const obj = uv.toObject();
    // Mã sinh viên đọc cho thu ngân khi không quét được QR: mã riêng nếu có, không thì mã UVM-... của chính voucher này.
    // Không đưa mã chung của quán: thu ngân gõ mã chung thì voucher trong ví không bị trừ, không thưởng coin,
    // buổi hẹn cafe không được ghi nhận và quán bị trừ thêm 1 lượt.
    obj.displayCode = obj.assignedCode || obj.qrPayload || null;
    if (obj.voucherId) Object.assign(obj.voucherId, describeVoucherValue(obj.voucherId));
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

/**
 * Voucher nhận qua buổi "Rủ cafe" (2 người hoặc cả nhóm): buổi hẹn phải còn hiệu lực.
 * Buổi đã chốt mà chưa ai trong buổi dùng ưu đãi thì requiresCompanion = true: phải quét thêm mã của
 * ít nhất 1 bạn đi cùng mới áp dụng, đi một mình không dùng được ưu đãi của buổi hẹn.
 * companions: những bạn còn voucher chưa dùng, thu ngân có thể quét cùng lượt.
 */
const getMeetupContext = async (userVoucher) => {
  if (!userVoucher?.meetupId) return null;
  const meetup = await Meetup.findById(userVoucher.meetupId).select('status groupId');
  if (!meetup || !['accepted', 'completed'].includes(meetup.status)) {
    throw new ApiError(400, 'Buổi hẹn của ưu đãi này đã huỷ hoặc không diễn ra nên ưu đãi không còn hiệu lực');
  }
  const others = await UserVoucher.find({ meetupId: meetup._id, _id: { $ne: userVoucher._id } }).populate(
    'userId',
    'fullName avatar studentProfile'
  );
  // Các bạn khác đã rời buổi hẹn, không còn ai đi cùng: báo rõ thay vì để thu ngân chờ quét thêm mã không có
  if (meetup.status === 'accepted' && others.length === 0) {
    throw new ApiError(400, 'Buổi hẹn chưa có bạn nào khác nhận ưu đãi nên chưa dùng được', 'MEETUP_NEEDS_BOTH');
  }
  const unused = others.filter((other) => other.status === 'saved');
  return {
    id: meetup._id,
    status: meetup.status,
    isGroup: Boolean(meetup.groupId),
    requiresCompanion: meetup.status === 'accepted' && unused.length > 0 && unused.length === others.length,
    companions: unused.map((other) => toStudentInfo(other.userId)),
    companionVoucherIds: unused.map((other) => String(other._id)),
  };
};

/**
 * Tìm voucher cần đối soát từ { code } hoặc { qrPayload } và kiểm tra hợp lệ.
 * - qrPayload (UVM-xxxx): voucher trong ví của một sinh viên cụ thể
 * - code: mã voucher chung của quán
 * Partner chỉ được đối soát voucher của chính mình, admin thì được tất cả.
 * Kiểm tra quyền trước trạng thái: quét nhầm mã quán khác luôn báo không thuộc quán, không lộ tình trạng mã.
 */
const assertOwnVoucher = (req, voucher) => {
  if (req.user.role !== 'admin' && String(voucher?.partnerId) !== String(req.user._id)) {
    throw new ApiError(403, 'Voucher này không thuộc quán của bạn');
  }
};

const findRedeemTarget = async (req, payload) => {
  let { code, qrPayload } = payload || {};
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
        assertOwnVoucher(req, await Voucher.findById(voucherCode.voucherId).select('partnerId'));
        if (!voucherCode.userVoucherId) throw new ApiError(400, 'Mã này chưa được phát cho sinh viên nào');
        const owned = await UserVoucher.findById(voucherCode.userVoucherId).select('qrPayload assignedCode');
        // Ví đã được cấp mã khác cho buổi hẹn sau (hoặc voucher đó đã bị thu hồi): mã cũ này đã dùng rồi,
        // không được trừ nhầm vào voucher mới
        if (!owned || owned.assignedCode !== voucherCode.code) throw new ApiError(400, 'Mã này đã được sử dụng');
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

    voucher = await Voucher.findById(userVoucher.voucherId).populate('venueId', 'name address');
    if (!voucher) throw new ApiError(404, 'Voucher không còn tồn tại');
    assertOwnVoucher(req, voucher);
    if (userVoucher.status === 'used') throw new ApiError(400, 'Voucher này đã được sử dụng');
    if (userVoucher.status === 'expired') throw new ApiError(400, 'Voucher đã hết hạn');
  } else {
    voucher = await Voucher.findOne({ code }).populate('venueId', 'name address');
    if (!voucher) throw new ApiError(404, 'Mã voucher không tồn tại');
    assertOwnVoucher(req, voucher);
    if (voucher.codeType === 'unique') {
      throw new ApiError(400, 'Đây là mã chiến dịch. Vui lòng nhập mã riêng hoặc mã UVM-... trong ví của sinh viên');
    }
    // Ưu đãi hẹn cafe gắn với từng bạn trong buổi hẹn: phải quét đúng mã trong ví mỗi người mới ghi nhận được buổi hẹn
    if (voucher.meetupReward) {
      throw new ApiError(400, 'Ưu đãi hẹn cafe: quét mã QR (hoặc nhập mã UVM-...) trong ví của từng bạn, không dùng mã chung');
    }
    // Gõ mã chung thì không biết ai đang dùng: không kiểm tra được Premium và chưa trừ UniCoin của ai
    if (voucher.walletOnly || voucher.premiumOnly || voucher.coinCost > 0) {
      throw new ApiError(400, 'Voucher này chỉ áp dụng khi quét mã QR trong ví UNI-MATE của sinh viên');
    }
    if (!hasSharedStock(voucher)) {
      throw new ApiError(400, 'Voucher đã hết số lượng');
    }
  }

  if (!voucher.isActive) throw new ApiError(400, 'Voucher đã bị tạm ngưng');
  if (new Date(voucher.validUntil) < new Date()) throw new ApiError(400, 'Voucher đã hết hạn sử dụng');
  if (!isWithinSchedule(voucher)) {
    throw new ApiError(400, `Voucher này chỉ dùng được vào ${describeSchedule(voucher)}, hiện chưa tới thời gian áp dụng`, 'VOUCHER_OUT_OF_SCHEDULE');
  }

  return { voucher, userVoucher, meetup: await getMeetupContext(userVoucher) };
};

/** Partner: Kiểm tra voucher trước khi áp dụng (không trừ lượt) */
const verifyVoucher = catchAsync(async (req, res) => {
  const { voucher, userVoucher, meetup } = await findRedeemTarget(req, req.body);

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
      ...describeVoucherValue(voucher),
      validUntil: voucher.validUntil,
      venueName: voucher.venueId?.name || null,
      assignedCode: userVoucher?.assignedCode || null,
      // Voucher nhận qua "Rủ cafe": requiresCompanion = phải quét thêm mã của bạn đi cùng rồi mới áp dụng được
      fromMeetup: Boolean(userVoucher?.meetupId),
      meetup: meetup
        ? {
            id: meetup.id,
            status: meetup.status,
            isGroup: meetup.isGroup,
            requiresCompanion: meetup.requiresCompanion,
            companions: meetup.companions,
          }
        : null,
      // null = không giới hạn lượt
      // Mã chung: lượt còn phát được (lượt trong ví đã được giữ trước). Mã riêng / không giới hạn: null
      remainingCount: voucher.isUnlimited || voucher.codeType === 'unique' ? null : voucher.quantity - issuedOf(voucher),
      student: toStudentInfo(userVoucher?.userId),
    },
  });
});

/**
 * Partner: Quét QR để đối soát & tiêu voucher của sinh viên.
 * Ưu đãi hẹn cafe: body có thêm companions: [{ qrPayload | code }] là mã của các bạn đi cùng,
 * mọi voucher dùng cùng một lượt xác nhận.
 */
const redeemVoucher = catchAsync(async (req, res) => {
  const { voucher, userVoucher, meetup } = await findRedeemTarget(req, req.body);

  const companionVouchers = [];
  if (meetup?.requiresCompanion) {
    const payloads = Array.isArray(req.body.companions) ? req.body.companions.slice(0, GROUP_MEETUP_MAX_PEOPLE) : [];
    if (payloads.length === 0) {
      const who = meetup.isGroup ? 'bạn khác trong nhóm' : meetup.companions[0]?.fullName || 'bạn đi cùng';
      throw new ApiError(400, `Ưu đãi hẹn cafe cần có mặt từ 2 bạn trở lên: quét thêm mã của ${who} rồi mới áp dụng`, 'MEETUP_NEEDS_BOTH');
    }
    for (const payload of payloads) {
      const { userVoucher: companion } = await findRedeemTarget(req, payload);
      if (!companion || !meetup.companionVoucherIds.includes(String(companion._id))) {
        throw new ApiError(400, 'Có mã không phải của bạn đi cùng trong buổi hẹn này');
      }
      if (!companionVouchers.some(({ _id }) => String(_id) === String(companion._id))) companionVouchers.push(companion);
    }
  }
  const walletVouchers = [userVoucher, ...companionVouchers].filter(Boolean);

  if (walletVouchers.length > 0) {
    // Cập nhật có điều kiện để 2 lần quét cùng lúc không tiêu voucher 2 lần.
    // Các mã của buổi hẹn cùng được dùng, hoặc không mã nào được dùng.
    const marked = [];
    for (const { _id } of walletVouchers) {
      const updated = await UserVoucher.findOneAndUpdate({ _id, status: 'saved' }, { status: 'used', usedAt: new Date() });
      if (!updated) {
        await UserVoucher.updateMany({ _id: { $in: marked } }, { status: 'saved', usedAt: null });
        throw new ApiError(400, 'Voucher này đã được sử dụng');
      }
      marked.push(_id);
    }
    await Voucher.updateOne({ _id: voucher._id }, { $inc: { usedCount: walletVouchers.length } });
  } else {
    // Gõ mã chung tại quầy: chiếm 1 lượt phát (có điều kiện) rồi mới tính là đã dùng
    if (!(await reserveSharedSlot(voucher))) throw new ApiError(400, 'Voucher đã hết số lượng');
    await Voucher.updateOne({ _id: voucher._id }, { $inc: { usedCount: 1 } });
  }

  const toRedemption = (walletVoucher) => ({
    voucherId: voucher._id,
    venueId: voucher.venueId?._id,
    partnerId: voucher.partnerId,
    redeemedBy: req.user._id,
    userId: walletVoucher?.userId?._id || null,
    userVoucherId: walletVoucher?._id || null,
    method: walletVoucher ? 'qr' : 'code',
  });
  const [redemption] = await Redemption.create(
    walletVouchers.length > 0 ? walletVouchers.map(toRedemption) : [toRedemption(null)]
  );

  // Quán đã xác nhận sinh viên dùng voucher tại quầy → thưởng UniCoin (vẫn tính trong giới hạn ngày)
  const coinByStudent = {};
  for (const { userId: student } of walletVouchers) {
    coinByStudent[String(student._id)] = await earnCoins(student._id, VOUCHER_REDEEM_COIN, {
      type: 'voucher_redeem',
      description: `Dùng voucher tại ${voucher.venueId?.name || 'quán đối tác'} ☕`,
    });
  }

  // Đủ người của buổi "Rủ cafe" đã dùng ưu đãi tại quán → buổi hẹn hoàn tất, cộng thêm thưởng hẹn cafe
  const completed = await onMeetupVoucherRedeemed(req, userVoucher, walletVouchers.map(({ userId: student }) => student._id));
  const meetupCoinAwarded = completed?.coinAwarded || {};
  for (const [studentId, coin] of Object.entries(meetupCoinAwarded)) {
    coinByStudent[studentId] = (coinByStudent[studentId] || 0) + coin;
  }

  res.status(200).json({
    success: true,
    message: 'Đối soát & áp dụng voucher thành công! 🎉',
    data: {
      coinAwarded: userVoucher ? coinByStudent[String(userVoucher.userId._id)] || 0 : 0,
      meetupCompleted: Boolean(completed),
      // Từng sinh viên vừa được áp dụng và UniCoin thực nhận; coinCapped = bị cắt bớt vì giới hạn kiếm coin trong ngày
      students: walletVouchers.map(({ userId: student }) => {
        const key = String(student._id);
        const coinAwarded = coinByStudent[key] || 0;
        const coinPlanned = VOUCHER_REDEEM_COIN + (key in meetupCoinAwarded ? MEETUP_COMPLETE_COIN : 0);
        return { id: student._id, fullName: student.fullName, coinAwarded, coinCapped: coinAwarded < coinPlanned };
      }),
      maxDailyEarn: MAX_DAILY_EARN,
      id: redemption._id,
      code: voucher.code,
      title: voucher.title,
      discountPercent: voucher.discountPercent,
      discountAmount: voucher.discountAmount,
      ...describeVoucherValue(voucher),
      venueName: voucher.venueId?.name,
      student: userVoucher?.userId?.fullName || null,
      remainingCount:
        voucher.isUnlimited || voucher.codeType === 'unique'
          ? null
          : voucher.quantity - issuedOf(voucher) - (userVoucher ? 0 : 1),
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

/** Partner: Lấy danh sách voucher do mình phát hành */
const getMyPartnerVouchers = catchAsync(async (req, res) => {
  const vouchers = await Voucher.find({ partnerId: req.user._id })
    .populate('venueId', 'name address image status')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: vouchers.length,
    data: await annotateVouchers(vouchers),
  });
});

/** Partner: Tạo voucher khuyến mãi mới */
const toInt = (value) => Math.round(Number(value));

/**
 * Giá trị ưu đãi theo kiểu: phần trăm (có thể kèm giảm tối đa), số tiền, hoặc quà tặng.
 * Client cũ chỉ gửi discountPercent / discountAmount (không có discountType) thì tự suy ra.
 */
const buildDiscountFields = (body) => {
  const type = DISCOUNT_TYPES.includes(body.discountType)
    ? body.discountType
    : toInt(body.discountAmount) > 0 && !(toInt(body.discountPercent) > 0)
      ? 'amount'
      : 'percent';

  if (type === 'percent') {
    const percent = toInt(body.discountPercent);
    if (!(percent >= 1 && percent <= 100)) throw new ApiError(400, 'Phần trăm giảm phải từ 1 đến 100');
    const maxDiscount = toInt(body.maxDiscount) || 0;
    if (maxDiscount < 0) throw new ApiError(400, 'Số tiền giảm tối đa không hợp lệ');
    return { discountType: type, discountPercent: percent, discountAmount: 0, maxDiscount, giftItem: '' };
  }
  if (type === 'amount') {
    const amount = toInt(body.discountAmount);
    if (!(amount >= 1000)) throw new ApiError(400, 'Số tiền giảm tối thiểu là 1.000đ');
    return { discountType: type, discountPercent: 0, discountAmount: amount, maxDiscount: 0, giftItem: '' };
  }
  const giftItem = String(body.giftItem || '').trim();
  if (!giftItem) throw new ApiError(400, 'Vui lòng nhập món quà tặng (VD: 1 bánh flan)');
  if (giftItem.length > 100) throw new ApiError(400, 'Tên quà tặng tối đa 100 ký tự');
  return { discountType: 'gift', discountPercent: 0, discountAmount: 0, maxDiscount: 0, giftItem };
};

const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Ngày và giờ áp dụng: chọn đủ 7 ngày cũng như không giới hạn; khung giờ phải trong cùng một ngày */
const buildScheduleFields = (body) => {
  const days = (Array.isArray(body.applyDays) ? body.applyDays : []).map(Number);
  if (days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new ApiError(400, 'Ngày áp dụng không hợp lệ');
  }
  const applyDays = [...new Set(days)].sort();
  const applyFrom = String(body.applyFrom || '').trim();
  const applyTo = String(body.applyTo || '').trim();
  if (Boolean(applyFrom) !== Boolean(applyTo)) throw new ApiError(400, 'Vui lòng nhập đủ giờ bắt đầu và giờ kết thúc');
  if (applyFrom && !(HHMM_PATTERN.test(applyFrom) && HHMM_PATTERN.test(applyTo))) {
    throw new ApiError(400, 'Giờ áp dụng không hợp lệ (dạng 14:00)');
  }
  if (applyFrom && applyFrom >= applyTo) throw new ApiError(400, 'Giờ kết thúc phải sau giờ bắt đầu');
  return { applyDays: applyDays.length === 7 ? [] : applyDays, applyFrom: applyFrom || null, applyTo: applyTo || null };
};

const VOUCHER_CODE_RULE = 'Mã gồm 3–30 ký tự: chữ không dấu, số, gạch ngang hoặc gạch dưới, không bắt đầu bằng UVM-';
// UVM- là mã QR trong ví: thu ngân gõ mã có đầu này sẽ được tìm trong ví chứ không tìm theo voucher
const isValidVoucherCode = (code) => /^[A-Z0-9_-]{3,30}$/.test(code) && !code.startsWith('UVM-');

/** Mã voucher và mã riêng dùng chung một ô nhập ở quầy nên không được trùng nhau */
const isVoucherCodeTaken = async (code) => Boolean((await Voucher.exists({ code })) || (await VoucherCode.exists({ code })));

/** Partner: Tạo voucher khuyến mãi mới (chỉ nhận đúng các trường cho phép) */
const createVoucher = catchAsync(async (req, res) => {
  const { venueId } = req.body;
  const code = String(req.body.code || '').toUpperCase().trim();
  const title = String(req.body.title || '').trim();
  if (!code) throw new ApiError(400, 'Vui lòng nhập mã voucher');
  if (!isValidVoucherCode(code)) throw new ApiError(400, VOUCHER_CODE_RULE);
  if (!title) throw new ApiError(400, 'Vui lòng nhập tên chương trình voucher');
  if (title.length > 100) throw new ApiError(400, 'Tên chương trình tối đa 100 ký tự');

  // Voucher phải gắn với quán của chính đối tác. Quán chưa duyệt vẫn tạo trước được,
  // nhưng sinh viên chỉ thấy voucher sau khi admin duyệt quán.
  const venue = venueId
    ? await Venue.findById(venueId).catch(() => null)
    : await Venue.findOne({ partnerId: req.user._id }).sort({ createdAt: 1 });
  if (!venue) {
    throw new ApiError(400, 'Bạn cần thêm quán ở mục "Quản lý địa điểm" trước khi phát hành voucher');
  }
  if (venue.partnerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Bạn không sở hữu địa điểm này');
  }

  if (await isVoucherCodeTaken(code)) throw new ApiError(400, 'Mã voucher này đã tồn tại');

  // Hạn sử dụng: nhận "dd/mm/yyyy" hoặc ngày ISO; không gửi thì mặc định 6 tháng
  const rawDate = req.body.validUntil || req.body.expiry;
  let validUntil = null;
  if (typeof rawDate === 'string' && rawDate.includes('/')) {
    const [d, m, y] = rawDate.split('/');
    validUntil = new Date(`${y}-${m}-${d}T23:59:59`);
  } else if (rawDate) {
    validUntil = new Date(rawDate);
  }
  if (!validUntil || Number.isNaN(validUntil.getTime())) {
    validUntil = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  }
  if (validUntil.getTime() < Date.now()) throw new ApiError(400, 'Hạn sử dụng phải từ hôm nay trở đi');

  const meetupReward = Boolean(req.body.meetupReward);
  const isUnique = req.body.codeType === 'unique';
  const isUnlimited = !isUnique && Boolean(req.body.isUnlimited);
  const quantity = isUnique ? 0 : isUnlimited ? 0 : toInt(req.body.quantity) || 100;
  if (!isUnique && !isUnlimited && quantity < 1) throw new ApiError(400, 'Số lượng phát hành phải từ 1 trở lên');
  const minBill = toInt(req.body.minBill) || 0;
  if (minBill < 0) throw new ApiError(400, 'Hoá đơn tối thiểu không hợp lệ');
  const coinCost = meetupReward ? 0 : Math.max(0, toInt(req.body.coinCost) || 0);
  // Ưu đãi hẹn cafe tặng cho mọi buổi hẹn tại quán, không giới hạn theo Premium
  const premiumOnly = !meetupReward && Boolean(req.body.premiumOnly);
  if (meetupReward && !isUnique && !isUnlimited && quantity < 2) {
    throw new ApiError(400, 'Ưu đãi hẹn cafe cần ít nhất 2 lượt: mỗi buổi hẹn tặng cho 2 bạn');
  }
  const description = String(req.body.description || '').trim().slice(0, 500);
  const terms = Array.isArray(req.body.terms)
    ? req.body.terms.map((t) => String(t).trim()).filter(Boolean).slice(0, 10)
    : [];

  const voucher = await Voucher.create({
    code,
    title,
    description,
    terms,
    ...buildDiscountFields(req.body),
    minBill,
    venueId: venue._id,
    partnerId: venue.partnerId,
    codeType: isUnique ? 'unique' : 'shared',
    isUnlimited,
    // Mã riêng: số lượng tự tính khi nạp danh sách mã (POST /api/vouchers/:id/codes)
    quantity,
    coinCost,
    meetupReward,
    premiumOnly,
    // Mã riêng vốn đã chỉ dùng được qua ví / mã riêng. Hẹn cafe, Premium, đổi UniCoin cũng chỉ dùng qua ví
    // (gõ mã chung thì không biết ai dùng), xem findRedeemTarget
    walletOnly: !isUnique && (Boolean(req.body.walletOnly) || meetupReward || premiumOnly || coinCost > 0),
    validUntil,
    ...buildScheduleFields(req.body),
    usedCount: 0,
    issuedCount: 0,
  });

  res.status(201).json({
    success: true,
    message: 'Tạo voucher khuyến mãi thành công',
    data: withVoucherLabels(voucher),
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
    .populate('venueId', 'name address status')
    .populate('partnerId', 'fullName email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: vouchers.length,
    // Cùng trạng thái và số liệu với trang quán (utils/voucherStatus.js)
    data: await annotateVouchers(vouchers),
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

  const validItems = rawItems.filter((item) => String(item.code || '').trim() && String(item.title || '').trim());
  if (validItems.length === 0) {
    throw new ApiError(400, 'Không tìm thấy dòng voucher hợp lệ nào để nhập');
  }

  // Xác định cơ sở của quán (phải là quán của chính đối tác, không tự tạo quán mới)
  const venue = venueId
    ? await Venue.findById(venueId).catch(() => null)
    : await Venue.findOne({ partnerId: req.user._id }).sort({ createdAt: 1 });
  if (!venue) {
    throw new ApiError(400, 'Bạn cần thêm quán ở mục "Quản lý địa điểm" trước khi nhập voucher');
  }


  if (venue.partnerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Bạn không sở hữu cơ sở / địa điểm này');
  }

  const codes = validItems.map((i) => String(i.code).toUpperCase().trim());
  const [existingVouchers, takenUniqueCodes] = await Promise.all([
    Voucher.find({ code: { $in: codes } }),
    VoucherCode.find({ code: { $in: codes } }).distinct('code'),
  ]);
  const existingMap = new Map(existingVouchers.map((v) => [v.code, v]));

  const importedList = [];
  const updatedList = [];
  const skippedList = [];
  const processedCodes = new Set();

  for (const item of validItems) {
    const code = String(item.code).toUpperCase().trim();
    if (processedCodes.has(code)) {
      skippedList.push({ code, reason: 'Mã voucher trùng lặp trong file' });
      continue;
    }
    processedCodes.add(code);

    if (!isValidVoucherCode(code)) {
      skippedList.push({ code, reason: VOUCHER_CODE_RULE });
      continue;
    }
    if (takenUniqueCodes.includes(code)) {
      skippedList.push({ code, reason: 'Mã này đang là mã riêng của một voucher khác' });
      continue;
    }

    const existing = existingMap.get(code);

    let parsedDate = parseDateValue(item.validUntil);
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      parsedDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    }
    if (parsedDate.getTime() < Date.now()) {
      skippedList.push({ code, reason: 'Hạn sử dụng đã qua' });
      continue;
    }

    // Dùng chung luật với form tạo voucher: dòng không có mức giảm hợp lệ thì bỏ qua và báo lý do,
    // không tạo voucher giảm 0% hay đè mất kiểu ưu đãi của voucher đang chạy
    let discountFields;
    try {
      discountFields = buildDiscountFields({
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
      });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      skippedList.push({ code, reason: err.message });
      continue;
    }

    const isUnique = item.codeType === 'unique';
    const isUnlimited = !isUnique && Boolean(item.isUnlimited);
    const quantity = isUnique || isUnlimited ? 0 : toInt(item.quantity);
    if (!isUnique && !isUnlimited && !(quantity >= 1)) {
      skippedList.push({ code, reason: 'Số lượng phát hành phải từ 1 trở lên' });
      continue;
    }

    const coinCost = Math.max(0, toInt(item.coinCost) || 0);
    const voucherData = {
      code,
      title: String(item.title).trim().slice(0, 100),
      description: String(item.description || '').trim().slice(0, 500),
      ...discountFields,
      minBill: Math.max(0, toInt(item.minBill) || 0),
      codeType: isUnique ? 'unique' : 'shared',
      isUnlimited,
      // Mã riêng: số lượng = số mã nạp sau qua POST /api/vouchers/:id/codes
      quantity,
      coinCost,
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
        // Voucher đang chạy: giữ nguyên loại mã và quán, sinh viên đã nhận mã theo các thông tin này
        delete voucherData.codeType;
        delete voucherData.venueId;
        delete voucherData.partnerId;
        // Không ghi đè số lượng của voucher mã riêng đã nạp danh sách mã; mã chung không hạ dưới số lượt đã phát
        if (existing.codeType === 'unique') {
          delete voucherData.quantity;
          delete voucherData.isUnlimited;
        } else if (!voucherData.isUnlimited) {
          voucherData.quantity = Math.max(voucherData.quantity, issuedOf(existing));
        }
        // Ưu đãi hẹn cafe luôn miễn phí
        if (existing.meetupReward) delete voucherData.coinCost;
        Object.assign(existing, voucherData);
        await existing.save();
        updatedList.push(existing);
      }
    } else {
      // Mặc định chỉ quét QR trong ví như form tạo voucher: gõ mã chung thì không biết ai dùng và dùng lại được nhiều lần
      const created = await Voucher.create({ ...voucherData, walletOnly: !isUnique });
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

const LOCKED_AFTER_CLAIM = 'Đã có sinh viên nhận voucher này nên không đổi được';

/**
 * PUT /api/vouchers/:id — quán sửa voucher. Không đổi được mã, loại voucher, cách phát mã.
 * Đã có sinh viên nhận: chỉ được sửa tên, ghi chú, gia hạn, tăng số lượng, bật chỉ quét QR.
 * Các ô còn lại (mức giảm, hoá đơn tối thiểu, giá coin, ngày giờ áp dụng, chi nhánh) ảnh hưởng tới quyền lợi người đã nhận nên bị khoá.
 */
const updateVoucher = catchAsync(async (req, res) => {
  const voucher = await findManagedVoucher(req);
  const [{ hasRecipients }] = await annotateVouchers([voucher]);
  const { body } = req;
  const changes = {};

  const lockedChange = (current, next, label) => {
    const changed = JSON.stringify(current ?? null) !== JSON.stringify(next ?? null);
    if (changed && hasRecipients) throw new ApiError(400, `${LOCKED_AFTER_CLAIM} ${label}`);
    return changed;
  };

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) throw new ApiError(400, 'Vui lòng nhập tên chương trình voucher');
    if (title.length > 100) throw new ApiError(400, 'Tên chương trình tối đa 100 ký tự');
    changes.title = title;
  }
  if (body.description !== undefined) changes.description = String(body.description || '').trim().slice(0, 500);

  if (['discountType', 'discountPercent', 'discountAmount', 'maxDiscount', 'giftItem'].some((f) => body[f] !== undefined)) {
    const pick = (v) => ({
      discountType: v.discountType,
      discountPercent: v.discountPercent,
      discountAmount: v.discountAmount,
      maxDiscount: v.maxDiscount,
      giftItem: v.giftItem,
    });
    const current = { ...pick(voucher), discountType: getDiscountType(voucher) };
    const defined = Object.fromEntries(Object.entries(pick(body)).filter(([, value]) => value !== undefined));
    const next = buildDiscountFields({ ...current, ...defined });
    if (lockedChange(pick({ ...current, giftItem: current.giftItem || '' }), pick(next), 'mức ưu đãi')) Object.assign(changes, next);
  }

  if (body.minBill !== undefined) {
    const minBill = toInt(body.minBill) || 0;
    if (minBill < 0) throw new ApiError(400, 'Hoá đơn tối thiểu không hợp lệ');
    if (lockedChange(voucher.minBill || 0, minBill, 'hoá đơn tối thiểu')) changes.minBill = minBill;
  }

  const coinCost = voucher.meetupReward
    ? 0
    : body.coinCost !== undefined
      ? Math.max(0, toInt(body.coinCost) || 0)
      : voucher.coinCost || 0;
  if (lockedChange(voucher.coinCost || 0, coinCost, 'giá UniCoin')) changes.coinCost = coinCost;

  if (body.applyDays !== undefined || body.applyFrom !== undefined || body.applyTo !== undefined) {
    const next = buildScheduleFields({
      applyDays: body.applyDays ?? voucher.applyDays,
      applyFrom: body.applyFrom ?? voucher.applyFrom,
      applyTo: body.applyTo ?? voucher.applyTo,
    });
    const current = { applyDays: [...voucher.applyDays], applyFrom: voucher.applyFrom || null, applyTo: voucher.applyTo || null };
    if (lockedChange(current, next, 'ngày và giờ áp dụng')) Object.assign(changes, next);
  }

  if (body.venueId !== undefined && String(body.venueId) !== String(voucher.venueId)) {
    if (hasRecipients) throw new ApiError(400, `${LOCKED_AFTER_CLAIM} chi nhánh`);
    const venue = await Venue.findById(body.venueId).catch(() => null);
    if (!venue || String(venue.partnerId) !== String(voucher.partnerId)) throw new ApiError(403, 'Bạn không sở hữu địa điểm này');
    changes.venueId = venue._id;
  }

  if (body.validUntil !== undefined) {
    const validUntil = new Date(body.validUntil);
    if (Number.isNaN(validUntil.getTime())) throw new ApiError(400, 'Hạn sử dụng không hợp lệ');
    if (validUntil.getTime() !== new Date(voucher.validUntil).getTime()) {
      if (validUntil.getTime() < Date.now()) throw new ApiError(400, 'Hạn sử dụng phải từ hôm nay trở đi');
      if (hasRecipients && validUntil < voucher.validUntil) throw new ApiError(400, `${LOCKED_AFTER_CLAIM} hạn sử dụng ngắn hơn, chỉ được gia hạn`);
      changes.validUntil = validUntil;
    }
  }

  const isUnique = voucher.codeType === 'unique';
  if (!isUnique && (body.quantity !== undefined || body.isUnlimited !== undefined)) {
    const isUnlimited = body.isUnlimited !== undefined ? Boolean(body.isUnlimited) : voucher.isUnlimited;
    const quantity = isUnlimited ? 0 : toInt(body.quantity ?? voucher.quantity);
    if (!isUnlimited && !(quantity >= 1)) throw new ApiError(400, 'Số lượng phát hành phải từ 1 trở lên');
    if (voucher.meetupReward && !isUnlimited && quantity < 2) {
      throw new ApiError(400, 'Ưu đãi hẹn cafe cần ít nhất 2 lượt: mỗi buổi hẹn tặng cho 2 bạn');
    }
    if (hasRecipients && !isUnlimited && (voucher.isUnlimited || quantity < voucher.quantity)) {
      throw new ApiError(400, `${LOCKED_AFTER_CLAIM} số lượng ít hơn, chỉ được tăng`);
    }
    changes.isUnlimited = isUnlimited;
    changes.quantity = quantity;
  }

  // Cùng luật với lúc tạo: hẹn cafe, Premium, voucher có giá coin luôn chỉ quét QR
  const walletOnly =
    !isUnique &&
    (Boolean(body.walletOnly ?? voucher.walletOnly) || voucher.meetupReward || voucher.premiumOnly || coinCost > 0);
  if (hasRecipients && voucher.walletOnly && !walletOnly) {
    throw new ApiError(400, `${LOCKED_AFTER_CLAIM} để cho gõ mã chung`);
  }
  changes.walletOnly = walletOnly;

  Object.assign(voucher, changes);
  await voucher.save();
  res.status(200).json({ success: true, message: 'Đã cập nhật voucher', data: withVoucherLabels(voucher) });
});

/** DELETE /api/vouchers/:id — chỉ xoá được voucher chưa có ai nhận; đã có người nhận thì tạm dừng để giữ lịch sử đối soát */
const deleteVoucher = catchAsync(async (req, res) => {
  const voucher = await findManagedVoucher(req);
  const [{ hasRecipients }] = await annotateVouchers([voucher]);
  const refuse = () => new ApiError(400, 'Đã có sinh viên nhận voucher này nên không xoá được. Bấm Tạm dừng để ngừng phát.');
  if (hasRecipients) throw refuse();

  // Có điều kiện để sinh viên vừa nhận đúng lúc này thì không bị xoá mất voucher
  if (voucher.codeType === 'unique') {
    await VoucherCode.deleteMany({ voucherId: voucher._id, userId: null });
    if (await VoucherCode.exists({ voucherId: voucher._id })) throw refuse();
  }
  const removed = await Voucher.findOneAndDelete({ _id: voucher._id, issuedCount: { $in: [0, null] } });
  if (!removed) throw refuse();

  res.status(200).json({ success: true, message: 'Đã xoá voucher' });
});

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
  // Đổi voucher mã chung đang chạy sang mã riêng sẽ làm sai lượt đã phát và mã trong ví sinh viên
  if (voucher.codeType !== 'unique') {
    throw new ApiError(400, 'Voucher này dùng mã chung nên không nạp được mã riêng. Hãy tạo voucher mới loại mã riêng.');
  }
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
  const invalidCodes = uniqueInFile.filter((c) => !isValidVoucherCode(c));
  const toInsert = uniqueInFile.filter((c) => !taken.has(c) && isValidVoucherCode(c));

  if (toInsert.length > 0) {
    await VoucherCode.insertMany(toInsert.map((code) => ({ voucherId: voucher._id, code })), { ordered: false });
  }

  voucher.isUnlimited = false;
  voucher.quantity = await VoucherCode.countDocuments({ voucherId: voucher._id });
  await voucher.save();

  res.status(200).json({
    success: true,
    message: `Đã thêm ${toInsert.length} mã. Voucher hiện có ${voucher.quantity} mã riêng.${
      invalidCodes.length > 0 ? ` Bỏ qua ${invalidCodes.length} mã sai định dạng.` : ''
    }`,
    data: {
      added: toInsert.length,
      skippedExisting: [...taken],
      skippedInvalid: invalidCodes,
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
    .populate('userVoucherId', 'status usedAt assignedCode')
    .sort({ _id: 1 });

  // Ví đã được cấp mã khác cho buổi hẹn sau (hoặc voucher đó đã bị thu hồi): mã này đã dùng ở buổi trước
  const isUsedCode = (c) => !c.userVoucherId || c.userVoucherId.status === 'used' || c.userVoucherId.assignedCode !== c.code;
  const data = codes.map((c) => ({
    code: c.code,
    status: !c.userId ? 'available' : (isUsedCode(c) ? 'used' : 'assigned'),
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
  updateVoucher,
  deleteVoucher,
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

