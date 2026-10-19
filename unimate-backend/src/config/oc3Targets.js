/**
 * Mục tiêu dùng để đối chiếu kế hoạch với thực tế trong báo cáo OC3.
 * - courseMinimum: yêu cầu tối thiểu của môn EXE201 (Hướng dẫn yêu cầu công việc FA26, mục I.1)
 * - oc2Plan: slide OC2 "Mục tiêu SMART đến hết tuần 10" và "Phễu chuyển đổi phía sinh viên"
 */
module.exports = {
  courseMinimum: {
    validUsers: 20,
    payingUsers: 10,
  },
  oc2Plan: {
    reach: 20000, // lượt xem nội dung
    clicks: 600, // CTR 3%
    registeredStudents: 300,
    activatedStudents: 120, // 40% số đăng ký
    voucherRedeemers: 36, // 30% số kích hoạt
    returned30Days: 18, // 50% số đổi voucher
    activePartners: 10,
  },
};
