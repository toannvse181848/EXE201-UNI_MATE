const User = require('../models/User');

const PER_GROUP = 100;

/**
 * Ứng viên để chấm điểm hợp gu, dùng chung cho app (quẹt thẻ) và web (Khám phá).
 * Lấy 2 nhóm rồi mới xếp hạng: cùng trường trước, phần còn lại theo người hoạt động gần đây.
 * Trước đây web lấy 100 người đầu theo thứ tự trong database, nên khi đông người thì người đăng ký sau không bao giờ được gợi ý.
 * @param excludeIds  id không lấy (bản thân, đã chặn, đã quẹt...)
 */
const findMatchCandidates = async (me, excludeIds, select = 'fullName avatar studentProfile lastActiveAt') => {
  const baseFilter = {
    _id: { $nin: excludeIds.map(String) },
    role: { $in: ['student', 'user'] },
    status: 'active',
  };
  const myUniversity = me?.studentProfile?.university;
  const sameSchool = myUniversity
    ? await User.find({ ...baseFilter, 'studentProfile.university': myUniversity })
        .select(select)
        .sort({ lastActiveAt: -1 })
        .limit(PER_GROUP)
    : [];
  const others = await User.find({
    ...baseFilter,
    _id: { $nin: [...excludeIds.map(String), ...sameSchool.map((u) => String(u._id))] },
  })
    .select(select)
    .sort({ lastActiveAt: -1 })
    .limit(PER_GROUP);
  return [...sameSchool, ...others];
};

module.exports = { findMatchCandidates };
