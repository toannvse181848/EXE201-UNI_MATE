/**
 * Chuyển số liệu OC3 (utils/oc3Metrics) thành các bảng có tiêu đề tiếng Việt,
 * dùng chung cho CSV của script và file Excel xuất từ trang Tổng quan admin.
 */
const XLSX = require('xlsx');

const pct = (value) => (value == null ? '-' : `${(value * 100).toFixed(1)}%`);
const vnd = (amount) => (amount == null ? '-' : `${Math.round(amount).toLocaleString('vi-VN')}đ`);
const fraction = (part, whole) => `${part}/${whole} (${pct(whole ? part / whole : null)})`;

const buildOc3Tables = (m) => {
  const { students: st, partners, business: b, retention: r } = m;
  const summary = [
    ['Ngày chốt số liệu', m.today],
    ['Tổng tài khoản trong database', m.accounts.total],
    ['Tài khoản bị loại (admin, tài khoản mẫu, thành viên nhóm, test)', m.accounts.excluded],
    ['Sinh viên đăng ký (người thật)', st.registered],
    ['Người dùng hợp lệ (đã dùng tính năng chính), mục tiêu 20', st.valid],
    ['Sinh viên hoàn thành onboarding', fraction(st.onboarded, st.registered)],
    ['Sinh viên kích hoạt (định nghĩa slide OC2)', fraction(st.activated, st.registered)],
    ['Sinh viên đã kết bạn thành công', st.matched],
    ['Sinh viên đã lưu voucher', st.vouchersClaimed],
    ['Sinh viên đã đổi voucher tại quán', st.voucherRedeemers],
    ['Quán đối tác đăng ký', partners.registered],
    ['Quán đối tác có quán đã duyệt', partners.active],
    ['Người trả phí, mục tiêu 10', b.payers],
    ['Người trả phí là sinh viên / quán', `${b.studentPayers} / ${b.partnerPayers}`],
    ['Số đơn đã thanh toán', b.paidOrders],
    ['Doanh thu', vnd(b.revenue)],
    ['Giá trị đơn trung bình', vnd(b.averageOrderValue)],
    ['Khách mua lại (từ 2 đơn)', `${b.repeatBuyers} (${pct(b.repeatRate)})`],
    ['Tỷ lệ chuyển đổi đăng ký → trả phí (sinh viên)', pct(b.conversionRate)],
    ['Tổng chi phí (kênh + chi phí khác, nhập tay)', vnd(b.totalCost)],
    ['Doanh thu trừ chi phí', vnd(b.profit)],
    ['Quay lại đúng ngày 1', fraction(r.day1.returned, r.day1.cohort)],
    ['Quay lại đúng ngày 7', fraction(r.day7.returned, r.day7.cohort)],
    ['Quay lại trong 7 ngày đầu', fraction(r.within7.returned, r.within7.cohort)],
    ['Quay lại trong 30 ngày đầu', fraction(r.within30.returned, r.within30.cohort)],
    ['Người dùng hoạt động 7 ngày qua (web / mobile)', `${m.platforms.last7Days.web} / ${m.platforms.last7Days.mobile}`],
    ['Nhật ký ngày hoạt động bắt đầu từ', m.activityTrackedSince || 'chưa có dữ liệu'],
  ].map(([label, value]) => ({ 'Chỉ số': label, 'Giá trị': value }));

  const registered = m.funnel[0]?.count || 0;
  const funnel = m.funnel.map((s, i) => ({
    'Bước': s.step,
    'Số người': s.count,
    'So với bước trước': i ? pct(s.previous ? s.count / s.previous : null) : '100%',
    'So với đăng ký': pct(registered ? s.count / registered : null),
    'Mất ở bước này': i ? s.previous - s.count : 0,
  }));

  const weekly = m.weekly.map((w) => ({
    'Tuần (thứ Hai)': w.weekStart,
    'SV đăng ký mới': w.newStudents,
    'Quán đăng ký mới': w.newPartners,
    'SV hoạt động trong tuần': w.activeStudents,
    'Lượt thả tim': w.likes,
    'Kết bạn mới': w.newMatches,
    'Tin nhắn': w.messages,
    'Voucher được lưu': w.vouchersClaimed,
    'Voucher được đổi': w.vouchersRedeemed,
    'Đơn tạo': w.ordersCreated,
    'Đơn thanh toán': w.paidOrders,
    'Doanh thu (VNĐ)': w.revenue,
    'Tổng SV cộng dồn': w.cumulativeStudents,
    'Người trả phí cộng dồn': w.cumulativePayers,
    'Doanh thu cộng dồn (VNĐ)': w.cumulativeRevenue,
  }));

  const channels = m.channels.map((c) => ({
    'Kênh': c.label,
    'Lượt tiếp cận': c.reach,
    'Lượt nhấp': c.clicks,
    'CTR': pct(c.ctr),
    'SV đăng ký': c.registeredStudents,
    'Quán đăng ký': c.registeredPartners,
    'Người dùng hợp lệ': c.validStudents,
    'Người trả phí': c.payers,
    'Doanh thu (VNĐ)': c.revenue,
    'Chi phí (VNĐ)': c.cost,
    'Chi phí / người dùng hợp lệ': vnd(c.costPerValidUser),
    'Chi phí / khách trả phí (CPA)': vnd(c.cpa),
  }));

  const targets = m.targets.map((t) => ({
    'Nguồn mục tiêu': t.group,
    'Chỉ số': t.label,
    'Kế hoạch': t.plan,
    'Thực tế': t.actual,
    'Đạt': pct(t.achieved),
  }));

  const users = m.users.map((u) => ({
    'Email (đã che)': u.email,
    'Vai trò': u.role,
    'Trường / quán': u.school,
    'Ngày đăng ký': u.signupDay,
    'Kênh': u.channel,
    'Onboarding': u.onboarded ? 'có' : 'không',
    'Lượt thả tim': u.likesSent,
    'Kết bạn': u.matched,
    'Tin nhắn': u.messages,
    'Voucher lưu': u.vouchersClaimed,
    'Voucher đổi': u.vouchersRedeemed,
    'Check-in quán': u.venueCheckins,
    'Đơn đã trả': u.ordersPaid,
    'Doanh thu (VNĐ)': u.revenue,
    'Số ngày hoạt động': u.activeDays,
    'Hoạt động gần nhất': u.lastActiveDay,
    'Hợp lệ': u.valid ? 'có' : 'không',
    'Lý do loại': u.excludeReason,
  }));

  const orders = m.orders.map((o) => ({
    'Mã đơn': o.code,
    'Người mua (đã che)': o.buyer,
    'Vai trò': o.role,
    'Gói': o.plan,
    'Số tiền (VNĐ)': o.amount,
    'Trạng thái': o.status,
    'Ngày tạo': o.createdDay,
    'Ngày thanh toán': o.paidDay,
    'Bị loại': o.excludeReason,
  }));

  return {
    'Tổng quan': summary,
    'Phễu': funnel,
    'Theo tuần': weekly,
    'Theo kênh': channels,
    'Kế hoạch - thực tế': targets,
    'Người dùng': users,
    'Đơn hàng': orders,
  };
};

/** Mỗi bảng thành một sheet trong file .xlsx */
const tablesToXlsx = (tables) => {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(tables)) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const headers = Object.keys(rows[0] || {});
    ws['!cols'] = headers.map((h) => ({
      wch: Math.min(60, Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length)) + 2),
    }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { buildOc3Tables, tablesToXlsx, pct, vnd };
