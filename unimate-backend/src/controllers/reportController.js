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
    Voucher.find({ _id: { $in: idsByType.voucher } }).select('title code isActive'),
  ]);
  const lookup = new Map([
    ...users.map((u) => [String(u._id), { name: u.fullName, email: u.email, role: u.role, status: u.status }]),
    ...venues.map((v) => [String(v._id), { name: v.name, address: v.address, status: v.status }]),
    ...vouchers.map((v) => [String(v._id), { name: `${v.title} (${v.code})`, status: v.isActive ? 'active' : 'paused' }]),
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

/** Hành động admin làm được với từng loại đối tượng khi xử lý báo cáo */
const TARGET_ACTIONS = {
  user: 'suspend_user',
  voucher: 'pause_voucher',
  venue: 'hide_venue',
};

const ACTION_LABEL = {
  suspend_user: 'Đã khoá tài khoản bị báo cáo',
  pause_voucher: 'Đã tạm dừng voucher bị báo cáo',
  hide_venue: 'Đã ẩn quán, chờ quán sửa thông tin và admin duyệt lại',
};

/** Thực hiện hành động với đối tượng bị báo cáo. Trả về true nếu đã làm. */
const applyTargetAction = async (report, action, adminNote) => {
  if (action === 'suspend_user') {
    const res = await User.updateOne({ _id: report.targetId, role: { $ne: 'admin' } }, { status: 'suspended' });
    return res.matchedCount > 0;
  }
  if (action === 'pause_voucher') {
    const res = await Voucher.updateOne({ _id: report.targetId }, { isActive: false });
    return res.matchedCount > 0;
  }
  if (action === 'hide_venue') {
    // Về "chờ duyệt": sinh viên không thấy quán (và voucher của quán) cho tới khi admin duyệt lại
    const res = await Venue.updateOne(
      { _id: report.targetId },
      { status: 'pending', rejectionReason: `Bị báo cáo: ${adminNote || REPORT_REASONS[report.reason] || 'vi phạm'}` }
    );
    return res.matchedCount > 0;
  }
  return false;
};

/**
 * Admin: Xử lý (resolved) hoặc bỏ qua (dismissed) báo cáo.
 * Body: { status, adminNote, targetAction?: true } — targetAction (hoặc suspendTarget cũ) = làm luôn hành động
 * tương ứng với đối tượng: khoá người dùng / tạm dừng voucher / ẩn quán.
 * Có hành động thì các báo cáo khác đang chờ về cùng đối tượng cũng được đóng theo.
 */
const resolveReport = catchAsync(async (req, res) => {
  const { status, adminNote } = req.body;
  const wantsAction = Boolean(req.body.targetAction || req.body.suspendTarget);

  if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
    throw new ApiError(400, 'Trạng thái xử lý không hợp lệ');
  }

  const report = await Report.findById(req.params.id).catch(() => null);
  if (!report) {
    throw new ApiError(404, 'Không tìm thấy báo cáo');
  }

  const note = adminNote ? String(adminNote).slice(0, 500) : null;
  let actionTaken = null;
  if (wantsAction && status === 'resolved') {
    const action = TARGET_ACTIONS[report.targetType];
    if (action && (await applyTargetAction(report, action, note))) actionTaken = action;
  }

  report.status = status;
  report.adminNote = note;
  if (actionTaken) report.actionTaken = actionTaken;
  if (status !== 'reviewed') report.resolvedAt = new Date();
  await report.save();

  let alsoClosed = 0;
  if (actionTaken) {
    const others = await Report.updateMany(
      { _id: { $ne: report._id }, targetType: report.targetType, targetId: report.targetId, status: { $in: ['pending', 'reviewed'] } },
      { status: 'resolved', adminNote: note, actionTaken, resolvedAt: new Date() }
    );
    alsoClosed = others.modifiedCount;
  }

  res.status(200).json({
    success: true,
    message: actionTaken
      ? `${ACTION_LABEL[actionTaken]}${alsoClosed ? ` (đóng thêm ${alsoClosed} báo cáo cùng đối tượng)` : ''}`
      : 'Đã cập nhật trạng thái xử lý báo cáo',
    data: (await withTargets([report]))[0],
  });
});

const MY_STATUS_LABEL = {
  pending: 'Đang chờ xem xét',
  reviewed: 'Đang xem xét',
  resolved: 'Đã xử lý',
  dismissed: 'Không phát hiện vi phạm',
};

/** Người dùng: các báo cáo mình đã gửi và kết quả xử lý (không lộ email / trạng thái tài khoản của người bị báo cáo) */
const getMyReports = catchAsync(async (req, res) => {
  const reports = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const withNames = await withTargets(reports);
  res.status(200).json({
    success: true,
    count: withNames.length,
    data: withNames.map((r) => ({
      _id: r._id,
      targetType: r.targetType,
      targetName: r.target?.name || 'Đã bị xoá',
      reasonLabel: r.reasonLabel,
      status: r.status,
      statusLabel: MY_STATUS_LABEL[r.status] || r.status,
      result: r.actionTaken ? ACTION_LABEL[r.actionTaken] : null,
      adminNote: r.adminNote || null,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt || null,
    })),
  });
});

module.exports = { createReport, getAllReports, resolveReport, getMyReports, REPORT_REASONS };
