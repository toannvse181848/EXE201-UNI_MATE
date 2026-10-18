/**
 * Thống kê số liệu cho báo cáo OC3 — CHỈ ĐỌC, không ghi gì vào database.
 *
 * Cách chạy (trong thư mục unimate-backend):
 *   node scripts/oc3-stats.js --db unimate_v2 --exclude scripts/oc3-exclude.txt
 *
 *   --db       tên database cần thống kê (mặc định: database trong MONGODB_URI)
 *   --exclude  file danh sách email cần loại (thành viên nhóm, tài khoản test), mỗi dòng 1 email
 *   --out      thư mục xuất CSV (mặc định: oc3-output)
 *
 * Kết quả: bảng tóm tắt in ra màn hình + các file CSV (email đã che) trong thư mục --out:
 *   tong-quan.csv, pheu.csv, theo-tuan.csv, nguoi-dung.csv, don-hang.csv
 *
 * Định nghĩa (khớp tài liệu môn học và slide OC2):
 *   - Người dùng hợp lệ: sinh viên thật, có ít nhất 1 hành động của luồng chính
 *     (thả tim, nhắn tin, lưu voucher, check-in quán, tạo đơn)
 *   - Kích hoạt (theo slide OC2): hoàn thành onboarding + có 1 lần kết bạn thành công hoặc lưu 1 voucher
 *   - Người trả phí: có ít nhất 1 đơn 'paid' (thanh toán thật qua chuyển khoản); đổi Premium bằng
 *     UniCoin KHÔNG tính vì không tạo đơn hàng
 *   - Quay lại ngày 1 / ngày 7: có hoạt động đúng vào ngày thứ 1 / thứ 7 sau ngày đăng ký (giờ VN).
 *     Database không lưu lịch sử đăng nhập nên đây là số ước tính từ các hành động có ghi thời gian.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { maskEmail } = require('../src/utils/excelExport');

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

const getArg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

// Ngày theo giờ Việt Nam, dạng 2026-10-18
const vnDay = (date) => new Date(new Date(date).getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
const addDays = (day, n) => new Date(Date.parse(day) + n * DAY_MS).toISOString().slice(0, 10);
// Ngày thứ Hai đầu tuần chứa `day`
const weekStart = (day) => addDays(day, -((new Date(day).getUTCDay() + 6) % 7));

const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '-');
const vnd = (n) => `${n.toLocaleString('vi-VN')}đ`;

const toCsv = (rows) => {
  const cols = Object.keys(rows[0] || {});
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM để Excel đọc đúng tiếng Việt
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
};

const readExcludeFile = (file) => {
  if (!file) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l && !l.startsWith('#'));
};

async function run() {
  const dbName = getArg('db');
  const outDir = getArg('out') || 'oc3-output';
  const excluded = new Set([...SEED_EMAILS, ...readExcludeFile(getArg('exclude'))]);

  let uri = process.env.MONGODB_URI;
  if (dbName) uri = uri.replace(/\/([^/?]*)(\?|$)/, `/${dbName}$2`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const col = (name) => db.collection(name).find({}).toArray();

  const [users, matches, messages, groupMessages, userVouchers, redemptions, orders, venues] = await Promise.all([
    col('users'),
    col('matches'),
    col('messages'),
    col('groupmessages'),
    col('uservouchers'),
    col('redemptions'),
    col('orders'),
    col('venues'),
  ]);

  // ─── Phân loại tài khoản ───────────────────────────────────────────────────
  const excludeReason = (u) => {
    const email = String(u.email || '').toLowerCase();
    if (u.role === 'admin') return 'admin';
    if (SEED_EMAILS.includes(email)) return 'tài khoản mẫu (seed)';
    if (excluded.has(email)) return 'danh sách loại trừ';
    return '';
  };

  const stats = new Map(); // userId → số liệu từng người
  for (const u of users) {
    stats.set(String(u._id), {
      user: u,
      excludeReason: excludeReason(u),
      likesSent: 0,
      matched: 0,
      messages: 0,
      vouchersClaimed: 0,
      vouchersRedeemed: 0,
      venueCheckins: 0,
      ordersCreated: 0,
      ordersPaid: 0,
      revenue: 0,
      activeDays: new Set(),
    });
  }
  const get = (id) => (id ? stats.get(String(id)) : undefined);
  const markActive = (id, date) => {
    const s = get(id);
    if (s && date) s.activeDays.add(vnDay(date));
  };

  // ─── Gom hành động của từng người ──────────────────────────────────────────
  for (const m of matches) {
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
  for (const msg of [...messages, ...groupMessages]) {
    if (get(msg.sender)) get(msg.sender).messages += 1;
    markActive(msg.sender, msg.createdAt);
  }
  for (const uv of userVouchers) {
    const s = get(uv.userId);
    if (!s) continue;
    s.vouchersClaimed += 1;
    if (uv.status === 'used') s.vouchersRedeemed += 1;
    markActive(uv.userId, uv.claimedAt || uv.createdAt);
  }
  for (const r of redemptions) {
    // Lượt đổi bằng QR đã được đếm qua UserVoucher 'used'; ở đây chỉ ghi nhận ngày sinh viên ra quán
    markActive(r.userId, r.createdAt);
  }
  for (const s of stats.values()) {
    for (const log of s.user.studentProfile?.coinLog || []) {
      if (log.type === 'venue_checkin') s.venueCheckins += 1;
      if (log.createdAt) s.activeDays.add(vnDay(log.createdAt));
    }
    if (s.user.lastActiveAt) s.activeDays.add(vnDay(s.user.lastActiveAt));
  }
  for (const o of orders) {
    const s = get(o.userId);
    if (!s) continue;
    s.ordersCreated += 1;
    markActive(o.userId, o.createdAt);
    if (o.status === 'paid') {
      s.ordersPaid += 1;
      s.revenue += o.amount;
    }
  }

  // ─── Nhóm người dùng ───────────────────────────────────────────────────────
  const real = [...stats.values()].filter((s) => !s.excludeReason);
  const students = real.filter((s) => STUDENT_ROLES.includes(s.user.role));
  const partners = real.filter((s) => s.user.role === 'partner');

  const onboarded = (s) => Boolean(s.user.isProfileCompleted);
  const usedCoreFlow = (s) =>
    s.likesSent + s.messages + s.vouchersClaimed + s.venueCheckins + s.ordersCreated > 0;
  // Tài liệu môn học không yêu cầu onboarding — có người bỏ qua onboarding nhưng vẫn kết bạn, nhắn tin
  const validStudents = students.filter(usedCoreFlow);
  const activated = students.filter((s) => onboarded(s) && (s.matched > 0 || s.vouchersClaimed > 0));

  const realIds = new Set(real.map((s) => String(s.user._id)));
  const paidOrders = orders.filter((o) => o.status === 'paid' && realIds.has(String(o.userId)));
  const payers = real.filter((s) => s.ordersPaid > 0);
  const repeatBuyers = payers.filter((s) => s.ordersPaid > 1);
  const revenue = paidOrders.reduce((sum, o) => sum + o.amount, 0);
  const partnerIdsWithApprovedVenue = new Set(
    venues.filter((v) => v.status === 'approved').map((v) => String(v.partnerId))
  );
  const activePartners = partners.filter((s) => partnerIdsWithApprovedVenue.has(String(s.user._id)));

  // ─── Phễu chuyển đổi (sinh viên) ───────────────────────────────────────────
  // Mỗi bước chỉ đếm người đã qua mọi bước trước để phễu luôn thu hẹp dần
  const funnelConditions = [
    ['Đăng ký tài khoản', () => true],
    ['Dùng tính năng chính = người dùng hợp lệ', usedCoreFlow],
    ['Kết bạn thành công hoặc lưu voucher', (s) => s.matched > 0 || s.vouchersClaimed > 0],
    ['Tạo đơn mua gói', (s) => s.ordersCreated > 0],
    ['Thanh toán (trả phí)', (s) => s.ordersPaid > 0],
  ];
  let remaining = students;
  const funnel = funnelConditions.map(([step, condition], i) => {
    const before = remaining.length;
    remaining = remaining.filter(condition);
    return {
      buoc: step,
      so_nguoi: remaining.length,
      so_voi_buoc_truoc: i ? pct(remaining.length, before) : '100%',
      so_voi_dang_ky: pct(remaining.length, students.length),
    };
  });

  // ─── Tỷ lệ quay lại (ước tính) ─────────────────────────────────────────────
  const today = vnDay(new Date());
  const retention = (n) => {
    const cohort = students.filter((s) => addDays(vnDay(s.user.createdAt), n) <= today);
    const returned = cohort.filter((s) => s.activeDays.has(addDays(vnDay(s.user.createdAt), n)));
    return { cohort: cohort.length, returned: returned.length };
  };
  const within7 = (() => {
    const cohort = students.filter((s) => addDays(vnDay(s.user.createdAt), 7) <= today);
    const returned = cohort.filter((s) => {
      const signup = vnDay(s.user.createdAt);
      return [...s.activeDays].some((d) => d > signup && d <= addDays(signup, 7));
    });
    return { cohort: cohort.length, returned: returned.length };
  })();
  const d1 = retention(1);
  const d7 = retention(7);

  // ─── Số liệu theo tuần ─────────────────────────────────────────────────────
  const weeks = new Map();
  const week = (date) => {
    const key = weekStart(vnDay(date));
    if (!weeks.has(key)) {
      weeks.set(key, {
        tuan_bat_dau: key,
        sv_dang_ky_moi: 0,
        quan_dang_ky_moi: 0,
        sv_hoat_dong: new Set(),
        luot_tha_tim: 0,
        ket_ban_moi: 0,
        tin_nhan: 0,
        voucher_luu: 0,
        voucher_doi: 0,
        don_tao: 0,
        don_thanh_toan: 0,
        doanh_thu: 0,
      });
    }
    return weeks.get(key);
  };
  const studentIds = new Set(students.map((s) => String(s.user._id)));
  const isStudent = (id) => studentIds.has(String(id));

  for (const s of students) {
    week(s.user.createdAt).sv_dang_ky_moi += 1;
    for (const d of s.activeDays) week(d).sv_hoat_dong.add(String(s.user._id));
  }
  for (const s of partners) week(s.user.createdAt).quan_dang_ky_moi += 1;
  for (const m of matches) {
    if (isStudent(m.user1) && m.user1Action === 'like') week(m.createdAt).luot_tha_tim += 1;
    if (m.status === 'matched' && isStudent(m.user1)) week(m.matchedAt || m.updatedAt).ket_ban_moi += 1;
  }
  for (const msg of [...messages, ...groupMessages]) if (isStudent(msg.sender)) week(msg.createdAt).tin_nhan += 1;
  for (const uv of userVouchers) {
    if (!isStudent(uv.userId)) continue;
    week(uv.claimedAt || uv.createdAt).voucher_luu += 1;
    if (uv.status === 'used') week(uv.usedAt || uv.updatedAt).voucher_doi += 1;
  }
  for (const o of orders) {
    if (!realIds.has(String(o.userId))) continue;
    week(o.createdAt).don_tao += 1;
    if (o.status === 'paid') {
      const w = week(o.paidAt || o.updatedAt);
      w.don_thanh_toan += 1;
      w.doanh_thu += o.amount;
    }
  }
  let cumStudents = 0;
  let cumRevenue = 0;
  const weekly = [...weeks.values()]
    .sort((a, b) => a.tuan_bat_dau.localeCompare(b.tuan_bat_dau))
    .map((w) => {
      cumStudents += w.sv_dang_ky_moi;
      cumRevenue += w.doanh_thu;
      return { ...w, sv_hoat_dong: w.sv_hoat_dong.size, tong_sv_cong_don: cumStudents, doanh_thu_cong_don: cumRevenue };
    });

  // ─── Tổng quan ─────────────────────────────────────────────────────────────
  const summary = [
    ['Tổng tài khoản trong database', users.length],
    ['Tài khoản bị loại (admin, seed, thành viên nhóm, test)', users.length - real.length],
    ['Sinh viên đăng ký (thật)', students.length],
    ['Sinh viên hợp lệ (đã dùng luồng chính) — mục tiêu 20', validStudents.length],
    ['Sinh viên hoàn thành onboarding', `${students.filter(onboarded).length} (${pct(students.filter(onboarded).length, students.length)})`],
    ['Sinh viên kích hoạt (định nghĩa slide OC2)', `${activated.length} (${pct(activated.length, students.length)})`],
    ['Sinh viên đã kết bạn thành công', students.filter((s) => s.matched > 0).length],
    ['Sinh viên đã lưu voucher', students.filter((s) => s.vouchersClaimed > 0).length],
    ['Sinh viên đã đổi voucher tại quán', students.filter((s) => s.vouchersRedeemed > 0).length],
    ['Quán đối tác đăng ký', partners.length],
    ['Quán đối tác có quán đã duyệt', activePartners.length],
    ['Người trả phí — mục tiêu 10', payers.length],
    ['  trong đó sinh viên / quán', `${payers.filter((s) => STUDENT_ROLES.includes(s.user.role)).length} / ${payers.filter((s) => s.user.role === 'partner').length}`],
    ['Số đơn đã thanh toán', paidOrders.length],
    ['Doanh thu', vnd(revenue)],
    ['Giá trị đơn trung bình', paidOrders.length ? vnd(Math.round(revenue / paidOrders.length)) : '-'],
    ['Khách mua lại (≥2 đơn)', `${repeatBuyers.length} (${pct(repeatBuyers.length, payers.length)})`],
    ['Tỷ lệ chuyển đổi đăng ký → trả phí', pct(payers.filter((s) => STUDENT_ROLES.includes(s.user.role)).length, students.length)],
    ['Quay lại ngày 1 (ước tính)', `${d1.returned}/${d1.cohort} (${pct(d1.returned, d1.cohort)})`],
    ['Quay lại ngày 7 (ước tính)', `${d7.returned}/${d7.cohort} (${pct(d7.returned, d7.cohort)})`],
    ['Quay lại trong 7 ngày đầu (ước tính)', `${within7.returned}/${within7.cohort} (${pct(within7.returned, within7.cohort)})`],
    ['Ngày chốt số liệu', today],
  ].map(([chi_so, gia_tri]) => ({ chi_so, gia_tri }));

  const userRows = [...stats.values()]
    .sort((a, b) => new Date(a.user.createdAt) - new Date(b.user.createdAt))
    .map((s) => ({
      email: maskEmail(s.user.email),
      vai_tro: s.user.role,
      truong: s.user.studentProfile?.university || s.user.partnerProfile?.businessName || '',
      ngay_dang_ky: vnDay(s.user.createdAt),
      onboarding: onboarded(s) ? 'có' : 'không',
      luot_tha_tim: s.likesSent,
      ket_ban: s.matched,
      tin_nhan: s.messages,
      voucher_luu: s.vouchersClaimed,
      voucher_doi: s.vouchersRedeemed,
      checkin_quan: s.venueCheckins,
      don_da_tra: s.ordersPaid,
      doanh_thu: s.revenue,
      so_ngay_hoat_dong: s.activeDays.size,
      hoat_dong_gan_nhat: s.user.lastActiveAt ? vnDay(s.user.lastActiveAt) : '',
      hop_le: STUDENT_ROLES.includes(s.user.role) && !s.excludeReason && usedCoreFlow(s) ? 'có' : 'không',
      ly_do_loai: s.excludeReason,
    }));

  const orderRows = orders
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((o) => {
      const s = get(o.userId);
      return {
        ma_don: o.code,
        nguoi_mua: s ? maskEmail(s.user.email) : '(đã xoá)',
        vai_tro: s?.user.role || '',
        goi: o.planName,
        so_tien: o.amount,
        trang_thai: o.status,
        ngay_tao: o.createdAt ? vnDay(o.createdAt) : '',
        ngay_thanh_toan: o.paidAt ? vnDay(o.paidAt) : '',
        bi_loai: s?.excludeReason || '',
      };
    });

  // ─── Xuất kết quả ──────────────────────────────────────────────────────────
  fs.mkdirSync(outDir, { recursive: true });
  const files = {
    'tong-quan.csv': summary,
    'pheu.csv': funnel,
    'theo-tuan.csv': weekly,
    'nguoi-dung.csv': userRows,
    'don-hang.csv': orderRows,
  };
  for (const [name, rows] of Object.entries(files)) fs.writeFileSync(path.join(outDir, name), toCsv(rows));

  console.log(`\nDatabase: ${db.databaseName}\n`);
  console.log('=== TỔNG QUAN ===');
  console.table(summary);
  console.log('=== PHỄU CHUYỂN ĐỔI (sinh viên) ===');
  console.table(funnel);
  console.log('=== THEO TUẦN ===');
  console.table(weekly);
  console.log(`Đã xuất CSV vào: ${path.resolve(outDir)}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
