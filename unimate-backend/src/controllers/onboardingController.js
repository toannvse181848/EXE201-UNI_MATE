const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

// =============================================================
// 1. POST /api/onboarding/preferences
//    Lưu sở thích cá nhân sau khi đăng ký (Bước Onboarding)
// =============================================================
const savePreferences = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const {
    objectives,    // ['study_buddy', 'project', ...]
    interests,     // ['coding', 'cafe', 'ielts', ...]
    studyHabits,   // { timeSlots: ['morning', 'evening'], spaceType: 'quiet' }
    distancePreference, // số km (3 | 5 | 10)
    bio,
  } = req.body;

  if (!objectives || !Array.isArray(objectives) || objectives.length === 0) {
    throw new ApiError(400, 'Vui lòng chọn ít nhất 1 mục tiêu kết nối');
  }
  if (!interests || !Array.isArray(interests) || interests.length < 3) {
    throw new ApiError(400, 'Vui lòng chọn ít nhất 3 sở thích để tính điểm ghép đôi');
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Người dùng không tồn tại');

  // Merge vào studentProfile
  user.studentProfile = {
    ...user.studentProfile?.toObject?.() ?? user.studentProfile ?? {},
    objectives,
    interests,
    studyHabits: {
      timeSlots: studyHabits?.timeSlots || [],
      spaceType: studyHabits?.spaceType || 'any',
    },
    distancePreference: distancePreference || 5,
    onboardingCompleted: true,
    ...(bio ? { bio } : {}),
  };
  user.isProfileCompleted = true;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Đã lưu thông tin sở thích thành công!',
    data: user.toPublicJSON(),
  });
});

// =============================================================
// 2. GET /api/onboarding/recommendations
//    Thuật toán Weighted Hybrid Matching — tính điểm tương đồng
// =============================================================

const { getHiddenUserIds } = require('../utils/blocking');
const { saveLocationFromQuery } = require('../utils/userLocation');
const { computeMatchScore, commonInterests, sortByRank } = require('../utils/matchingAlgorithm');
const { isPremiumActive } = require('../utils/subscription');
const { publicBio } = require('../utils/publicProfile');
const { findMatchCandidates } = require('../utils/matchCandidates');


const getRecommendations = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;
  const me = await User.findById(currentUserId);
  if (!me) throw new ApiError(404, 'Người dùng không tồn tại');
  // Vị trí hiện tại (?lat=&lng=) để tính khoảng cách thật
  await saveLocationFromQuery(me, req.query);

  const limit = parseInt(req.query.limit, 10) || 20;

  // Cùng trường trước, rồi người hoạt động gần đây (giống app), không còn chỉ lấy 100 người đầu database
  const candidates = await findMatchCandidates(me, [currentUserId, ...(await getHiddenUserIds(currentUserId))]);

  // Tính điểm cho từng ứng viên
  const scored = candidates.map((them) => {
    // Premium hết hạn thì mất tích xanh và mất ưu tiên xếp hạng
    const isPremium = isPremiumActive(them.studentProfile);
    return {
      id: them._id,
      name: them.fullName,
      avatar: them.avatar,
      university: them.studentProfile?.university,
      major: them.studentProfile?.major,
      year: them.studentProfile?.year,
      bio: publicBio(them.studentProfile?.bio),
      objectives: them.studentProfile?.objectives || [],
      interests: them.studentProfile?.interests || [],
      studyHabits: them.studentProfile?.studyHabits,
      trustScore: them.studentProfile?.trustScore ?? 95,
      isPremium,
      isVerifiedStudent: Boolean(isPremium || them.studentProfile?.isVerifiedStudent),
      matchPercentage: computeMatchScore(me, them),
      commonTags: commonInterests(
        me.studentProfile?.interests || [],
        them.studentProfile?.interests || [],
      ),
    };
  });

  // Sắp xếp theo điểm xếp hạng (Premium được ưu tiên), lấy top limit
  sortByRank(scored);
  const top = scored.slice(0, limit);

  res.status(200).json({
    success: true,
    count: top.length,
    algorithm: 'Weighted Hybrid (Jaccard + Objective + Academic + Habit + Distance)',
    data: top,
  });
});

module.exports = { savePreferences, getRecommendations };
