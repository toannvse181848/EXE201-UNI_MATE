const Report = require('../models/Report');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

// Tạo báo cáo vi phạm
const createReport = catchAsync(async (req, res) => {
  const { targetType, targetId, reason, description } = req.body;

  if (!targetType || !targetId || !reason) {
    throw new ApiError(400, 'Thiếu thông tin báo cáo bắt buộc');
  }

  const report = await Report.create({
    reporter: req.user._id,
    targetType,
    targetId,
    reason,
    description,
  });

  res.status(201).json({
    success: true,
    message: 'Báo cáo của bạn đã được tiếp nhận và chuyển đến ban quản trị',
    data: report,
  });
});

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
    data: reports,
  });
});

// Admin: Xử lý hoặc đóng báo cáo
const resolveReport = catchAsync(async (req, res) => {
  const { status, adminNote } = req.body;
  if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
    throw new ApiError(400, 'Trạng thái xử lý không hợp lệ');
  }

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status, adminNote },
    { new: true }
  );

  if (!report) {
    throw new ApiError(404, 'Không tìm thấy báo cáo');
  }

  res.status(200).json({
    success: true,
    message: 'Đã cập nhật trạng thái xử lý báo cáo',
    data: report,
  });
});

module.exports = {
  createReport,
  getAllReports,
  resolveReport,
};
