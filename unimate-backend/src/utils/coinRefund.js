/**
 * Hoàn UniCoin cho voucher đổi coin chưa dùng khi voucher không còn dùng được vì phía quán hoặc UNI-MATE:
 * quán tạm dừng voucher, UNI-MATE khoá voucher, khoá tài khoản quán, tạm khoá chi nhánh.
 * Voucher bị gỡ khỏi ví, lượt / mã trả lại cho quán; quán mở lại thì sinh viên đổi lại được.
 * Hết hạn thì không hoàn: hạn dùng ghi rõ lúc đổi và quán không rút ngắn được sau khi đã có người đổi.
 */
const Voucher = require('../models/Voucher');
const UserVoucher = require('../models/UserVoucher');
const VoucherCode = require('../models/VoucherCode');
const User = require('../models/User');
const { releaseSharedSlot } = require('./voucherStock');

/**
 * @param voucherFilter điều kiện chọn voucher (VD: { _id }, { partnerId }, { venueId })
 * @param reason        lý do ghi vào lịch sử coin, VD: 'quán tạm dừng voucher'
 * @returns số voucher trong ví đã được hoàn coin
 */
const refundCoinVouchers = async (voucherFilter, reason) => {
  const vouchers = await Voucher.find({ ...voucherFilter, coinCost: { $gt: 0 } }).select('_id title coinCost');
  let refunded = 0;
  for (const voucher of vouchers) {
    const holders = await UserVoucher.find({ voucherId: voucher._id, status: 'saved', meetupId: null }).select('_id');
    for (const { _id } of holders) {
      // Xoá có điều kiện: quán vừa quét đúng lúc này thì voucher đã là "used", không hoàn nữa
      const removed = await UserVoucher.findOneAndDelete({ _id, status: 'saved' });
      if (!removed) continue;
      if (removed.assignedCode) {
        await VoucherCode.updateOne(
          { voucherId: voucher._id, code: removed.assignedCode },
          { userId: null, userVoucherId: null, assignedAt: null }
        );
      } else {
        await releaseSharedSlot(voucher);
      }
      // Voucher đổi trước khi có coinPaid: giá coin bị khoá khi đã có người đổi nên bằng đúng số đã trả
      const coin = removed.coinPaid ?? voucher.coinCost;
      if (coin > 0) {
        await User.updateOne(
          { _id: removed.userId },
          {
            $inc: { 'studentProfile.uniCoin': coin },
            $push: {
              'studentProfile.coinLog': {
                $each: [{ type: 'voucher_refund', amount: coin, description: `Hoàn coin vì ${reason}: "${voucher.title}"`, createdAt: new Date() }],
                $slice: -100,
              },
            },
          }
        );
      }
      refunded += 1;
    }
  }
  return refunded;
};

module.exports = { refundCoinVouchers };
