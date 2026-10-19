const User = require('../models/User');
const Venue = require('../models/Venue');
const Voucher = require('../models/Voucher');
const UserVoucher = require('../models/UserVoucher');
const Redemption = require('../models/Redemption');
const Match = require('../models/Match');
const Report = require('../models/Report');
const Setting = require('../models/Setting');
const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const { computeOc3Metrics, parseEmailList } = require('../utils/oc3Metrics');
const { buildOc3Tables, tablesToXlsx } = require('../utils/oc3Report');
const { sendXlsx, datedFilename } = require('../utils/excelExport');
const { CHANNELS } = require('../config/acquisition');

const OC3_SETTING_KEY = 'oc3';

// GET /api/admin/stats — số liệu tổng quan cho dashboard admin
const getStats = catchAsync(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const studentRoles = { $in: ['student', 'user'] };

  const [
    partnersTotal,
    partnersPending,
    venuesTotal,
    venuesApproved,
    venuesPending,
    venuesRejected,
    venuesNewThisMonth,
    studentsTotal,
    studentsActive,
    studentsNewThisMonth,
    matchesTotal,
    matchesThisMonth,
    vouchersTotal,
    vouchersActive,
    vouchersClaimed,
    redemptionsTotal,
    redemptionsThisMonth,
    reportsPending,
  ] = await Promise.all([
    User.countDocuments({ role: 'partner' }),
    User.countDocuments({ role: 'partner', status: 'pending' }),
    Venue.countDocuments(),
    Venue.countDocuments({ status: 'approved' }),
    Venue.countDocuments({ status: 'pending' }),
    Venue.countDocuments({ status: 'rejected' }),
    Venue.countDocuments({ createdAt: { $gte: startOfMonth } }),
    User.countDocuments({ role: studentRoles }),
    User.countDocuments({ role: studentRoles, lastActiveAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ role: studentRoles, createdAt: { $gte: startOfMonth } }),
    Match.countDocuments({ status: 'matched' }),
    Match.countDocuments({ status: 'matched', matchedAt: { $gte: startOfMonth } }),
    Voucher.countDocuments(),
    Voucher.countDocuments({ isActive: true, validUntil: { $gte: now } }),
    UserVoucher.countDocuments(),
    Redemption.countDocuments(),
    Redemption.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Report.countDocuments({ status: 'pending' }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      partners: { total: partnersTotal, pending: partnersPending },
      venues: {
        total: venuesTotal,
        approved: venuesApproved,
        pending: venuesPending,
        rejected: venuesRejected,
        newThisMonth: venuesNewThisMonth,
      },
      students: {
        total: studentsTotal,
        activeLast30Days: studentsActive,
        newThisMonth: studentsNewThisMonth,
      },
      matches: { total: matchesTotal, thisMonth: matchesThisMonth },
      vouchers: {
        total: vouchersTotal,
        active: vouchersActive,
        claimed: vouchersClaimed,
        redeemed: redemptionsTotal,
        redeemedThisMonth: redemptionsThisMonth,
      },
      reports: { pending: reportsPending },
    },
  });
});

// ─── SỐ LIỆU BÁO CÁO OC3 ─────────────────────────────────────────────────────

/**
 * Email thành viên nhóm / tài khoản test cần loại khỏi số liệu lấy từ biến môi trường
 * OC3_EXCLUDE_EMAILS (cách nhau bởi dấu phẩy) để không lưu email thật trong code.
 */
const loadOc3Metrics = async () => {
  const setting = await Setting.findOne({ key: OC3_SETTING_KEY }).lean();
  return computeOc3Metrics(mongoose.connection.db, {
    excludedEmails: parseEmailList(process.env.OC3_EXCLUDE_EMAILS),
    inputs: setting?.value || {},
  });
};

// GET /api/admin/oc3 — bảng số liệu tổng hợp (không kèm danh sách từng người dùng / đơn hàng)
const getOc3Dashboard = catchAsync(async (req, res) => {
  const metrics = await loadOc3Metrics();
  delete metrics.users;
  delete metrics.orders;
  res.status(200).json({
    success: true,
    data: { ...metrics, excludeListConfigured: parseEmailList(process.env.OC3_EXCLUDE_EMAILS).length > 0 },
  });
});

// GET /api/admin/oc3/export — file Excel nhiều sheet (email đã che) làm minh chứng OC3
const exportOc3Dashboard = catchAsync(async (req, res) => {
  const metrics = await loadOc3Metrics();
  sendXlsx(res, tablesToXlsx(buildOc3Tables(metrics)), datedFilename('unimate_so_lieu_oc3'));
});

// GET /api/admin/oc3/settings — chi phí, lượt tiếp cận, lượt nhấp từng kênh (nhập tay từ Insights)
const getOc3Settings = catchAsync(async (req, res) => {
  const setting = await Setting.findOne({ key: OC3_SETTING_KEY }).lean();
  res.status(200).json({
    success: true,
    data: {
      channels: Object.entries(CHANNELS).map(([key, label]) => ({ key, label, ...setting?.value?.channels?.[key] })),
      otherCost: setting?.value?.otherCost || 0,
      updatedAt: setting?.updatedAt || null,
    },
  });
});

// PUT /api/admin/oc3/settings { channels: { facebook: { cost, reach, clicks } }, otherCost }
const updateOc3Settings = catchAsync(async (req, res) => {
  const toNumber = (value) => Math.max(0, Math.round(Number(value) || 0));
  const channels = {};
  for (const key of Object.keys(CHANNELS)) {
    const input = req.body?.channels?.[key] || {};
    channels[key] = { cost: toNumber(input.cost), reach: toNumber(input.reach), clicks: toNumber(input.clicks) };
  }
  const value = { channels, otherCost: toNumber(req.body?.otherCost) };
  await Setting.findOneAndUpdate(
    { key: OC3_SETTING_KEY },
    { value, updatedBy: req.user._id },
    { upsert: true, returnDocument: 'after' }
  );
  res.status(200).json({ success: true, message: 'Đã lưu số liệu theo kênh', data: value });
});

module.exports = { getStats, getOc3Dashboard, exportOc3Dashboard, getOc3Settings, updateOc3Settings };
