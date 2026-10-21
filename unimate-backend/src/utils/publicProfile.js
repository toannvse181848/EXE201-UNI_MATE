const { isPremiumActive } = require('./subscription');

// Hồ sơ công khai = những gì người dùng khác được thấy (trang Quyền riêng tư, mục 3: tên, trường, sở thích, ảnh...).
// Không trả MSSV, email, số điện thoại, số coin, điểm tín nhiệm, hạn Premium... của người khác.
const PUBLIC_PROFILE_FIELDS = ['university', 'major', 'year', 'bio', 'interests', 'objectives', 'studyHabits'];

// Câu giới thiệu mẫu mà tài khoản cũ được gán sẵn khi đăng ký — không phải người dùng tự viết
const LEGACY_DEFAULT_BIO = 'Tìm bạn cùng học bài & khám phá quán cafe yên tĩnh 🚀';
const publicBio = (bio) => (bio && bio !== LEGACY_DEFAULT_BIO ? bio : '');

const toPublicStudentProfile = (profile = {}) => {
  const isPremium = isPremiumActive(profile);
  const out = { isPremium, isVerifiedStudent: Boolean(isPremium || profile.isVerifiedStudent) };
  PUBLIC_PROFILE_FIELDS.forEach((field) => {
    if (profile[field] !== undefined) out[field] = profile[field];
  });
  out.bio = publicBio(profile.bio);
  return out;
};

/** User (document hoặc object thường) → thông tin công khai cho người dùng khác xem */
const toPublicStudent = (user) => {
  if (!user) return user;
  const obj = user.toObject ? user.toObject() : user;
  const studentProfile = toPublicStudentProfile(obj.studentProfile || {});
  return {
    _id: obj._id,
    fullName: obj.fullName,
    avatar: obj.avatar,
    studentProfile,
    isPremium: studentProfile.isPremium,
    isVerifiedStudent: studentProfile.isVerifiedStudent,
  };
};

module.exports = { toPublicStudent, toPublicStudentProfile, publicBio };
