const Match = require('../models/Match');

/** Đã huỷ kết bạn: hai bên từng thích nhau rồi một bên huỷ. Một bên bỏ qua từ đầu thì chưa từng là bạn nên không tính. */
const isUnmatched = (match) => match.status === 'passed' && match.user1Action === 'like' && match.user2Action === 'like';

/** Id những người không gợi ý cho nhau ở bất kỳ đâu: đã chặn nhau (2 chiều) hoặc đã huỷ kết bạn */
const getHiddenUserIds = async (userId) => {
  const rows = await Match.find({
    $and: [
      { $or: [{ user1: userId }, { user2: userId }] },
      { $or: [{ status: 'blocked' }, { status: 'passed', user1Action: 'like', user2Action: 'like' }] },
    ],
  }).select('user1 user2');
  return rows.map((m) => (String(m.user1) === String(userId) ? m.user2 : m.user1));
};

module.exports = { isUnmatched, getHiddenUserIds };
