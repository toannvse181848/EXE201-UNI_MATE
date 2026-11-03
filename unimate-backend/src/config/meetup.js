/**
 * Luật "Rủ cafe" — sửa số ở đây là đủ.
 *
 * Luồng: 2 sinh viên đã kết bạn → một người mời đi một quán đối tác → người kia đồng ý
 * → cả hai tự nhận "Ưu đãi hẹn cafe" của quán vào ví → hai bạn cùng tới quán, quán quét đủ mã của cả hai
 * rồi xác nhận một lần → ưu đãi được áp dụng, buổi hẹn được ghi là đã diễn ra, mỗi người được thưởng UniCoin.
 * Huỷ hẹn hoặc quá hạn mà chưa tới quán → ưu đãi chưa dùng bị thu hồi, trả lại lượt cho quán.
 *
 * Rủ cả nhóm: một thành viên mời trong chat nhóm → ai muốn đi bấm Tham gia, có từ 2 người là chốt hẹn,
 * mỗi người tham gia nhận 1 ưu đãi → quán quét từ 2 mã trở lên rồi xác nhận một lần → buổi hẹn được ghi nhận,
 * chỉ người có mặt mới được thưởng. Bạn đến muộn quét riêng được trong GROUP_LATECOMER_HOURS giờ.
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
  // Tối đa bấy nhiêu người trong một buổi hẹn nhóm, để một nhóm không lấy hết lượt ưu đãi của quán
  GROUP_MEETUP_MAX_PEOPLE: 8,
  // Buổi hẹn nhóm đã ghi nhận: quá bấy nhiêu giờ, bạn chưa tới bị thu hồi ưu đãi
  GROUP_LATECOMER_HOURS: 24,
};
