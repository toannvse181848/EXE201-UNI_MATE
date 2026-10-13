const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { cloudinary, getUploadedFileUrl } = require('../config/cloudinary');
const { escapeRegex } = require('../middlewares/security');


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

const updateMe = catchAsync(async (req, res) => {
  const user = req.user;
  const { fullName, phone, businessName } = req.body;

  if (fullName !== undefined) {
    if (!String(fullName).trim()) throw new ApiError(400, 'Họ tên không được để trống');
    user.fullName = String(fullName).trim();
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

  if (user.role === 'partner' && businessName !== undefined) {
    user.partnerProfile = { ...(user.partnerProfile || {}), businessName };
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Cập nhật hồ sơ thành công',
    data: { user: user.toPublicJSON() },
  });
});

// POST /api/users/premium/buy — Mua / Nâng cấp gói Premium để nhận tích xanh xác thực
const buyPremium = catchAsync(async (req, res) => {
  const user = req.user;
  const { plan = 'monthly', paymentMethod = 'coin' } = req.body;

  if (!['monthly', 'yearly'].includes(plan)) {
    throw new ApiError(400, 'Gói Premium không hợp lệ. Vui lòng chọn gói theo tháng (monthly) hoặc theo năm (yearly).');
  }

  const coinCost = plan === 'yearly' ? 800 : 100;
  const durationDays = plan === 'yearly' ? 365 : 30;

  if (paymentMethod === 'coin') {
    const currentCoins = user.studentProfile?.uniCoin ?? 0;
    if (currentCoins < coinCost) {
      throw new ApiError(
        400,
        `Bạn không đủ UniCoin để nâng cấp gói này. Cần ${coinCost} UniCoin nhưng bạn hiện có ${currentCoins} UniCoin.`
      );
    }
    user.studentProfile.uniCoin = currentCoins - coinCost;
  }

  // Cấp Premium và Tích xanh xác thực
  if (!user.studentProfile) user.studentProfile = {};
  user.studentProfile.isPremium = true;
  user.studentProfile.isVerifiedStudent = true;
  user.studentProfile.premiumPlan = plan;
  user.studentProfile.premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  await user.save();

  res.status(200).json({
    success: true,
    message: `Chúc mừng bạn đã nâng cấp thành công gói Premium (${plan === 'yearly' ? '1 Năm' : '1 Tháng'})! Tài khoản đã được cấp tích xanh xác thực.`,
    data: {
      user: user.toPublicJSON(),
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
  targetUser.studentProfile.isPremium = grant;
  targetUser.studentProfile.isVerifiedStudent = grant;
  targetUser.studentProfile.premiumPlan = grant ? plan : null;
  targetUser.studentProfile.premiumExpiresAt = grant
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : null;

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

module.exports = {
  getSuggestedStudents,
  getAllUsers,
  updateUserStatus,
  updateAvatar,
  updateMe,
  buyPremium,
  toggleUserPremium,
};
