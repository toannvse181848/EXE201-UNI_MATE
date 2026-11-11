const User = require('../models/User');
const Venue = require('../models/Venue');
const Redemption = require('../models/Redemption');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

/**
 * Tài khoản thu ngân do chủ quán tạo cho nhân viên đứng quầy.
 * - Gắn với đúng 1 chi nhánh, chỉ quét voucher và xem lịch sử quét của chi nhánh đó (chặn ở middlewares/auth.js).
 * - Đăng nhập bằng tên đăng nhập (lưu ở trường email, không có @ nên không trùng email thật) và mật khẩu chủ quán đặt.
 * - Nhân viên nghỉ thì khoá tài khoản để giữ tên trong lịch sử; chỉ xoá được khi chưa quét lượt nào.
 */

const MAX_CASHIERS_PER_PARTNER = 20;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const USERNAME_RULE = 'Tên đăng nhập gồm 3–30 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới';

const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

const assertPassword = (password) => {
  if (typeof password !== 'string' || password.length < 6) throw new ApiError(400, 'Mật khẩu phải từ 6 ký tự');
  if (password.length > 64) throw new ApiError(400, 'Mật khẩu tối đa 64 ký tự');
};

const assertFullName = (fullName) => {
  if (!fullName) throw new ApiError(400, 'Vui lòng nhập tên nhân viên');
  if (fullName.length > 60) throw new ApiError(400, 'Tên nhân viên tối đa 60 ký tự');
};

/** Chi nhánh phải là của chính chủ quán */
const findOwnVenue = async (req, venueId) => {
  const venue = venueId ? await Venue.findById(venueId).select('name partnerId').catch(() => null) : null;
  if (!venue || String(venue.partnerId) !== String(req.user._id)) {
    throw new ApiError(400, 'Vui lòng chọn một chi nhánh của quán bạn');
  }
  return venue;
};

const findOwnCashier = async (req) => {
  const cashier = await User.findOne({
    _id: req.params.id,
    role: 'cashier',
    'cashierProfile.partnerId': req.user._id,
  }).catch(() => null);
  if (!cashier) throw new ApiError(404, 'Không tìm thấy tài khoản thu ngân');
  return cashier;
};

const toCashierInfo = (cashier, venuesById, redemptionCounts) => {
  const venue = venuesById.get(String(cashier.cashierProfile?.venueId));
  return {
    id: cashier._id,
    fullName: cashier.fullName,
    username: cashier.email,
    venue: venue ? { id: venue._id, name: venue.name } : null,
    status: cashier.status,
    lastActiveAt: cashier.lastActiveAt,
    createdAt: cashier.createdAt,
    redemptionCount: redemptionCounts.get(String(cashier._id)) || 0,
  };
};

const describeCashiers = async (cashiers) => {
  const venueIds = cashiers.map((c) => c.cashierProfile?.venueId).filter(Boolean);
  const [venues, counts] = await Promise.all([
    Venue.find({ _id: { $in: venueIds } }).select('name'),
    Redemption.aggregate([
      { $match: { redeemedBy: { $in: cashiers.map((c) => c._id) } } },
      { $group: { _id: '$redeemedBy', count: { $sum: 1 } } },
    ]),
  ]);
  const venuesById = new Map(venues.map((v) => [String(v._id), v]));
  const redemptionCounts = new Map(counts.map((c) => [String(c._id), c.count]));
  return cashiers.map((c) => toCashierInfo(c, venuesById, redemptionCounts));
};

/** GET /api/cashiers — danh sách thu ngân của quán */
const getMyCashiers = catchAsync(async (req, res) => {
  const cashiers = await User.find({ role: 'cashier', 'cashierProfile.partnerId': req.user._id }).sort({ createdAt: 1 });
  res.status(200).json({ success: true, count: cashiers.length, data: await describeCashiers(cashiers) });
});

/** POST /api/cashiers { fullName, username, password, venueId } */
const createCashier = catchAsync(async (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  const username = normalizeUsername(req.body.username);
  assertFullName(fullName);
  if (!USERNAME_PATTERN.test(username)) throw new ApiError(400, USERNAME_RULE);
  assertPassword(req.body.password);
  const venue = await findOwnVenue(req, req.body.venueId);

  const count = await User.countDocuments({ role: 'cashier', 'cashierProfile.partnerId': req.user._id });
  if (count >= MAX_CASHIERS_PER_PARTNER) {
    throw new ApiError(400, `Mỗi quán tạo tối đa ${MAX_CASHIERS_PER_PARTNER} tài khoản thu ngân. Xoá hoặc dùng lại tài khoản cũ.`);
  }
  if (await User.exists({ email: username })) throw new ApiError(409, 'Tên đăng nhập này đã có người dùng, hãy chọn tên khác');

  let cashier;
  try {
    cashier = await User.create({
      email: username,
      password: req.body.password,
      fullName,
      role: 'cashier',
      status: 'active',
      isProfileCompleted: true,
      // Chưa đăng nhập lần nào (mặc định của schema là lúc tạo, chủ quán sẽ tưởng nhân viên đã vào)
      lastActiveAt: null,
      cashierProfile: { partnerId: req.user._id, venueId: venue._id },
    });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Tên đăng nhập này đã có người dùng, hãy chọn tên khác');
    throw err;
  }

  const [data] = await describeCashiers([cashier]);
  res.status(201).json({ success: true, message: `Đã tạo tài khoản thu ngân cho ${fullName}`, data });
});

/**
 * PATCH /api/cashiers/:id { fullName?, venueId?, password?, status? }
 * status: 'active' | 'suspended' (khoá có hiệu lực ngay cả trên máy đang đăng nhập)
 */
const updateCashier = catchAsync(async (req, res) => {
  const cashier = await findOwnCashier(req);
  const { body } = req;
  const messages = [];

  if (body.fullName !== undefined) {
    const fullName = String(body.fullName).trim();
    assertFullName(fullName);
    cashier.fullName = fullName;
  }
  if (body.venueId !== undefined && String(body.venueId) !== String(cashier.cashierProfile?.venueId)) {
    const venue = await findOwnVenue(req, body.venueId);
    cashier.cashierProfile.venueId = venue._id;
    messages.push(`chuyển sang ${venue.name}`);
  }
  if (body.password !== undefined) {
    assertPassword(body.password);
    cashier.password = body.password;
    messages.push('đặt mật khẩu mới');
  }
  if (body.status !== undefined) {
    if (!['active', 'suspended'].includes(body.status)) throw new ApiError(400, 'Trạng thái không hợp lệ');
    if (body.status !== cashier.status) messages.push(body.status === 'suspended' ? 'khoá tài khoản' : 'mở khoá tài khoản');
    cashier.status = body.status;
  }

  await cashier.save();
  const [data] = await describeCashiers([cashier]);
  res.status(200).json({
    success: true,
    message: messages.length > 0 ? `Đã ${messages.join(', ')} cho ${cashier.fullName}` : 'Đã lưu thông tin thu ngân',
    data,
  });
});

/** DELETE /api/cashiers/:id — chỉ xoá được khi chưa quét lượt nào, đã quét thì khoá để giữ tên trong lịch sử */
const deleteCashier = catchAsync(async (req, res) => {
  const cashier = await findOwnCashier(req);
  const used = await Redemption.countDocuments({ redeemedBy: cashier._id });
  if (used > 0) {
    throw new ApiError(400, `${cashier.fullName} đã quét ${used} lượt nên không xoá được (để giữ lịch sử). Bấm Khoá để ngừng cho đăng nhập.`);
  }
  await User.deleteOne({ _id: cashier._id });
  res.status(200).json({ success: true, message: `Đã xoá tài khoản thu ngân ${cashier.fullName}` });
});

module.exports = { getMyCashiers, createCashier, updateCashier, deleteCashier };
