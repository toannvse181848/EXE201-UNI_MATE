const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

// POST /api/auth/register/student
exports.registerStudent = catchAsync(async (req, res) => {
  const { email, password, fullName, university, major, year } = req.body;

  if (!email || !password || !fullName) {
    throw new ApiError(400, 'Vui lòng nhập đầy đủ thông tin');
  }

  const existed = await User.findOne({ email });
  if (existed) throw new ApiError(409, 'Email đã được sử dụng');

  const user = await User.create({
    email,
    password,
    fullName,
    role: 'student',
    status: 'active',
    studentProfile: { university, major, year },
  });

  res.status(201).json({
    success: true,
    data: { token: generateToken(user), user: user.toPublicJSON() },
  });
});

// POST /api/auth/register/partner
exports.registerPartner = catchAsync(async (req, res) => {
  const { email, password, fullName, phone, businessName } = req.body;

  if (!email || !password || !fullName || !businessName) {
    throw new ApiError(400, 'Vui lòng nhập đầy đủ thông tin');
  }

  const existed = await User.findOne({ email });
  if (existed) throw new ApiError(409, 'Email đã được sử dụng');

  const user = await User.create({
    email,
    password,
    fullName,
    phone,
    role: 'partner',
    status: 'pending',
    partnerProfile: { businessName },
  });

  res.status(201).json({
    success: true,
    data: { token: generateToken(user), user: user.toPublicJSON() },
  });
});

// POST /api/auth/register (Universal register endpoint)
exports.register = catchAsync(async (req, res) => {
  const { role } = req.body;
  if (role === 'partner') {
    return exports.registerPartner(req, res);
  }
  return exports.registerStudent(req, res);
});

// POST /api/auth/login
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Vui lòng nhập email và mật khẩu');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Email hoặc mật khẩu không đúng');
  }

  if (user.status === 'suspended') {
    throw new ApiError(403, 'Tài khoản đã bị khoá do vi phạm tiêu chuẩn cộng đồng');
  }

  user.lastActiveAt = Date.now();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: {
      token: generateToken(user),
      user: user.toPublicJSON(),
      isPendingReview: user.status === 'pending',
    },
  });
});


// GET /api/auth/me
exports.getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user.toPublicJSON() } });
});

// POST /api/auth/change-password
exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Vui lòng nhập đầy đủ thông tin');
  }
  if (newPassword.length < 6) {
    throw new ApiError(400, 'Mật khẩu mới phải từ 6 ký tự');
  }

  const user = await User.findById(req.user._id).select('+password');

  if (user.authProvider === 'google' && !user.password) {
    throw new ApiError(400, 'Tài khoản Google không dùng mật khẩu');
  }
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Mật khẩu hiện tại không đúng');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công' });
});