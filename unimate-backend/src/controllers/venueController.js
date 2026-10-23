const Venue = require('../models/Venue');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { getUploadedFileUrl } = require('../config/cloudinary');
const { extractDistrict } = require('../utils/addressUtils');
const { escapeRegex } = require('../middlewares/security');
const { generateSecret, buildQrContent } = require('../utils/venueCheckin');
const { isPartnerPlanActive } = require('../utils/subscription');
const { findMeetupRewards, toRewardSummary } = require('../utils/meetupRewards');
const { composeVenueName } = require('../utils/venueNaming');
const { visibleVenueFilter, findVisibleVenue } = require('../utils/visibility');
const User = require('../models/User');
const Redemption = require('../models/Redemption');
const VenueCheckin = require('../models/VenueCheckin');
const Meetup = require('../models/Meetup');


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


// Chưa có chức năng đánh giá quán: không trả số sao mặc định (4.8) như thể là thật,
// và bỏ "tiện ích" mẫu (Wifi 95 Mbps, yên tĩnh 4.9/5...) mà đối tác không nhập được
const toPublicVenue = (obj) => {
  const out = { ...obj, rating: obj.reviewsCount > 0 ? obj.rating : null };
  delete out.amenities;
  return out;
};

// Lấy danh sách địa điểm đã duyệt (Dành cho Sinh viên / Public)
const getVenues = catchAsync(async (req, res) => {
  const { category, search, district } = req.query;
  const filter = {};

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


  // Chỉ quán đã duyệt và tài khoản quán không bị khoá (utils/visibility.js)
  const venues = await Venue.find(await visibleVenueFilter(filter))
    // API công khai: không trả email / số điện thoại của chủ tài khoản (admin xem ở /admin/all)
    .populate('partnerId', 'fullName partnerProfile.planExpiresAt')
    .sort({ rating: -1, createdAt: -1 });

  // Ưu đãi hẹn cafe đang chạy của từng quán: hiện trong khung "Rủ cafe" để sinh viên chọn quán
  const meetupRewards = await findMeetupRewards(venues.map((v) => v._id));
  const data = sanitizeVenueDistricts(venues).map((venue) => {
    const isFeatured = isPartnerPlanActive(venue.partnerId?.partnerProfile);
    if (venue.partnerId) delete venue.partnerId.partnerProfile;
    return { ...toPublicVenue(venue), isFeatured, meetupReward: toRewardSummary(meetupRewards.get(String(venue._id))) };
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
  // Quán chưa duyệt / bị từ chối / tài khoản quán bị khoá thì sinh viên không xem được
  const visible = await findVisibleVenue(req.params.id);
  const venue = visible ? await visible.populate('partnerId', 'fullName') : null;
  if (!venue) {
    throw new ApiError(404, 'Không tìm thấy địa điểm');
  }
  // Đếm lượt xem cho trang hiệu quả của quán (không chờ)
  Venue.updateOne({ _id: venue._id }, { $inc: { viewCount: 1 } }).catch(() => {});

  const obj = toPublicVenue(venue.toObject());
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

/**
 * Tên quán đối tác lưu = "Tên thương hiệu - Tên chi nhánh" để các chi nhánh luôn đồng bộ với thương hiệu.
 * - Client mới gửi branchName (có thể rỗng nếu quán chỉ có 1 cơ sở).
 * - Client cũ gửi name: tên chưa bắt đầu bằng thương hiệu thì coi là tên chi nhánh.
 * Admin sửa quán thì giữ nguyên tên admin nhập.
 */
const applyBranchNaming = (payload, body, user) => {
  if (user.role === 'admin') return payload;
  const brand = String(user.partnerProfile?.businessName || user.fullName || '').trim();
  let branch;
  if (body.branchName !== undefined) {
    branch = String(body.branchName || '').trim().slice(0, 80);
  } else if (payload.name !== undefined) {
    const name = String(payload.name || '').trim();
    if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) return payload;
    branch = name.slice(0, 80);
  } else {
    return payload;
  }
  if (!brand && !branch) throw new ApiError(400, 'Vui lòng nhập tên quán');
  return { ...payload, branchName: branch, name: composeVenueName(brand, branch) };
};

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
  // Quán chưa gửi tên gì thì mặc định là tên thương hiệu (quán 1 cơ sở)
  const body = req.body.branchName === undefined && !req.body.name ? { ...req.body, branchName: '' } : req.body;
  const payload = applyBranchNaming(pickEditableFields(body), body, req.user);
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

  const payload = applyBranchNaming(pickEditableFields(req.body), req.body, req.user);
  if (payload.address && (!payload.district || payload.district === 'Quận 10')) {
    payload.district = extractDistrict(payload.address, payload.district);
  }

  // Đổi tên hoặc địa chỉ của quán đã duyệt = thành quán khác → admin phải duyệt lại
  // (sửa mô tả, ảnh, giờ mở cửa, giá... thì không cần)
  let needsReview = false;
  if (req.user.role !== 'admin' && venue.status === 'approved') {
    const nameChanged = payload.name !== undefined && String(payload.name).trim() !== venue.name;
    const addressChanged = payload.address !== undefined && String(payload.address).trim() !== venue.address;
    if (nameChanged || addressChanged) {
      payload.status = 'pending';
      payload.rejectionReason = null;
      needsReview = true;
    }
  }

  // Cập nhật
  const updated = await Venue.findByIdAndUpdate(req.params.id, payload, {
    returnDocument: 'after',
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: needsReview
      ? 'Đã lưu. Quán đổi tên hoặc địa chỉ nên cần admin duyệt lại trước khi hiện cho sinh viên.'
      : 'Cập nhật địa điểm thành công',
    needsReview,
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
    { returnDocument: 'after' }
  );

  if (!venue) {
    throw new ApiError(404, 'Không tìm thấy địa điểm');
  }

  // Duyệt quán đầu tiên = duyệt luôn tài khoản quán (không đụng tới tài khoản đang bị khoá)
  if (status === 'approved') {
    await User.updateOne({ _id: venue.partnerId, role: 'partner', status: 'pending' }, { status: 'active' });
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

/**
 * GET /api/venues/my/insights?days=30 — hiệu quả UNI-MATE mang lại cho quán (lý do gia hạn Gói Đối tác):
 * sinh viên tới quán (quét ví + check-in), buổi hẹn cafe, lượt xem trang quán; tổng và theo từng chi nhánh.
 */
const getPartnerInsights = catchAsync(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const partnerId = req.user._id;

  const venues = await Venue.find({ partnerId }).select('name status viewCount');
  const venueIds = venues.map((v) => v._id);

  const byVenue = (rows) => new Map(rows.map((r) => [String(r._id), r]));
  const [redeemRows, checkinRows, meetupRows, studentsFromRedeem, studentsFromCheckin] = await Promise.all([
    Redemption.aggregate([
      { $match: { partnerId, createdAt: { $gte: since } } },
      { $group: { _id: '$venueId', total: { $sum: 1 }, viaWallet: { $sum: { $cond: [{ $eq: ['$method', 'qr'] }, 1, 0] } } } },
    ]),
    VenueCheckin.aggregate([
      { $match: { partnerId, createdAt: { $gte: since } } },
      { $group: { _id: '$venueId', total: { $sum: 1 } } },
    ]),
    Meetup.aggregate([
      { $match: { venueId: { $in: venueIds }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$venueId',
          invited: { $sum: 1 },
          agreed: { $sum: { $cond: [{ $in: ['$status', ['accepted', 'completed', 'no_show']] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
    ]),
    Redemption.distinct('userId', { partnerId, userId: { $ne: null }, createdAt: { $gte: since } }),
    VenueCheckin.distinct('userId', { partnerId, createdAt: { $gte: since } }),
  ]);

  const redeemMap = byVenue(redeemRows);
  const checkinMap = byVenue(checkinRows);
  const meetupMap = byVenue(meetupRows);

  const perVenue = venues.map((v) => {
    const key = String(v._id);
    const m = meetupMap.get(key) || {};
    return {
      venueId: v._id,
      name: v.name,
      status: v.status,
      views: v.viewCount || 0,
      redemptions: redeemMap.get(key)?.total || 0,
      checkins: checkinMap.get(key)?.total || 0,
      meetupsInvited: m.invited || 0,
      meetupsAgreed: m.agreed || 0,
      meetupsCompleted: m.completed || 0,
    };
  });

  const sum = (key) => perVenue.reduce((acc, v) => acc + v[key], 0);
  const uniqueStudents = new Set([...studentsFromRedeem, ...studentsFromCheckin].map(String)).size;

  res.status(200).json({
    success: true,
    data: {
      days,
      totals: {
        uniqueStudents,
        redemptions: sum('redemptions'),
        walletRedemptions: redeemRows.reduce((acc, r) => acc + r.viaWallet, 0),
        checkins: sum('checkins'),
        meetupsInvited: sum('meetupsInvited'),
        meetupsAgreed: sum('meetupsAgreed'),
        meetupsCompleted: sum('meetupsCompleted'),
        // Lượt xem tính từ khi có tính năng đếm, không lọc theo số ngày
        views: sum('views'),
      },
      perVenue,
    },
  });
});

module.exports = {
  getPartnerInsights,
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
