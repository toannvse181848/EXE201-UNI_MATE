const User = require('../models/User');
const Venue = require('../models/Venue');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { composeVenueName } = require('../utils/venueNaming');
const { cloudinary, getUploadedFileUrl } = require('../config/cloudinary');
const { escapeRegex } = require('../middlewares/security');
const { getPlan, resolvePlanId } = require('../config/plans');
const { activatePlan, canBuyPlan } = require('../utils/subscription');
const {
  maskEmail,
  maskName,
  maskPhone,
  formatDateTime,
  buildWorkbook,
  sendXlsx,
  datedFilename,
} = require('../utils/excelExport');


// Sinh viên: Lấy danh sách bạn học gợi ý (loại trừ chính mình)
const getSuggestedStudents = catchAsync(async (req, res) => {
  const currentUserId = req.user?._id;
  const limit = parseInt(req.query.limit, 10) || 10;

  const query = {
    role: { $in: ['student', 'user'] },
    status: 'active',
  };

  if (currentUserId) {
    query._id = { $ne: currentUserId };
  }

  const students = await User.find(query)
    .select('fullName email avatar phone studentProfile createdAt')
    .sort({ createdAt: -1 })
    .limit(limit);

  res.status(200).json({
    success: true,
    count: students.length,
    data: students,
  });
});

// Admin: Lấy danh sách toàn bộ người dùng trong hệ thống (có tìm kiếm, lọc vai trò, phân trang)
const getAllUsers = catchAsync(async (req, res) => {
  const { role, status, search, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    const escaped = escapeRegex(search);
    filter.$or = [
      { fullName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
      { 'studentProfile.studentId': { $regex: escaped, $options: 'i' } },
      { 'studentProfile.university': { $regex: escaped, $options: 'i' } },
    ];
  }


  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  res.status(200).json({
    success: true,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parseInt(limit, 10)),
    data: users,
  });
});

// Admin: Cập nhật trạng thái người dùng (active / suspended)
const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  // 'banned' là tên cũ phía frontend, lưu trong DB là 'suspended'
  const status = req.body.status === 'banned' ? 'suspended' : req.body.status;

  if (!['active', 'suspended'].includes(status)) {
    throw new ApiError(400, 'Trạng thái không hợp lệ. Chỉ chấp nhận active hoặc suspended');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy người dùng');
  }

  // Không cho phép tự ban chính mình
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'Không thể tự khoá tài khoản của chính mình');
  }

  user.status = status;
  await user.save();

  res.status(200).json({
    success: true,
    message: `Đã cập nhật trạng thái tài khoản thành: ${status}`,
    data: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
    },
  });
});

// PUT /api/users/me/avatar — upload ảnh đại diện lên Cloudinary (hoặc local storage)
const updateAvatar = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Vui lòng chọn file ảnh đại diện');
  }

  // Nếu dùng Cloudinary, req.file.path là URL Cloudinary. Nếu local, tạo link static.
  const avatarUrl = getUploadedFileUrl(req, req.file, 'avatars');

  // Xoá ảnh cũ trên Cloudinary nếu có (tránh tốn dung lượng)
  // URL dạng .../image/upload/v123/unimate/avatars/abc.jpg → public_id = unimate/avatars/abc
  const oldAvatar = req.user.avatar;
  const publicIdMatch = oldAvatar?.match(/\/upload\/(?:v\d+\/)?(unimate\/.+)\.[^./]+$/);
  if (publicIdMatch && !publicIdMatch[1].startsWith('unimate/defaults/')) {
    try {
      await cloudinary.uploader.destroy(publicIdMatch[1]);
    } catch {
      // Bỏ qua lỗi xoá ảnh cũ nếu có
    }
  }

  // Lưu URL mới vào DB
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: avatarUrl },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Cập nhật ảnh đại diện thành công',
    data: {
      avatar: user.avatar,
      user: user.toPublicJSON(),
    },
  });
});

// PUT /api/users/me — cập nhật hồ sơ của chính mình
const PROFILE_FIELDS = ['studentId', 'university', 'major', 'year', 'gender', 'bio', 'interests', 'objectives'];
const FULL_NAME_MAX_LENGTH = 60;

const updateMe = catchAsync(async (req, res) => {
  const user = req.user;
  const { fullName, phone, businessName } = req.body;

  if (fullName !== undefined) {
    const trimmedName = String(fullName).trim().replace(/\s+/g, ' ');
    if (!trimmedName) throw new ApiError(400, 'Họ tên không được để trống');
    if (trimmedName.length > FULL_NAME_MAX_LENGTH) {
      throw new ApiError(400, `Họ tên tối đa ${FULL_NAME_MAX_LENGTH} ký tự`);
    }
    user.fullName = trimmedName;
  }
  if (phone !== undefined) user.phone = phone || null;

  if (user.role === 'student' || user.role === 'user') {
    // Nhận cả dạng phẳng { major, bio } lẫn lồng { studentProfile: { major, bio } }
    const source = { ...req.body, ...(req.body.studentProfile || {}) };
    PROFILE_FIELDS.forEach((field) => {
      if (source[field] !== undefined) user.studentProfile[field] = source[field];
    });
    user.isProfileCompleted = Boolean(
      user.studentProfile.studentId && user.studentProfile.university && user.studentProfile.major
    );
  }

  let brandChanged = false;
  if (user.role === 'partner' && businessName !== undefined) {
    const nextBrand = String(businessName || '').trim();
    brandChanged = nextBrand !== String(user.partnerProfile?.businessName || '').trim();
    user.partnerProfile = { ...(user.partnerProfile || {}), businessName: nextBrand };
  }

  await user.save();

  // Tên chi nhánh = "Thương hiệu - Chi nhánh": đổi thương hiệu thì đổi luôn tên các chi nhánh
  if (brandChanged) {
    const branches = await Venue.find({ partnerId: user._id, branchName: { $exists: true } }).select('branchName');
    await Promise.all(
      branches.map((v) =>
        Venue.updateOne({ _id: v._id }, { name: composeVenueName(user.partnerProfile.businessName || user.fullName, v.branchName) })
      )
    );
  }

  res.status(200).json({
    success: true,
    message: 'Cập nhật hồ sơ thành công',
    data: { user: user.toPublicJSON() },
  });
});

// POST /api/users/premium/buy — Đổi UniCoin lấy gói Premium (cấp tích xanh xác thực)
// Mua bằng tiền thật đi qua luồng đơn hàng: POST /api/orders
const buyPremium = catchAsync(async (req, res) => {
  const { plan = 'monthly', paymentMethod = 'coin' } = req.body;

  if (paymentMethod !== 'coin') {
    throw new ApiError(
      400,
      'Thanh toán bằng tiền cần tạo đơn hàng và chuyển khoản qua mã QR (POST /api/orders). API này chỉ dùng để đổi UniCoin.'
    );
  }

  const planId = resolvePlanId(plan);
  const planInfo = getPlan(planId);
  if (!planInfo || planInfo.role !== 'student') {
    throw new ApiError(400, 'Gói Premium không hợp lệ. Vui lòng chọn gói theo tháng (monthly) hoặc theo năm (yearly).');
  }
  if (planInfo.coinPrice == null) {
    throw new ApiError(400, 'Gói này không hỗ trợ đổi bằng UniCoin');
  }
  if (!canBuyPlan(req.user, planId)) {
    throw new ApiError(403, 'Chỉ tài khoản sinh viên mới nâng cấp được Premium');
  }

  const coinCost = planInfo.coinPrice;

  // Trừ coin có điều kiện để 2 request cùng lúc không trừ âm số dư
  const deducted = await User.findOneAndUpdate(
    { _id: req.user._id, 'studentProfile.uniCoin': { $gte: coinCost } },
    {
      $inc: { 'studentProfile.uniCoin': -coinCost },
      $push: {
        'studentProfile.coinLog': {
          $each: [{
            type: 'premium_purchase',
            amount: -coinCost,
            description: `Đổi ${planInfo.name}`,
            createdAt: new Date(),
          }],
          $slice: -100,
        },
      },
    },
    { returnDocument: 'after' }
  );

  if (!deducted) {
    const currentCoins = req.user.studentProfile?.uniCoin ?? 0;
    throw new ApiError(
      400,
      `Bạn không đủ UniCoin để nâng cấp gói này. Cần ${coinCost} UniCoin nhưng bạn hiện có ${currentCoins} UniCoin.`
    );
  }

  activatePlan(deducted, planId);
  await deducted.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `Chúc mừng bạn đã nâng cấp thành công gói Premium (${planId === 'premium_yearly' ? '1 Năm' : '1 Tháng'})! Tài khoản đã được cấp tích xanh xác thực.`,
    data: {
      user: deducted.toPublicJSON(),
    },
  });
});

// PATCH /api/users/:id/premium — Admin cấp hoặc thu hồi Premium / Tích xanh
const toggleUserPremium = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isPremium, plan = 'monthly' } = req.body;

  const targetUser = await User.findById(id);
  if (!targetUser) throw new ApiError(404, 'Không tìm thấy người dùng');

  if (!targetUser.studentProfile) targetUser.studentProfile = {};

  const grant = Boolean(isPremium);
  if (grant) {
    if (!getPlan(plan)) throw new ApiError(400, 'Gói Premium không hợp lệ');
    activatePlan(targetUser, plan);
  } else {
    targetUser.studentProfile.isPremium = false;
    targetUser.studentProfile.isVerifiedStudent = false;
    targetUser.studentProfile.premiumPlan = null;
    targetUser.studentProfile.premiumExpiresAt = null;
  }

  await targetUser.save();

  res.status(200).json({
    success: true,
    message: grant
      ? 'Đã cấp gói Premium & Tích xanh cho người dùng'
      : 'Đã huỷ gói Premium & Tích xanh của người dùng',
    data: {
      user: targetUser.toPublicJSON(),
    },
  });
});

// GET /api/users/admin/export — Admin xuất Excel danh sách người dùng (minh chứng người dùng)
const exportUsers = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role === 'student' ? { $in: ['student', 'user'] } : req.query.role;

  const users = await User.find(filter).sort({ createdAt: 1 });

  const ROLE_LABEL = { student: 'Sinh viên', user: 'Sinh viên', partner: 'Đối tác', admin: 'Quản trị' };
  const STATUS_LABEL = { active: 'Hoạt động', pending: 'Chờ duyệt', suspended: 'Bị khoá' };

  const rows = users.map((u, i) => {
    const pub = u.toPublicJSON();
    return {
      stt: i + 1,
      fullName: maskName(u.fullName),
      email: maskEmail(u.email),
      phone: maskPhone(u.phone),
      role: ROLE_LABEL[u.role] || u.role,
      university: u.studentProfile?.university || (u.role === 'partner' ? u.partnerProfile?.businessName || '' : ''),
      premium: pub.isPremium ? 'Có' : '',
      status: STATUS_LABEL[u.status] || u.status,
      createdAt: formatDateTime(u.createdAt),
      lastActiveAt: formatDateTime(u.lastActiveAt),
    };
  });

  const buffer = buildWorkbook('Nguoi_dung', [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Họ tên', key: 'fullName', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Số điện thoại', key: 'phone', width: 14 },
    { header: 'Vai trò', key: 'role', width: 12 },
    { header: 'Trường / Tên quán', key: 'university', width: 28 },
    { header: 'Premium', key: 'premium', width: 9 },
    { header: 'Trạng thái', key: 'status', width: 12 },
    { header: 'Ngày đăng ký', key: 'createdAt', width: 20 },
    { header: 'Hoạt động gần nhất', key: 'lastActiveAt', width: 20 },
  ], rows);

  sendXlsx(res, buffer, datedFilename('unimate_nguoi_dung'));
});

module.exports = {
  getSuggestedStudents,
  getAllUsers,
  updateUserStatus,
  updateAvatar,
  updateMe,
  buyPremium,
  toggleUserPremium,
  exportUsers,
};
