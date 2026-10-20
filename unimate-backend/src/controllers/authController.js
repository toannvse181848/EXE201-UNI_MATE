const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/email');
const { parseAcquisition } = require('../config/acquisition');
const { recordActivity } = require('../utils/activityTracker');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();


// POST /api/auth/register/student
exports.registerStudent = catchAsync(async (req, res) => {
  const {
    email,
    password,
    fullName,
    phone,
    studentId,
    university,
    major,
    year,
    gender,
    bio,
  } = req.body;

  if (!email || !password || !fullName) {
    throw new ApiError(400, 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu');
  }

  const existed = await User.findOne({ email });
  if (existed) throw new ApiError(409, 'Email này đã được sử dụng');

  const user = await User.create({
    email,
    password,
    fullName,
    phone: phone || null,
    role: 'student',
    status: 'active',
    isProfileCompleted: !!(studentId && university && major),
    studentProfile: {
      studentId: studentId || null,
      university: university || 'Đại học FPT TP.HCM',
      major: major || 'Kỹ thuật Phần mềm',
      year: year || 'Sinh viên năm 3',
      gender: gender || 'other',
      bio: bio || 'Tìm bạn cùng học bài & khám phá quán cafe yên tĩnh 🚀',
      interests: req.body.interests || ['Kết nối bạn học', 'Cà phê học bài', 'Boardgame'],
      uniCoin: 250,
      trustScore: 95,
      isVerifiedStudent: false,
      isPremium: false,
    },
    acquisition: parseAcquisition(req.body),
  });
  recordActivity(user._id, req.headers['user-agent']);

  res.status(201).json({
    success: true,
    message: 'Đăng ký tài khoản sinh viên thành công',
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
    acquisition: parseAcquisition(req.body),
  });
  recordActivity(user._id, req.headers['user-agent']);

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
  recordActivity(user._id, req.headers['user-agent']);

  res.status(200).json({
    success: true,
    data: {
      token: generateToken(user),
      user: user.toPublicJSON(),
      isPendingReview: user.status === 'pending',
    },
  });
});


// POST /api/auth/google { credential, acquisition?, heardFrom? }
// credential = ID token do nút "Đăng nhập bằng Google" (Google Identity Services) trả về trên web
exports.googleLogin = catchAsync(async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new ApiError(503, 'Chưa cấu hình đăng nhập bằng Google');
  if (typeof req.body.credential !== 'string') throw new ApiError(400, 'Thiếu thông tin đăng nhập Google');

  // Hỏi Google xác minh chữ ký và hạn của token, đúng ứng dụng của UNI-MATE
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: req.body.credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Đăng nhập Google không hợp lệ hoặc đã hết hạn');
  }
  if (!payload?.email || !payload.email_verified) throw new ApiError(401, 'Email Google chưa được xác minh');
  const email = payload.email.toLowerCase();

  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });
  let isNewUser = false;

  if (user) {
    // Admin chỉ đăng nhập bằng mật khẩu ở trang /admin/login
    if (user.role === 'admin') throw new ApiError(403, 'Tài khoản quản trị không đăng nhập bằng Google');
    if (user.status === 'suspended') throw new ApiError(403, 'Tài khoản đã bị khoá do vi phạm tiêu chuẩn cộng đồng');
    // Tài khoản đăng ký bằng email trước đó: gắn thêm Google để lần sau đăng nhập một chạm
    if (!user.googleId) user.googleId = payload.sub;
    if (!user.avatar && payload.picture) user.avatar = payload.picture;
    user.lastActiveAt = Date.now();
    await user.save({ validateBeforeSave: false });
  } else {
    // Người mới: tạo tài khoản sinh viên, hoàn thiện hồ sơ ở bước onboarding
    isNewUser = true;
    user = await User.create({
      email,
      fullName: payload.name || email.split('@')[0],
      avatar: payload.picture || null,
      googleId: payload.sub,
      authProvider: 'google',
      role: 'student',
      status: 'active',
      isProfileCompleted: false,
      studentProfile: { uniCoin: 250, trustScore: 95, isVerifiedStudent: false, isPremium: false },
      acquisition: parseAcquisition(req.body),
    });
  }
  recordActivity(user._id, req.headers['user-agent']);

  res.status(isNewUser ? 201 : 200).json({
    success: true,
    data: { token: generateToken(user), user: user.toPublicJSON(), isNewUser },
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

// POST /api/auth/forgot-password
exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Vui lòng nhập email');

  const user = await User.findOne({ email });
  // Luôn trả 200 để tránh lộ thông tin email tồn tại hay không
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
    });
  }

  // Sinh token ngẫu nhiên 32 bytes
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 phút
  await user.save({ validateBeforeSave: false });

  // Build reset URL (frontend route)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  try {
    await sendPasswordResetEmail(email, resetUrl);
  } catch (err) {
    // Rollback nếu gửi email thất bại
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Gửi email thất bại. Vui lòng thử lại sau.');
  }

  res.status(200).json({
    success: true,
    message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
  });
});

// POST /api/auth/reset-password
exports.resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, 'Token và mật khẩu mới là bắt buộc');
  }
  if (newPassword.length < 6) {
    throw new ApiError(400, 'Mật khẩu phải từ 6 ký tự trở lên');
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Token không hợp lệ hoặc đã hết hạn');
  }

  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.' });
});