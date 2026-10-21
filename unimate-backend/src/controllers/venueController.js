const Venue = require('../models/Venue');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { getUploadedFileUrl } = require('../config/cloudinary');
const { extractDistrict } = require('../utils/addressUtils');
const { escapeRegex } = require('../middlewares/security');
const { generateSecret, buildQrContent } = require('../utils/venueCheckin');
const { isPartnerPlanActive } = require('../utils/subscription');


// Tự động chuẩn hoá trường district nếu bị gán cứng 'Quận 10' sai
const sanitizeVenueDistricts = (venues) => {
  return venues.map((v) => {
    const obj = v.toObject ? v.toObject() : v;
    const isFakeQ10 =
      obj.district === 'Quận 10' &&
      obj.address &&
      !obj.address.toLowerCase().includes('quận 10') &&
      !obj.address.toLowerCase().includes('q.10') &&
      !obj.address.toLowerCase().includes('q10');

    if (!obj.district || isFakeQ10) {
      obj.district = extractDistrict(obj.address, obj.district);
      if (v._id) {
        Venue.updateOne({ _id: v._id }, { district: obj.district }).catch(() => {});
      }
    }
    return obj;
  });
};


// Lấy danh sách địa điểm đã duyệt (Dành cho Sinh viên / Public)
const getVenues = catchAsync(async (req, res) => {
  const { category, search, district } = req.query;
  const filter = { status: 'approved' };

  if (category && category !== 'all') {
    filter.category = category;
  }
  if (district) {
    filter.district = new RegExp(escapeRegex(district), 'i');
  }
  if (search) {
    const escaped = escapeRegex(search);
    filter.$or = [
      { name: new RegExp(escaped, 'i') },
      { address: new RegExp(escaped, 'i') },
      { tags: new RegExp(escaped, 'i') },
    ];
  }


  const venues = await Venue.find(filter)
    // API công khai: không trả email / số điện thoại của chủ tài khoản (admin xem ở /admin/all)
    .populate('partnerId', 'fullName partnerProfile.planExpiresAt')
    .sort({ rating: -1, createdAt: -1 });

  const data = sanitizeVenueDistricts(venues).map((venue) => {
    const isFeatured = isPartnerPlanActive(venue.partnerId?.partnerProfile);
    if (venue.partnerId) delete venue.partnerId.partnerProfile;
    return { ...venue, isFeatured };
  });
  // Quyền lợi Gói Đối tác: quán đang trả phí đứng đầu danh sách (sort ổn định, giữ thứ tự rating)
  data.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
});

// Xem chi tiết địa điểm
const getVenueById = catchAsync(async (req, res) => {
  const venue = await Venue.findById(req.params.id).populate('partnerId', 'fullName');
  if (!venue) {
    throw new ApiError(404, 'Không tìm thấy địa điểm');
  }

  const obj = venue.toObject();
  obj.district = extractDistrict(obj.address, obj.district);

  res.status(200).json({
    success: true,
    data: obj,
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
    data: sanitizeVenueDistricts(venues),
  });
});


// Các trường partner được phép tự sửa. status / rejectionReason / rating chỉ admin đổi qua API riêng.
const EDITABLE_FIELDS = [
  'name',
  'description',
  'address',
  'district',
  'city',
  'location',
  'phone',
  'openHours',
  'priceRange',
  'image',
  'images',
  'category',
  'tags',
  'amenities',
];

const pickEditableFields = (body) =>
  EDITABLE_FIELDS.reduce((acc, field) => {
    if (body[field] !== undefined) acc[field] = body[field];
    return acc;
  }, {});

// Dành cho Partner: Upload ảnh quán (tối đa 10 ảnh / lần), trả về danh sách URL
const uploadVenueImages = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'Vui lòng chọn ít nhất 1 ảnh');
  }

  const urls = req.files.map((file) => getUploadedFileUrl(req, file, 'venues'));

  res.status(201).json({
    success: true,
    message: `Đã tải lên ${urls.length} ảnh`,
    data: { urls },
  });
});

// Dành cho Partner: Đăng ký quán cafe mới (Mặc định status: pending chờ duyệt)
const createVenue = catchAsync(async (req, res) => {
  const payload = pickEditableFields(req.body);
  if (payload.address && (!payload.district || payload.district === 'Quận 10')) {
    payload.district = extractDistrict(payload.address, payload.district);
  }

  const venueData = {
    ...payload,
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

  const payload = pickEditableFields(req.body);
  if (payload.address && (!payload.district || payload.district === 'Quận 10')) {
    payload.district = extractDistrict(payload.address, payload.district);
  }

  // Cập nhật
  const updated = await Venue.findByIdAndUpdate(req.params.id, payload, {
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
    data: sanitizeVenueDistricts(venues),
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

// ─── MÃ QR CHECK-IN DÁN TẠI QUÁN ─────────────────────────────────────────────

const findVenueForQr = async (req) => {
  const venue = await Venue.findById(req.params.id).select('+checkinSecret name partnerId');
  if (!venue) throw new ApiError(404, 'Không tìm thấy địa điểm');
  if (req.user.role !== 'admin' && venue.partnerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Bạn không sở hữu địa điểm này');
  }
  return venue;
};

const toQrResponse = (venue) => {
  const qrContent = buildQrContent(venue._id.toString(), venue.checkinSecret);
  return {
    venueId: venue._id,
    venueName: venue.name,
    qrContent,
    // Ảnh QR khổ lớn để in dán tại quầy / bàn
    qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrContent)}`,
  };
};

/** GET /api/venues/:id/checkin-qr — Partner/Admin lấy mã QR check-in để in (tự tạo nếu chưa có) */
const getCheckinQr = catchAsync(async (req, res) => {
  const venue = await findVenueForQr(req);
  if (!venue.checkinSecret) {
    venue.checkinSecret = generateSecret();
    await venue.save({ validateBeforeSave: false });
  }
  res.status(200).json({ success: true, data: toQrResponse(venue) });
});

/** POST /api/venues/:id/checkin-qr/regenerate — tạo mã mới khi ảnh QR cũ bị lộ, QR cũ hết hiệu lực ngay */
const regenerateCheckinQr = catchAsync(async (req, res) => {
  const venue = await findVenueForQr(req);
  venue.checkinSecret = generateSecret();
  await venue.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
    message: 'Đã tạo mã QR mới. Vui lòng in lại và thay mã cũ tại quán.',
    data: toQrResponse(venue),
  });
});

module.exports = {
  getCheckinQr,
  regenerateCheckinQr,
  getVenues,
  getVenueById,
  getMyVenues,
  uploadVenueImages,
  createVenue,
  updateVenue,
  getAllVenuesAdmin,
  updateVenueStatus,
};
