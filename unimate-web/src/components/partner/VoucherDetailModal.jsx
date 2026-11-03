import React, { useState } from 'react';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';
import { voucherApi } from '../../services/api';
import { confirmDialog, notify } from '../../utils/notify';
import { describeVoucher } from '../../utils/voucher';
import VoucherStatusBadge from '../VoucherStatusBadge';

const KIND_LABEL = { meetup: 'Ưu đãi hẹn cafe', premium: 'Chỉ Premium', normal: 'Voucher thường' };
const kindOf = (v) => (v.meetupReward ? 'meetup' : v.premiumOnly ? 'premium' : 'normal');

const scanRule = (v) => {
  if (v.codeType === 'unique') return 'Quét QR trong ví hoặc gõ mã riêng của sinh viên';
  return v.walletOnly ? 'Chỉ quét QR trong ví' : 'Quét QR trong ví hoặc gõ mã chung';
};

const quantityLabel = (v) => {
  if (v.isUnlimited) return 'Không giới hạn';
  if (v.codeType === 'unique') return `${v.quantity ?? 0} mã, còn ${v.freeCodes ?? 0} mã trống`;
  return `${v.quantity ?? 0} lượt, còn ${v.remainingCount ?? 0} lượt`;
};

/** Xem đầy đủ một voucher, từ đây mở form sửa hoặc xoá. voucher: bản ghi nguyên gốc từ API danh sách của quán */
export default function VoucherDetailModal({ voucher, onClose, onEdit, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const labels = describeVoucher(voucher);
  const { hasRecipients } = voucher;

  const handleDelete = async () => {
    const agreed = await confirmDialog(`Xoá voucher "${voucher.title}"? Việc này không hoàn tác được.`, {
      confirmText: 'Xoá voucher',
      cancelText: 'Không',
      danger: true,
    });
    if (!agreed) return;
    setDeleting(true);
    try {
      const res = await voucherApi.deleteVoucher(voucher._id);
      notify.success(res.message || 'Đã xoá voucher');
      onDeleted();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const rows = [
    ['Mã voucher', voucher.code],
    ['Loại', KIND_LABEL[kindOf(voucher)]],
    ['Chi nhánh', voucher.venueId?.name || 'Chưa rõ'],
    ['Ưu đãi', labels.discountLabel],
    ['Điều kiện', labels.conditionLabel],
    ['Ghi chú', voucher.description || 'Không có'],
    ['Cách phát mã', voucher.codeType === 'unique' ? 'Mã riêng mỗi bạn' : 'Mã chung'],
    ['Cách dùng tại quầy', scanRule(voucher)],
    ['Số lượng', quantityLabel(voucher)],
    ['Giá UniCoin', voucher.coinCost > 0 ? `${voucher.coinCost} UniCoin` : 'Miễn phí'],
    ['Đã phát', `${voucher.codeType === 'unique' ? voucher.claimedCount || 0 : voucher.issuedCount ?? voucher.claimedCount ?? 0}`],
    ['Đã dùng tại quầy', `${(voucher.redeemedByQr || 0) + (voucher.redeemedByCode || 0)}`],
    ['Hạn sử dụng', voucher.validUntil ? new Date(voucher.validUntil).toLocaleDateString('vi-VN') : 'Không thời hạn'],
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
      <div role="dialog" aria-label="Chi tiết voucher" style={{ width: '100%', maxWidth: '520px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', borderRadius: '20px', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{voucher.title}</h3>
            <div style={{ marginTop: '6px' }}><VoucherStatusBadge status={voucher.status} label={voucher.statusLabel} /></div>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '8px 24px 16px' }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '12px', padding: '9px 0', borderBottom: '1px solid var(--border-light)', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: '600', overflowWrap: 'anywhere' }}>{value}</span>
            </div>
          ))}
          {hasRecipients && (
            <p style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FFF7ED', color: '#9A3412', fontSize: '12.5px', lineHeight: 1.5 }}>
              Đã có sinh viên nhận voucher này nên không xoá được. Chỉ sửa được tên, ghi chú, gia hạn, tăng số lượng và bật chỉ quét QR. Muốn ngừng phát thì bấm Tạm dừng.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', padding: '14px 24px', borderTop: '1px solid var(--border-color)' }}>
          {!hasRecipients && (
            <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-secondary" style={{ color: '#DC2626' }}>
              {deleting ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16} />} Xoá
            </button>
          )}
          <button type="button" onClick={onEdit} className="btn btn-primary">
            <Pencil size={16} /> Sửa
          </button>
        </div>
      </div>
    </div>
  );
}
