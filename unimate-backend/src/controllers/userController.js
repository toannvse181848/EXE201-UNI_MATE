const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

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
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { 'studentProfile.studentId': { $regex: search, $options: 'i' } },
      { 'studentProfile.university': { $regex: search, $options: 'i' } },
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

// Admin: Cập nhật trạng thái người dùng (active / banned)
const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'banned'].includes(status)) {
    throw new ApiError(400, 'Trạng thái không hợp lệ. Chỉ chấp nhận active hoặc banned');
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

module.exports = {
  getSuggestedStudents,
  getAllUsers,
  updateUserStatus,
};
