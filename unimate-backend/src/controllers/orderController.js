const Order = require('../models/Order');
const Counter = require('../models/Counter');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { PLANS, getPlan, resolvePlanId } = require('../config/plans');
const { activatePlan, canBuyPlan } = require('../utils/subscription');
const {
  maskEmail,
  maskName,
  formatDateTime,
  buildWorkbook,
  sendXlsx,
  datedFilename,
} = require('../utils/excelExport');

/**
 * Luồng thu phí:
 * 1. Người mua chọn gói → POST /api/orders tạo đơn "pending" với mã UM000123
 * 2. Frontend hiện mã VietQR (số tiền + nội dung chuyển khoản = mã đơn)
 * 3. Người mua chuyển khoản bằng app ngân hàng
 * 4. Admin thấy tiền về → PATCH /api/orders/admin/:code/confirm → kích hoạt gói
 */

const PENDING_REUSE_MS = 24 * 60 * 60 * 1000;

const STATUS_LABEL = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  cancelled: 'Đã huỷ',
};

/** Thông tin chuyển khoản + link ảnh VietQR, lấy từ biến môi trường */
const buildPaymentInfo = (order) => {
  const bankId = process.env.BANK_ID; // mã ngân hàng VietQR, VD: MB, VCB, TCB hoặc mã BIN
  const accountNo = process.env.BANK_ACCOUNT_NO;
  const accountName = process.env.BANK_ACCOUNT_NAME || '';

  if (!bankId || !accountNo) {
    return {
      configured: false,
      message: 'Chưa cấu hình tài khoản nhận tiền (BANK_ID, BANK_ACCOUNT_NO)',
      amount: order.amount,
      transferContent: order.code,
    };
  }

  const params = new URLSearchParams({
    amount: String(order.amount),
    addInfo: order.code,
    accountName,
  });

  return {
    configured: true,
    bankId,
    accountNo,
    accountName,
    amount: order.amount,
    transferContent: order.code,
    qrImageUrl: `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-compact2.png?${params}`,
  };
};

const toOrderJSON = (order) => {
  const obj = order.toObject ? order.toObject() : order;
  return { ...obj, statusLabel: STATUS_LABEL[obj.status] };
};

const findOwnOrder = async (req) => {
  const order = await Order.findOne({ code: String(req.params.code).toUpperCase() });
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng');
  const isOwner = order.userId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') throw new ApiError(403, 'Bạn không có quyền xem đơn hàng này');
  return order;
};

// ─── NGƯỜI MUA ───────────────────────────────────────────────────────────────

/** GET /api/orders/plans — danh sách gói và giá */
const getPlans = catchAsync(async (req, res) => {
  const data = Object.entries(PLANS).map(([id, p]) => ({ id, ...p }));
  res.status(200).json({ success: true, data });
});

/** POST /api/orders — tạo đơn mua gói { plan } */
const createOrder = catchAsync(async (req, res) => {
  const planId = resolvePlanId(req.body.plan);
  const plan = getPlan(planId);
  if (!plan) throw new ApiError(400, `Gói không hợp lệ. Các gói hiện có: ${Object.keys(PLANS).join(', ')}`);
  if (!canBuyPlan(req.user, planId)) throw new ApiError(403, 'Loại tài khoản của bạn không mua được gói này');

  // Bấm "mua" nhiều lần thì dùng lại đơn đang chờ, tránh rác đơn
  const existing = await Order.findOne({
    userId: req.user._id,
    plan: planId,
    status: 'pending',
    createdAt: { $gte: new Date(Date.now() - PENDING_REUSE_MS) },
  });
  if (existing) {
    return res.status(200).json({
      success: true,
      message: 'Bạn đang có đơn chờ thanh toán cho gói này',
      data: { order: toOrderJSON(existing), payment: buildPaymentInfo(existing) },
    });
  }

  const seq = await Counter.next('order');
  const order = await Order.create({
    code: `UM${String(seq).padStart(6, '0')}`,
    userId: req.user._id,
    plan: planId,
    planName: plan.name,
    amount: plan.amount,
    durationDays: plan.durationDays,
  });

  res.status(201).json({
    success: true,
    message: 'Đã tạo đơn hàng. Vui lòng chuyển khoản đúng số tiền và nội dung.',
    data: { order: toOrderJSON(order), payment: buildPaymentInfo(order) },
  });
});

/** GET /api/orders/my — đơn hàng của tôi */
const getMyOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.status(200).json({ success: true, count: orders.length, data: orders.map(toOrderJSON) });
});

/** GET /api/orders/:code — chi tiết đơn (frontend gọi định kỳ để biết đã thanh toán chưa) */
const getOrder = catchAsync(async (req, res) => {
  const order = await findOwnOrder(req);
  res.status(200).json({
    success: true,
    data: {
      order: toOrderJSON(order),
      payment: order.status === 'pending' ? buildPaymentInfo(order) : null,
    },
  });
});

/** POST /api/orders/:code/cancel — người mua huỷ đơn chưa thanh toán */
const cancelMyOrder = catchAsync(async (req, res) => {
  const order = await findOwnOrder(req);
  if (order.status !== 'pending') throw new ApiError(400, 'Chỉ huỷ được đơn đang chờ thanh toán');
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  await order.save();
  res.status(200).json({ success: true, message: 'Đã huỷ đơn hàng', data: toOrderJSON(order) });
});

// ─── ADMIN ───────────────────────────────────────────────────────────────────

/** GET /api/orders/admin/all?status=pending — danh sách đơn */
const getAllOrders = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status && STATUS_LABEL[req.query.status]) filter.status = req.query.status;
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);

  const [orders, summary] = await Promise.all([
    Order.find(filter).populate('userId', 'fullName email role').sort({ createdAt: -1 }).limit(limit),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
  ]);

  const stats = Object.fromEntries(summary.map((s) => [s._id, { count: s.count, total: s.total }]));

  res.status(200).json({
    success: true,
    count: orders.length,
    stats: {
      pending: stats.pending || { count: 0, total: 0 },
      paid: stats.paid || { count: 0, total: 0 },
      cancelled: stats.cancelled || { count: 0, total: 0 },
    },
    data: orders.map(toOrderJSON),
  });
});

/** PATCH /api/orders/admin/:code/confirm — xác nhận đã nhận tiền, kích hoạt gói { note } */
const confirmOrder = catchAsync(async (req, res) => {
  const code = String(req.params.code).toUpperCase();

  // Cập nhật có điều kiện để bấm xác nhận 2 lần không kích hoạt gói 2 lần
  const order = await Order.findOneAndUpdate(
    { code, status: 'pending' },
    {
      status: 'paid',
      paidAt: new Date(),
      confirmedBy: req.user._id,
      note: typeof req.body.note === 'string' ? req.body.note.trim() : '',
    },
    { returnDocument: 'after' }
  );

  if (!order) {
    const exists = await Order.findOne({ code });
    if (!exists) throw new ApiError(404, 'Không tìm thấy đơn hàng');
    throw new ApiError(400, `Đơn hàng đang ở trạng thái "${STATUS_LABEL[exists.status]}", không xác nhận được`);
  }

  const buyer = await User.findById(order.userId);
  if (!buyer) throw new ApiError(404, 'Người mua không còn tồn tại');
  const expiresAt = activatePlan(buyer, order.plan, order.durationDays);
  await buyer.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `Đã xác nhận thanh toán ${order.code}. Gói có hiệu lực đến ${formatDateTime(expiresAt)}`,
    data: { order: toOrderJSON(order), user: buyer.toPublicJSON() },
  });
});

/** PATCH /api/orders/admin/:code/cancel — admin huỷ đơn (VD: không nhận được tiền) */
const adminCancelOrder = catchAsync(async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { code: String(req.params.code).toUpperCase(), status: 'pending' },
    { status: 'cancelled', cancelledAt: new Date(), note: typeof req.body.note === 'string' ? req.body.note.trim() : '' },
    { returnDocument: 'after' }
  );
  if (!order) throw new ApiError(400, 'Không tìm thấy đơn đang chờ thanh toán với mã này');
  res.status(200).json({ success: true, message: 'Đã huỷ đơn hàng', data: toOrderJSON(order) });
});

/** GET /api/orders/admin/export?status=paid — xuất Excel minh chứng giao dịch */
const exportOrders = catchAsync(async (req, res) => {
  const status = req.query.status === 'all' ? null : (req.query.status || 'paid');
  const filter = status && STATUS_LABEL[status] ? { status } : {};

  const orders = await Order.find(filter).populate('userId', 'fullName email role').sort({ createdAt: 1 });

  const rows = orders.map((o, i) => ({
    stt: i + 1,
    code: o.code,
    buyer: maskName(o.userId?.fullName),
    email: maskEmail(o.userId?.email),
    role: o.userId?.role === 'partner' ? 'Đối tác' : 'Sinh viên',
    plan: o.planName,
    amount: o.amount,
    createdAt: formatDateTime(o.createdAt),
    paidAt: formatDateTime(o.paidAt),
    status: STATUS_LABEL[o.status],
    note: o.note,
  }));

  const buffer = buildWorkbook('Don_hang', [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Mã đơn (nội dung CK)', key: 'code', width: 20 },
    { header: 'Người mua', key: 'buyer', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Loại tài khoản', key: 'role', width: 14 },
    { header: 'Gói', key: 'plan', width: 26 },
    { header: 'Số tiền (VNĐ)', key: 'amount', width: 14 },
    { header: 'Thời gian tạo đơn', key: 'createdAt', width: 20 },
    { header: 'Thời gian thanh toán', key: 'paidAt', width: 20 },
    { header: 'Trạng thái', key: 'status', width: 16 },
    { header: 'Ghi chú', key: 'note', width: 30 },
  ], rows);

  sendXlsx(res, buffer, datedFilename('unimate_don_hang'));
});

module.exports = {
  getPlans,
  createOrder,
  getMyOrders,
  getOrder,
  cancelMyOrder,
  getAllOrders,
  confirmOrder,
  adminCancelOrder,
  exportOrders,
};
