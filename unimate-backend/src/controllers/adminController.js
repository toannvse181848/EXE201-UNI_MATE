const User = require('../models/User');
const Venue = require('../models/Venue');
const Voucher = require('../models/Voucher');
const UserVoucher = require('../models/UserVoucher');
const Redemption = require('../models/Redemption');
const Match = require('../models/Match');
const Report = require('../models/Report');
const catchAsync = require('../utils/catchAsync');

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

module.exports = { getStats };
