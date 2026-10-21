const User = require('../models/User');
const Venue = require('../models/Venue');

/**
 * Luật "sinh viên thấy được quán nào" — dùng chung cho danh sách quán, voucher, rủ cafe,
 * thẻ quán trong chat, check-in. Sinh viên chỉ thấy quán:
 *   - đã được admin duyệt, và
 *   - tài khoản quán không bị khoá.
 */
const getSuspendedPartnerIds = () => User.find({ role: 'partner', status: 'suspended' }).distinct('_id');

const visibleVenueFilter = async (extra = {}) => ({
  ...extra,
  status: 'approved',
  partnerId: { $nin: await getSuspendedPartnerIds() },
});

const isVenueVisible = async (venueId) => {
  if (!venueId) return false;
  try {
    return Boolean(await Venue.exists(await visibleVenueFilter({ _id: venueId })));
  } catch {
    return false; // venueId sai định dạng
  }
};

const findVisibleVenue = async (venueId, select) => {
  if (!venueId) return null;
  try {
    const query = Venue.findOne(await visibleVenueFilter({ _id: venueId }));
    return select ? await query.select(select) : await query;
  } catch {
    return null;
  }
};

module.exports = { getSuspendedPartnerIds, visibleVenueFilter, isVenueVisible, findVisibleVenue };
