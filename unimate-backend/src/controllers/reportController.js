const Report = require('../models/Report');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Voucher = require('../models/Voucher');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

// Lý do báo cáo cố định để admin lọc được (client gửi mã, hiển thị tiếng Việt)
const REPORT_REASONS = {
  harassment: 'Quấy rối, xúc phạm',
  fake_profile: 'Hồ sơ giả, mạo danh',
  spam: 'Spam, lừa đảo',
  inappropriate: 'Nội dung không phù hợp',
  venue_issue: 'Quán không đúng thông tin / không nhận voucher',
  other: 'Khác',
};

const TARGET_MODELS = { user: User, venue: Venue, voucher: Voucher };

// Tạo báo cáo vi phạm (người dùng đã đăng nhập)
const createReport = catchAsync(async (req, res) => {
  const { targetType, targetId } = req.body;
  const reason = REPORT_REASONS[req.body.reason] ? req.body.reason : null;
  const description = String(req.body.description || '').trim().slice(0, 1000);

  if (!TARGET_MODELS[targetType] || !targetId) throw new ApiError(400, 'Thiếu thông tin đối tượng bị báo cáo');
  if (!reason) throw new ApiError(400, 'Vui lòng chọn lý do báo cáo');
  if (targetType === 'user' && String(targetId) === String(req.user._id)) {
    throw new ApiError(400, 'Không thể tự báo cáo chính mình');
  }
  const exists = await TARGET_MODELS[targetType].exists({ _id: targetId }).catch(() => null);
  if (!exists) throw new ApiError(404, 'Không tìm thấy đối tượng bị báo cáo');

  // Đã báo cáo đối tượng này và admin chưa xử lý → không tạo trùng
  const pending = await Report.findOne({ reporter: req.user._id, targetType, targetId, status: 'pending' });
  if (pending) {
    return res.status(200).json({
      success: true,
      message: 'Bạn đã báo cáo trường hợp này, ban quản trị đang xem xét',
      data: pending,
    });
  }

  const report = await Report.create({ reporter: req.user._id, targetType, targetId, reason, description });

  res.status(201).json({
    success: true,
    message: 'Báo cáo của bạn đã được tiếp nhận và chuyển đến ban quản trị',
    data: report,
  });
});

/** Gắn thông tin đối tượng bị báo cáo (tên, email, trạng thái) để admin biết xử lý ai */
const withTargets = async (reports) => {
  const idsByType = { user: [], venue: [], voucher: [] };
  for (const r of reports) if (idsByType[r.targetType]) idsByType[r.targetType].push(r.targetId);
  const [users, venues, vouchers] = await Promise.all([
    User.find({ _id: { $in: idsByType.user } }).select('fullName email role status'),
    Venue.find({ _id: { $in: idsByType.venue } }).select('name address status'),
    Voucher.find({ _id: { $in: idsByType.voucher } }).select('title code'),
  ]);
  const lookup = new Map([
    ...users.map((u) => [String(u._id), { name: u.fullName, email: u.email, role: u.role, status: u.status }]),
    ...venues.map((v) => [String(v._id), { name: v.name, address: v.address, status: v.status }]),
    ...vouchers.map((v) => [String(v._id), { name: `${v.title} (${v.code})` }]),
  ]);
  return reports.map((r) => ({
    ...r.toObject(),
    reasonLabel: REPORT_REASONS[r.reason] || r.reason,
    target: lookup.get(String(r.targetId)) || { name: 'Đã bị xoá' },
  }));
};

// Admin: Lấy danh sách hàng đợi báo cáo
const getAllReports = catchAsync(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status && status !== 'all') {
    filter.status = status;
  }

  const reports = await Report.find(filter)
    .populate('reporter', 'fullName email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: reports.length,
    data: await withTargets(reports),
  });
});

// Admin: Xử lý (resolved) hoặc bỏ qua (dismissed) báo cáo; có thể khoá luôn người bị báo cáo
const resolveReport = catchAsync(async (req, res) => {
  const { status, adminNote, suspendTarget } = req.body;
  if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
    throw new ApiError(400, 'Trạng thái xử lý không hợp lệ');
  }

  const report = await Report.findById(req.params.id).catch(() => null);
  if (!report) {
    throw new ApiError(404, 'Không tìm thấy báo cáo');
  }

  let suspended = false;
  if (suspendTarget && status === 'resolved' && report.targetType === 'user') {
    const target = await User.findById(report.targetId);
    if (target && target.role !== 'admin') {
      target.status = 'suspended';
      await target.save({ validateBeforeSave: false });
      suspended = true;
    }
  }

  report.status = status;
  report.adminNote = adminNote ? String(adminNote).slice(0, 500) : null;
  await report.save();

  res.status(200).json({
    success: true,
    message: suspended ? 'Đã xử lý báo cáo và khoá tài khoản bị báo cáo' : 'Đã cập nhật trạng thái xử lý báo cáo',
    data: (await withTargets([report]))[0],
  });
});

module.exports = { createReport, getAllReports, resolveReport, REPORT_REASONS };
