const Venue = require('../models/Venue');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

// Lấy danh sách địa điểm đã duyệt (Dành cho Sinh viên / Public)
const getVenues = catchAsync(async (req, res) => {
  const { category, search, district } = req.query;
  const filter = { status: 'approved' };

  if (category && category !== 'all') {
    filter.category = category;
  }
  if (district) {
    filter.district = new RegExp(district, 'i');
  }
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { address: new RegExp(search, 'i') },
      { tags: new RegExp(search, 'i') },
    ];
  }

  const venues = await Venue.find(filter)
    .populate('partnerId', 'fullName email phone')
    .sort({ rating: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: venues.length,
    data: venues,
  });
});

// Xem chi tiết địa điểm
const getVenueById = catchAsync(async (req, res) => {
  const venue = await Venue.findById(req.params.id).populate(
    'partnerId',
    'fullName email phone'
  );
  if (!venue) {
    throw new ApiError(404, 'Không tìm thấy địa điểm');
  }

  res.status(200).json({
    success: true,
    data: venue,
  });
});

// Dành cho Partner: Lấy danh sách quán của chính mình
const getMyVenues = catchAsync(async (req, res) => {
  const venues = await Venue.find({ partnerId: req.user._id }).sort({
    createdAt: -1,
  });
  res.status(200).json({
    success: true,
    count: venues.length,
    data: venues,
  });
});

// Dành cho Partner: Đăng ký quán cafe mới (Mặc định status: pending chờ duyệt)
const createVenue = catchAsync(async (req, res) => {
  const venueData = {
    ...req.body,
    partnerId: req.user._id,
    status: 'pending', // Phải qua admin duyệt
  };

  const venue = await Venue.create(venueData);

  res.status(201).json({
    success: true,
    message: 'Tạo địa điểm thành công, đang chờ Ban quản trị phê duyệt',
    data: venue,
  });
});

// Dành cho Partner: Cập nhật thông tin quán
const updateVenue = catchAsync(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    throw new ApiError(404, 'Không tìm thấy địa điểm');
  }

  // Kiểm tra quyền sở hữu
  if (
    venue.partnerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Bạn không có quyền sửa địa điểm này');
  }

  // Cập nhật
  const updated = await Venue.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Cập nhật địa điểm thành công',
    data: updated,
  });
});

// Dành cho Admin: Lấy danh sách tất cả quán (kèm lọc pending/approved/rejected)
const getAllVenuesAdmin = catchAsync(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status && status !== 'all') {
    filter.status = status;
  }

  const venues = await Venue.find(filter)
    .populate('partnerId', 'fullName email phone partnerProfile')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: venues.length,
    data: venues,
  });
});

// Dành cho Admin: Phê duyệt hoặc từ chối quán
const updateVenueStatus = catchAsync(async (req, res) => {
  const { status, rejectionReason } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw new ApiError(400, 'Trạng thái phê duyệt không hợp lệ');
  }

  const venue = await Venue.findByIdAndUpdate(
    req.params.id,
    { status, rejectionReason: rejectionReason || null },
    { new: true }
  );

  if (!venue) {
    throw new ApiError(404, 'Không tìm thấy địa điểm');
  }

  res.status(200).json({
    success: true,
    message:
      status === 'approved'
        ? 'Đã phê duyệt địa điểm thành công'
        : 'Đã từ chối địa điểm',
    data: venue,
  });
});

module.exports = {
  getVenues,
  getVenueById,
  getMyVenues,
  createVenue,
  updateVenue,
  getAllVenuesAdmin,
  updateVenueStatus,
};
