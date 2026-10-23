const Meetup = require('../models/Meetup');
const Order = require('../models/Order');
const { INVITE_EXPIRE_HOURS, NO_SHOW_GRACE_HOURS, NO_TIME_MEETUP_DAYS } = require('../config/meetup');
const { migrateIssuedCount } = require('./voucherStock');

/**
 * Đóng các trạng thái chờ không có lối ra theo thời gian (chạy định kỳ trong tiến trình server):
 * - Lời "Rủ cafe" chưa ai trả lời quá INVITE_EXPIRE_HOURS giờ → expired (người mời được trả lượt)
 * - Buổi hẹn đã chốt, quá giờ hẹn NO_SHOW_GRACE_HOURS giờ (không đặt giờ: chốt quá NO_TIME_MEETUP_DAYS ngày)
 *   mà chưa ghi nhận tới quán → no_show
 * - Đơn mua gói chờ thanh toán quá 24 giờ → tự huỷ (autoCancelled: tiền về muộn vẫn tự kích hoạt gói)
 */
const HOUR_MS = 60 * 60 * 1000;
const RUN_EVERY_MS = 15 * 60 * 1000;
const ORDER_PENDING_HOURS = 24;

/** Cập nhật thẻ "Rủ cafe" trong chat theo trạng thái mới và báo cho phòng chat */
const syncCards = async (io, meetups, status) => {
  // Nạp muộn để tránh vòng require (meetupController → coinService → …)
  const { syncMeetupMessage } = require('../controllers/meetupController');
  const req = { app: { get: () => io } };
  for (const meetup of meetups) {
    await syncMeetupMessage(req, meetup, { status }).catch(() => {});
  }
};

/** Chuyển các buổi hẹn khớp điều kiện sang trạng thái mới (có điều kiện theo trạng thái cũ, không đè lên thay đổi vừa xảy ra) */
const moveMeetups = async (io, filter, fromStatus, toStatus) => {
  const candidates = await Meetup.find({ ...filter, status: fromStatus });
  const moved = [];
  for (const m of candidates) {
    const updated = await Meetup.findOneAndUpdate(
      { _id: m._id, status: fromStatus },
      { status: toStatus },
      { returnDocument: 'after' }
    );
    if (updated) moved.push(updated);
  }
  await syncCards(io, moved, toStatus);
  return moved.length;
};

const runExpiryJobs = async (io) => {
  const now = Date.now();

  const expired = await moveMeetups(io, { createdAt: { $lt: new Date(now - INVITE_EXPIRE_HOURS * HOUR_MS) } }, 'proposed', 'expired');

  const noShow = await moveMeetups(
    io,
    {
      $or: [
        { scheduledAt: { $ne: null, $lt: new Date(now - NO_SHOW_GRACE_HOURS * HOUR_MS) } },
        { scheduledAt: null, respondedAt: { $lt: new Date(now - NO_TIME_MEETUP_DAYS * 24 * HOUR_MS) } },
      ],
    },
    'accepted',
    'no_show'
  );

  const orders = await Order.updateMany(
    { status: 'pending', createdAt: { $lt: new Date(now - ORDER_PENDING_HOURS * HOUR_MS) } },
    { status: 'cancelled', cancelledAt: new Date(), autoCancelled: true, note: `Tự huỷ sau ${ORDER_PENDING_HOURS} giờ chưa thanh toán` }
  );

  return { expired, noShow, ordersCancelled: orders.modifiedCount };
};

const startExpiryJobs = (io) => {
  migrateIssuedCount()
    .then((n) => n && console.log(`[Voucher] Đã tính lượt đã phát cho ${n} voucher cũ`))
    .catch((err) => console.error('[Voucher] Tính lượt đã phát thất bại:', err.message));

  const tick = () =>
    runExpiryJobs(io)
      .then((r) => {
        if (r.expired || r.noShow || r.ordersCancelled) console.log('[Expiry]', r);
      })
      .catch((err) => console.error('[Expiry] Lỗi:', err.message));

  tick();
  return setInterval(tick, RUN_EVERY_MS);
};

module.exports = { runExpiryJobs, startExpiryJobs };
