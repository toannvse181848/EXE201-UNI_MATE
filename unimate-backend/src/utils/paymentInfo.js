/**
 * Phương thức và mã tham chiếu thanh toán của một đơn đã thanh toán, để đối chiếu với sao kê ngân hàng
 * (G3.2 bảng chấm OC3: mỗi giao dịch có mã đơn, phương thức và mã tham chiếu).
 *
 * Đơn trước khi có trường paymentRef chỉ lưu mã trong note, dạng:
 *   "Tự động xác nhận qua SePay #91115483 · FT26292214668722"  (webhook SePay)
 *   "Gán giao dịch SePay #96576420 · ghi chú"                  (admin gán giao dịch lạc)
 *   tự do                                                       (admin xác nhận tay)
 */
const SEPAY_AUTO = /^Tự động xác nhận qua SePay #(\S+)(?: · (\S+))?/;
const SEPAY_ASSIGNED = /^Gán giao dịch SePay #(\S+)/;
// Mã giao dịch ngân hàng hay gặp (MB, Vietcombank...): FT + chữ số
const BANK_REF = /\bFT[0-9A-Z]{8,}\b/i;

const METHODS = {
  sepay_auto: 'Chuyển khoản VietQR · SePay tự xác nhận',
  sepay_assigned: 'Chuyển khoản VietQR · admin gán giao dịch SePay',
  manual: 'Chuyển khoản VietQR · admin đối chiếu sao kê',
};

/**
 * @param order          đơn (document hoặc object thường)
 * @param paymentsById   Map sepayId → bản ghi Payment (để lấy mã ngân hàng của giao dịch được gán)
 * @returns { methodKey, method, reference, gatewayId }
 */
const describePayment = (order, paymentsById = new Map()) => {
  const note = String(order.note || '');
  const auto = note.match(SEPAY_AUTO);
  const assigned = note.match(SEPAY_ASSIGNED);

  let methodKey = 'manual';
  let gatewayId = '';
  let reference = '';
  if (auto) {
    methodKey = 'sepay_auto';
    gatewayId = auto[1];
    reference = auto[2] || '';
  } else if (assigned) {
    methodKey = 'sepay_assigned';
    gatewayId = assigned[1];
    reference = paymentsById.get(gatewayId)?.referenceCode || '';
  }
  if (order.paymentRef) reference = order.paymentRef;
  if (!reference) reference = note.match(BANK_REF)?.[0] || '';

  return { methodKey, method: METHODS[methodKey], reference, gatewayId: gatewayId ? `SePay #${gatewayId}` : '' };
};

module.exports = { describePayment, METHODS };
