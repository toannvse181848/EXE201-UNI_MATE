/**
 * Số liệu báo cáo OC3, tính trực tiếp từ database — CHỈ ĐỌC.
 * Dùng chung cho trang "Số liệu OC3" của admin và script scripts/oc3-stats.js
 * để hai nơi luôn ra cùng một con số. Định nghĩa từng chỉ số: docs/oc3-metrics.md.
 */
const { maskEmail } = require('./excelExport');
const { CHANNELS, resolveChannel } = require('../config/acquisition');
const { courseMinimum, oc2Plan } = require('../config/oc3Targets');

// Tài khoản mẫu do src/seed.js tạo ra — không phải người dùng thật
const SEED_EMAILS = [
  'admin@unimate.vn',
  'partner@thecoffeehouse.vn',
  'toan.nguyen@fpt.edu.vn',
  'linh.pham@uit.edu.vn',
  'nam.tran@ueh.edu.vn',
  'thao.le@hcmut.edu.vn',
];

const STUDENT_ROLES = ['student', 'user'];
const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const vnDay = (date) => new Date(new Date(date).getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
const addDays = (day, n) => new Date(Date.parse(day) + n * DAY_MS).toISOString().slice(0, 10);
// Ngày thứ Hai đầu tuần chứa `day`
const weekStart = (day) => addDays(day, -((new Date(day).getUTCDay() + 6) % 7));
const ratio = (part, whole) => (whole ? part / whole : null);

/**
 * Danh sách email loại khỏi số liệu (thành viên nhóm, tài khoản test).
 * Mỗi dòng một hoặc nhiều email cách nhau bởi dấu phẩy; dòng bắt đầu bằng # là ghi chú.
 */
const parseEmailList = (text = '') =>
  String(text)
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('#'))
    .flatMap((line) => line.split(/[\s,;]+/))
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes('@'));

const COLLECTIONS = [
  'users',
  'matches',
  'messages',
  'groupmessages',
  'uservouchers',
  'redemptions',
  'orders',
  'venues',
  'useractivities',
];

/**
 * @param db         mongoose.connection.db (đọc thẳng collection, không qua model)
 * @param options.excludedEmails  email loại khỏi số liệu, ngoài tài khoản admin và tài khoản mẫu
 * @param options.inputs          số liệu nhập tay theo kênh: { channels: { facebook: { cost, reach, clicks } }, otherCost }
 */
const computeOc3Metrics = async (db, { excludedEmails = [], inputs = {}, now = new Date() } = {}) => {
  const data = Object.fromEntries(
    await Promise.all(COLLECTIONS.map(async (name) => [name, await db.collection(name).find({}).toArray()]))
  );
  const today = vnDay(now);
  const excluded = new Set([...SEED_EMAILS, ...excludedEmails.map((e) => e.toLowerCase())]);

  // ─── Phân loại tài khoản ───────────────────────────────────────────────────
  const excludeReason = (u) => {
    const email = String(u.email || '').toLowerCase();
    if (u.role === 'admin') return 'admin';
    if (SEED_EMAILS.includes(email)) return 'tài khoản mẫu (seed)';
    if (excluded.has(email)) return 'thành viên nhóm / tài khoản test';
    return '';
  };

  const stats = new Map(); // userId → số liệu từng người
  for (const u of data.users) {
    stats.set(String(u._id), {
      user: u,
      excludeReason: excludeReason(u),
      channel: resolveChannel(u.acquisition || {}),
      likesSent: 0,
      matched: 0,
      messages: 0,
      vouchersClaimed: 0,
      vouchersRedeemed: 0,
      venueCheckins: 0,
      ordersCreated: 0,
      ordersPaid: 0,
      revenue: 0,
      firstPaidAt: null,
      activeDays: new Set(),
    });
  }
  const get = (id) => (id ? stats.get(String(id)) : undefined);
  const markActive = (id, date) => {
    const s = get(id);
    if (s && date) s.activeDays.add(vnDay(date));
  };

  // ─── Gom hành động của từng người ──────────────────────────────────────────
  for (const m of data.matches) {
    if (m.user1Action === 'like' && get(m.user1)) get(m.user1).likesSent += 1;
    markActive(m.user1, m.createdAt);
    if (m.user2Action && m.user2Action !== 'pending') {
      if (m.user2Action === 'like' && get(m.user2)) get(m.user2).likesSent += 1;
      markActive(m.user2, m.matchedAt || m.updatedAt);
    }
    if (m.status === 'matched') {
      if (get(m.user1)) get(m.user1).matched += 1;
      if (get(m.user2)) get(m.user2).matched += 1;
    }
  }
  for (const msg of [...data.messages, ...data.groupmessages]) {
    if (get(msg.sender)) get(msg.sender).messages += 1;
    markActive(msg.sender, msg.createdAt);
  }
  for (const uv of data.uservouchers) {
    const s = get(uv.userId);
    if (!s) continue;
    s.vouchersClaimed += 1;
    markActive(uv.userId, uv.claimedAt || uv.createdAt);
  }
  for (const r of data.redemptions) {
    // Mỗi lượt quán quét voucher trong ví sinh viên = 1 lần sinh viên dùng voucher tại quán.
    // Đếm theo lượt quét (không theo trạng thái voucher) vì ưu đãi hẹn cafe có thể được cấp lại nhiều lần.
    if (get(r.userId)) get(r.userId).vouchersRedeemed += 1;
    markActive(r.userId, r.createdAt);
  }
  for (const s of stats.values()) {
    for (const log of s.user.studentProfile?.coinLog || []) {
      if (log.type === 'venue_checkin') s.venueCheckins += 1;
      if (log.createdAt) s.activeDays.add(vnDay(log.createdAt));
    }
    if (s.user.lastActiveAt) s.activeDays.add(vnDay(s.user.lastActiveAt));
  }
  // Nhật ký ngày mở app (web + mobile), có từ khi bật tính năng ghi hoạt động
  for (const a of data.useractivities) {
    const s = get(a.userId);
    if (s) s.activeDays.add(a.day);
  }
  for (const o of data.orders) {
    const s = get(o.userId);
    if (!s) continue;
    s.ordersCreated += 1;
    markActive(o.userId, o.createdAt);
    if (o.status === 'paid') {
      s.ordersPaid += 1;
      s.revenue += o.amount;
      const paidAt = o.paidAt || o.updatedAt;
      if (!s.firstPaidAt || paidAt < s.firstPaidAt) s.firstPaidAt = paidAt;
    }
  }

  // ─── Nhóm người dùng ───────────────────────────────────────────────────────
  const real = [...stats.values()].filter((s) => !s.excludeReason);
  const realIds = new Set(real.map((s) => String(s.user._id)));
  const isStudent = (s) => STUDENT_ROLES.includes(s.user.role);
  const students = real.filter(isStudent);
  const partners = real.filter((s) => s.user.role === 'partner');

  const onboarded = (s) => Boolean(s.user.isProfileCompleted);
  const usedCoreFlow = (s) => s.likesSent + s.messages + s.vouchersClaimed + s.venueCheckins + s.ordersCreated > 0;
  const validStudents = students.filter(usedCoreFlow);
  // Định nghĩa "kích hoạt" trong slide OC2: hoàn thành onboarding + có 1 lần kết bạn hoặc lưu 1 voucher
  const activated = students.filter((s) => onboarded(s) && (s.matched > 0 || s.vouchersClaimed > 0));
  const redeemers = students.filter((s) => s.vouchersRedeemed > 0);

  const paidOrders = data.orders.filter((o) => o.status === 'paid' && realIds.has(String(o.userId)));
  const payers = real.filter((s) => s.ordersPaid > 0);
  const repeatBuyers = payers.filter((s) => s.ordersPaid > 1);
  const revenue = paidOrders.reduce((sum, o) => sum + o.amount, 0);
  const approvedPartnerIds = new Set(data.venues.filter((v) => v.status === 'approved').map((v) => String(v.partnerId)));
  const activePartners = partners.filter((s) => approvedPartnerIds.has(String(s.user._id)));

  // ─── Phễu chuyển đổi (sinh viên) ───────────────────────────────────────────
  // Theo con đường tạo doanh thu; mỗi bước chỉ đếm người đã qua mọi bước trước nên phễu luôn thu hẹp,
  // bước cuối đúng bằng số sinh viên trả phí. "Kích hoạt" (kết bạn / lưu voucher) báo cáo riêng.
  const funnelSteps = [
    ['Đăng ký tài khoản', () => true],
    ['Dùng tính năng chính (người dùng hợp lệ)', usedCoreFlow],
    ['Tạo đơn mua gói', (s) => s.ordersCreated > 0],
    ['Thanh toán (trả phí)', (s) => s.ordersPaid > 0],
  ];
  let remaining = students;
  const funnel = funnelSteps.map(([step, condition]) => {
    const before = remaining.length;
    remaining = remaining.filter(condition);
    return { step, count: remaining.length, previous: before };
  });
  // Bước mất nhiều người nhất (so với bước ngay trước)
  const biggestDrop = funnel
    .slice(1)
    .reduce((worst, s) => (s.previous - s.count > (worst ? worst.previous - worst.count : 0) ? s : worst), null);

  // ─── Tỷ lệ quay lại ────────────────────────────────────────────────────────
  const signupDay = (s) => vnDay(s.user.createdAt);
  const returnedOnDay = (n) => {
    const cohort = students.filter((s) => addDays(signupDay(s), n) <= today);
    return { cohort: cohort.length, returned: cohort.filter((s) => s.activeDays.has(addDays(signupDay(s), n))).length };
  };
  const returnedWithin = (n) => {
    const cohort = students.filter((s) => addDays(signupDay(s), n) <= today);
    const returned = cohort.filter((s) =>
      [...s.activeDays].some((d) => d > signupDay(s) && d <= addDays(signupDay(s), n))
    );
    return { cohort: cohort.length, returned: returned.length };
  };
  const retention = {
    day1: returnedOnDay(1),
    day7: returnedOnDay(7),
    within7: returnedWithin(7),
    within30: returnedWithin(30),
  };

  // ─── Số liệu theo tuần (liên tục từ tuần đầu tiên đến tuần hiện tại) ──────
  const signupWeeks = real.map((s) => weekStart(signupDay(s)));
  const firstWeek = signupWeeks.length ? signupWeeks.sort()[0] : weekStart(today);
  const weeks = new Map();
  for (let w = firstWeek; w <= weekStart(today); w = addDays(w, 7)) {
    weeks.set(w, {
      weekStart: w,
      newStudents: 0,
      newPartners: 0,
      activeStudents: new Set(),
      likes: 0,
      newMatches: 0,
      messages: 0,
      vouchersClaimed: 0,
      vouchersRedeemed: 0,
      ordersCreated: 0,
      paidOrders: 0,
      revenue: 0,
      newPayers: 0,
    });
  }
  const weekOf = (date) => weeks.get(weekStart(vnDay(date)));
  const studentIds = new Set(students.map((s) => String(s.user._id)));
  const studentId = (id) => studentIds.has(String(id));

  for (const s of students) {
    weekOf(s.user.createdAt).newStudents += 1;
    for (const d of s.activeDays) weeks.get(weekStart(d))?.activeStudents.add(String(s.user._id));
  }
  for (const s of partners) weekOf(s.user.createdAt).newPartners += 1;
  for (const s of payers) if (s.firstPaidAt) weekOf(s.firstPaidAt).newPayers += 1;
  for (const m of data.matches) {
    if (studentId(m.user1) && m.user1Action === 'like' && weekOf(m.createdAt)) weekOf(m.createdAt).likes += 1;
    const matchedAt = m.matchedAt || m.updatedAt;
    if (m.status === 'matched' && studentId(m.user1) && weekOf(matchedAt)) weekOf(matchedAt).newMatches += 1;
  }
  for (const msg of [...data.messages, ...data.groupmessages]) {
    if (studentId(msg.sender) && weekOf(msg.createdAt)) weekOf(msg.createdAt).messages += 1;
  }
  for (const uv of data.uservouchers) {
    if (!studentId(uv.userId)) continue;
    const claimedAt = uv.claimedAt || uv.createdAt;
    if (weekOf(claimedAt)) weekOf(claimedAt).vouchersClaimed += 1;
  }
  for (const r of data.redemptions) {
    if (studentId(r.userId) && weekOf(r.createdAt)) weekOf(r.createdAt).vouchersRedeemed += 1;
  }
  for (const o of data.orders) {
    if (!realIds.has(String(o.userId))) continue;
    if (weekOf(o.createdAt)) weekOf(o.createdAt).ordersCreated += 1;
    const paidAt = o.paidAt || o.updatedAt;
    if (o.status === 'paid' && weekOf(paidAt)) {
      weekOf(paidAt).paidOrders += 1;
      weekOf(paidAt).revenue += o.amount;
    }
  }
  let cumulativeStudents = 0;
  let cumulativeRevenue = 0;
  let cumulativePayers = 0;
  const weekly = [...weeks.values()].map((w) => {
    cumulativeStudents += w.newStudents;
    cumulativeRevenue += w.revenue;
    cumulativePayers += w.newPayers;
    return { ...w, activeStudents: w.activeStudents.size, cumulativeStudents, cumulativeRevenue, cumulativePayers };
  });

  // ─── Theo kênh (nguồn biết đến lúc đăng ký + số liệu nhập tay từ Insights) ─
  const channelInputs = inputs.channels || {};
  const channels = Object.entries(CHANNELS).map(([key, label]) => {
    const inChannel = real.filter((s) => s.channel === key);
    const input = channelInputs[key] || {};
    const cost = Number(input.cost) || 0;
    const reach = Number(input.reach) || 0;
    const clicks = Number(input.clicks) || 0;
    const valid = inChannel.filter((s) => isStudent(s) && usedCoreFlow(s)).length;
    const channelPayers = inChannel.filter((s) => s.ordersPaid > 0).length;
    return {
      key,
      label,
      registeredStudents: inChannel.filter(isStudent).length,
      registeredPartners: inChannel.filter((s) => s.user.role === 'partner').length,
      validStudents: valid,
      payers: channelPayers,
      revenue: inChannel.reduce((sum, s) => sum + s.revenue, 0),
      reach,
      clicks,
      cost,
      ctr: ratio(clicks, reach),
      // Kênh chưa nhập chi phí để trống, tránh hiểu nhầm là kênh miễn phí
      costPerValidUser: cost && valid ? cost / valid : null,
      cpa: cost && channelPayers ? cost / channelPayers : null,
    };
  });
  const channelCost = channels.reduce((sum, c) => sum + c.cost, 0);
  const otherCost = Number(inputs.otherCost) || 0;
  const totalReach = channels.reduce((sum, c) => sum + c.reach, 0);
  const totalClicks = channels.reduce((sum, c) => sum + c.clicks, 0);

  // ─── Web / mobile (từ nhật ký ngày mở app) ─────────────────────────────────
  const activityDays = data.useractivities.map((a) => a.day).sort();
  const platformUsers = (days) => {
    const since = addDays(today, -(days - 1));
    const web = new Set();
    const mobile = new Set();
    for (const a of data.useractivities) {
      if (a.day < since || !realIds.has(String(a.userId))) continue;
      if ((a.platforms || []).includes('web')) web.add(String(a.userId));
      if ((a.platforms || []).includes('mobile')) mobile.add(String(a.userId));
    }
    const both = [...web].filter((id) => mobile.has(id)).length;
    return { web: web.size, mobile: mobile.size, both, total: new Set([...web, ...mobile]).size };
  };

  // ─── Kế hoạch so với thực tế ───────────────────────────────────────────────
  const targets = [
    { group: 'Môn học', label: 'Người dùng hợp lệ', plan: courseMinimum.validUsers, actual: validStudents.length },
    { group: 'Môn học', label: 'Người trả phí', plan: courseMinimum.payingUsers, actual: payers.length },
    { group: 'OC2', label: 'Lượt tiếp cận (Insights)', plan: oc2Plan.reach, actual: totalReach },
    { group: 'OC2', label: 'Lượt nhấp (Insights)', plan: oc2Plan.clicks, actual: totalClicks },
    { group: 'OC2', label: 'Sinh viên đăng ký', plan: oc2Plan.registeredStudents, actual: students.length },
    { group: 'OC2', label: 'Sinh viên kích hoạt', plan: oc2Plan.activatedStudents, actual: activated.length },
    { group: 'OC2', label: 'Sinh viên đổi voucher tại quán', plan: oc2Plan.voucherRedeemers, actual: redeemers.length },
    { group: 'OC2', label: 'Sinh viên quay lại trong 30 ngày', plan: oc2Plan.returned30Days, actual: retention.within30.returned },
    { group: 'OC2', label: 'Quán đối tác hoạt động', plan: oc2Plan.activePartners, actual: activePartners.length },
  ].map((t) => ({ ...t, achieved: ratio(t.actual, t.plan) }));

  // ─── Danh sách chi tiết (email đã che) cho file xuất ───────────────────────
  const users = [...stats.values()]
    .sort((a, b) => new Date(a.user.createdAt) - new Date(b.user.createdAt))
    .map((s) => ({
      email: maskEmail(s.user.email),
      role: s.user.role,
      school: s.user.studentProfile?.university || s.user.partnerProfile?.businessName || '',
      signupDay: s.user.createdAt ? signupDay(s) : '',
      channel: CHANNELS[s.channel],
      onboarded: onboarded(s),
      likesSent: s.likesSent,
      matched: s.matched,
      messages: s.messages,
      vouchersClaimed: s.vouchersClaimed,
      vouchersRedeemed: s.vouchersRedeemed,
      venueCheckins: s.venueCheckins,
      ordersPaid: s.ordersPaid,
      revenue: s.revenue,
      activeDays: s.activeDays.size,
      lastActiveDay: s.user.lastActiveAt ? vnDay(s.user.lastActiveAt) : '',
      valid: isStudent(s) && !s.excludeReason && usedCoreFlow(s),
      excludeReason: s.excludeReason,
    }));
  const orders = [...data.orders]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((o) => {
      const s = get(o.userId);
      return {
        code: o.code,
        buyer: s ? maskEmail(s.user.email) : '(đã xoá)',
        role: s?.user.role || '',
        plan: o.planName,
        amount: o.amount,
        status: o.status,
        createdDay: o.createdAt ? vnDay(o.createdAt) : '',
        paidDay: o.paidAt ? vnDay(o.paidAt) : '',
        excludeReason: s?.excludeReason || '',
      };
    });

  return {
    generatedAt: now.toISOString(),
    today,
    activityTrackedSince: activityDays[0] || null,
    accounts: { total: data.users.length, excluded: data.users.length - real.length },
    students: {
      registered: students.length,
      onboarded: students.filter(onboarded).length,
      valid: validStudents.length,
      activated: activated.length,
      matched: students.filter((s) => s.matched > 0).length,
      vouchersClaimed: students.filter((s) => s.vouchersClaimed > 0).length,
      voucherRedeemers: redeemers.length,
    },
    partners: { registered: partners.length, active: activePartners.length },
    business: {
      payers: payers.length,
      studentPayers: payers.filter(isStudent).length,
      partnerPayers: payers.filter((s) => s.user.role === 'partner').length,
      paidOrders: paidOrders.length,
      revenue,
      averageOrderValue: paidOrders.length ? revenue / paidOrders.length : null,
      repeatBuyers: repeatBuyers.length,
      repeatRate: ratio(repeatBuyers.length, payers.length),
      conversionRate: ratio(payers.filter(isStudent).length, students.length),
      channelCost,
      otherCost,
      totalCost: channelCost + otherCost,
      profit: revenue - channelCost - otherCost,
    },
    funnel,
    biggestDrop,
    retention,
    weekly,
    channels,
    platforms: { last7Days: platformUsers(7), last30Days: platformUsers(30) },
    targets,
    users,
    orders,
  };
};

module.exports = { computeOc3Metrics, parseEmailList, SEED_EMAILS };
