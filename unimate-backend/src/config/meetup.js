/**
 * Luật "Rủ cafe" — sửa số ở đây là đủ.
 *
 * Luồng: 2 sinh viên đã kết bạn → một người mời đi một quán đối tác → người kia đồng ý
 * → cả hai tự nhận "Ưu đãi hẹn cafe" của quán vào ví → quán quét mã của cả hai
 * → buổi hẹn được ghi là đã diễn ra, mỗi người được thưởng UniCoin.
 */
module.exports = {
  // Tài khoản miễn phí được gửi tối đa bấy nhiêu lời mời trong 7 ngày gần nhất; Premium không giới hạn
  FREE_INVITES_PER_WEEK: 3,
  INVITE_WINDOW_DAYS: 7,
  // UniCoin thưởng mỗi người khi cả hai đã dùng ưu đãi hẹn tại quán (vẫn tính trong giới hạn ngày)
  MEETUP_COMPLETE_COIN: 30,
  // Lời mời chưa ai trả lời quá bấy nhiêu giờ → hết hạn (trả lại lượt mời)
  INVITE_EXPIRE_HOURS: 48,
  // Buổi đã chốt: quá giờ hẹn bấy nhiêu giờ mà chưa ghi nhận tới quán → không diễn ra.
  // Không đặt giờ hẹn thì tính từ lúc chốt + NO_TIME_MEETUP_DAYS ngày.
  NO_SHOW_GRACE_HOURS: 24,
  NO_TIME_MEETUP_DAYS: 7,
};
