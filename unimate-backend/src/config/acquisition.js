/**
 * Kênh thu hút người dùng — dùng chung cho câu hỏi "Bạn biết UNI-MATE qua đâu?" lúc đăng ký,
 * mã UTM trên link truyền thông và báo cáo OC2/OC3 (so sánh kênh, chi phí cho mỗi khách).
 */
const CHANNELS = {
  facebook: 'Facebook (fanpage, group)',
  tiktok: 'TikTok',
  friend: 'Bạn bè giới thiệu',
  campus: 'CLB / sự kiện tại trường',
  cafe: 'Quán cafe đối tác',
  team_direct: 'Nhóm UNI-MATE gặp trực tiếp',
  other: 'Khác',
  unknown: 'Chưa rõ',
};

// Giá trị utm_source / tên miền giới thiệu → kênh
const SOURCE_ALIASES = [
  [/facebook|^fb$|fb\.|messenger|instagram|^ig$/i, 'facebook'],
  [/tiktok/i, 'tiktok'],
  [/clb|club|campus|event|su[-_]?kien/i, 'campus'],
  [/cafe|coffee|quan/i, 'cafe'],
  [/friend|ban[-_]?be|referral|gioi[-_]?thieu/i, 'friend'],
  [/team|direct|truc[-_]?tiep/i, 'team_direct'],
];

const matchAlias = (value) => {
  if (!value) return null;
  const found = SOURCE_ALIASES.find(([pattern]) => pattern.test(value));
  return found ? found[1] : null;
};

/**
 * Kênh của một người dùng, ưu tiên dữ liệu khách quan:
 * mã UTM trên link → trang web giới thiệu (referrer) → người dùng tự chọn → Chưa rõ
 * (người đăng ký trước khi có tính năng ghi nguồn sẽ là "Chưa rõ").
 */
const resolveChannel = (acquisition = {}) => {
  let referrerHost = '';
  try {
    referrerHost = acquisition.referrer ? new URL(acquisition.referrer).hostname : '';
  } catch {
    referrerHost = '';
  }
  return (
    matchAlias(acquisition.utmSource) ||
    matchAlias(referrerHost) ||
    (CHANNELS[acquisition.heardFrom] && acquisition.heardFrom !== 'unknown' ? acquisition.heardFrom : null) ||
    'unknown'
  );
};

const TEXT_LIMIT = 120;
const cleanText = (value) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, TEXT_LIMIT) : null);

/**
 * Lấy thông tin nguồn từ body đăng ký. Web gửi { acquisition: { utmSource, ..., heardFrom } },
 * app mobile gửi { heardFrom } ở cấp ngoài cùng.
 */
const parseAcquisition = (body = {}) => {
  const raw = body.acquisition && typeof body.acquisition === 'object' ? body.acquisition : {};
  const heardFrom = raw.heardFrom || body.heardFrom;
  return {
    heardFrom: CHANNELS[heardFrom] && heardFrom !== 'unknown' ? heardFrom : null,
    utmSource: cleanText(raw.utmSource),
    utmMedium: cleanText(raw.utmMedium),
    utmCampaign: cleanText(raw.utmCampaign),
    utmContent: cleanText(raw.utmContent),
    referrer: cleanText(raw.referrer),
    landingPath: cleanText(raw.landingPath),
  };
};

module.exports = { CHANNELS, resolveChannel, parseAcquisition };
