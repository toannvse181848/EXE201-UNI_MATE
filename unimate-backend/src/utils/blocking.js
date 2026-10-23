const Match = require('../models/Match');

/** Id những người đã chặn mình hoặc bị mình chặn (2 chiều) — không gợi ý cho nhau ở bất kỳ đâu */
const getBlockedUserIds = async (userId) => {
  const rows = await Match.find({
    status: 'blocked',
    $or: [{ user1: userId }, { user2: userId }],
  }).select('user1 user2');
  return rows.map((m) => (String(m.user1) === String(userId) ? m.user2 : m.user1));
};

module.exports = { getBlockedUserIds };
