import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, Crown, Gift, Loader2, Ticket, X } from 'lucide-react';
import { voucherApi } from '../../services/api';
import { describeVoucher, groupDigits, onlyDigits } from '../../utils/voucher';

// Loại voucher quyết định sinh viên thấy voucher ở đâu
const KINDS = [
  {
    id: 'normal',
    icon: Ticket,
    title: 'Voucher thường',
    desc: 'Hiện trong mục Voucher cho mọi sinh viên. Sinh viên bấm Lưu để đưa vào ví (miễn phí hoặc đổi UniCoin).',
  },
  {
    id: 'meetup',
    icon: Coffee,
    title: 'Ưu đãi hẹn cafe',
    desc: 'Không hiện trong danh sách. Khi 2 sinh viên rủ nhau tới quán bạn và chốt hẹn, mỗi người tự nhận 1 ưu đãi này.',
  },
  {
    id: 'premium',
    icon: Crown,
    title: 'Chỉ Premium',
    desc: 'Hiện cho mọi sinh viên, nhưng chỉ thành viên Premium mới lưu được. Dùng cho ưu đãi lớn.',
  },
];

const DISCOUNT_TYPES = [
  { id: 'percent', label: 'Giảm theo %' },
  { id: 'amount', label: 'Giảm số tiền' },
  { id: 'gift', label: 'Tặng quà' },
];

const WHERE_SHOWN = {
  normal: 'Hiện trong mục Voucher → sinh viên bấm Lưu → vào Ví voucher',
  meetup: 'Không hiện trong danh sách → tự vào ví cả 2 bạn khi chốt hẹn tại quán',
  premium: 'Hiện trong mục Voucher, có khoá Premium → chỉ Premium lưu được',
};

const endOfYear = () => `${new Date().getFullYear()}-12-31`;

const field = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' };
const hint = { fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' };
const section = { display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '14px', borderTop: '1px solid var(--border-light)' };
const sectionTitle = { fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' };

// Ưu tiên chi nhánh đã được admin duyệt (voucher hiện cho sinh viên ngay)
const defaultVenue = (venues) => venues.find((v) => v.status === 'approved') || venues[0];

const errorHint = { fontSize: '12px', color: '#B91C1C', marginTop: '6px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' };
const fixBtn = { background: 'none', border: 'none', padding: 0, color: '#C2410C', fontWeight: '800', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' };

/** Ô chỉ nhận chữ số, đơn vị (% hoặc đ) gắn cố định bên phải để quán không nhầm */
function UnitInput({ unit, value, onChange, placeholder, invalid }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', border: `1.5px solid ${invalid ? '#EF4444' : 'var(--border-color)'}`, borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(onlyDigits(e.target.value))}
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, padding: '10px 12px', border: 'none', outline: 'none', fontSize: '14px', fontWeight: '700' }}
      />
      <span style={{ padding: '10px 12px', backgroundColor: '#F1F5F9', color: 'var(--text-secondary)', fontWeight: '800', fontSize: '14px', borderLeft: '1px solid var(--border-color)' }}>
        {unit}
      </span>
    </div>
  );
}

function QuickPicks({ values, format, onPick }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          style={{ padding: '3px 10px', borderRadius: '999px', border: '1px solid var(--border-color)', backgroundColor: '#F8FAFC', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
        >
          {format(v)}
        </button>
      ))}
    </div>
  );
}

const initialForm = (venues, kind = 'normal') => ({
  kind,
  venueId: defaultVenue(venues)?._id || defaultVenue(venues)?.id || '',
  title: '',
  code: '',
  discountType: 'percent',
  discountPercent: '',
  maxDiscount: '',
  discountAmount: '',
  giftItem: '',
  minBill: '',
  description: '',
  codeType: 'shared',
  quantity: '100',
  isUnlimited: false,
  walletOnly: false,
  coinCost: '0',
  expiry: endOfYear(),
});

/** Form phát hành voucher của quán đối tác */
export default function CreateVoucherModal({ open, onClose, venues, onCreated, initialKind = 'normal' }) {
  const [form, setForm] = useState(() => initialForm(venues, initialKind));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  // Danh sách chi nhánh có thể tải xong sau khi mở form → mặc định chọn chi nhánh đầu tiên
  const venueId = form.venueId || defaultVenue(venues)?._id || defaultVenue(venues)?.id || '';
  const venue = venues.find((v) => (v._id || v.id) === venueId);

  const preview = useMemo(
    () =>
      describeVoucher({
        discountType: form.discountType,
        discountPercent: Number(form.discountPercent) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        discountAmount: Number(form.discountAmount) || 0,
        giftItem: form.giftItem.trim(),
        minBill: Number(form.minBill) || 0,
      }),
    [form.discountType, form.discountPercent, form.maxDiscount, form.discountAmount, form.giftItem, form.minBill]
  );

  // Báo ngay khi gõ: % ngoài 1–100, hoặc số tiền dưới 1.000đ (thường là gõ nhầm % vào ô tiền)
  const percentTooBig = form.discountPercent !== '' && !(Number(form.discountPercent) >= 1 && Number(form.discountPercent) <= 100);
  const amountTooSmall = form.discountAmount !== '' && Number(form.discountAmount) < 1000;
  const switchToAmount = (value) => setForm((prev) => ({ ...prev, discountType: 'amount', discountAmount: value, discountPercent: '' }));
  const switchToPercent = (value) => setForm((prev) => ({ ...prev, discountType: 'percent', discountPercent: value, discountAmount: '' }));

  if (!open) return null;

  const validate = () => {
    if (!venueId) return 'Bạn cần thêm chi nhánh ở mục Quản lý địa điểm trước';
    if (!form.title.trim()) return 'Vui lòng nhập tên chương trình';
    if (!/^[A-Z0-9_-]{3,30}$/.test(form.code)) return 'Mã voucher gồm 3–30 ký tự: chữ không dấu, số, gạch ngang';
    if (form.discountType === 'percent') {
      const p = Number(form.discountPercent);
      if (!(p >= 1 && p <= 100)) return 'Phần trăm giảm phải từ 1 đến 100';
    }
    if (form.discountType === 'amount' && !(Number(form.discountAmount) >= 1000)) return 'Số tiền giảm tối thiểu 1.000đ';
    if (form.discountType === 'gift' && !form.giftItem.trim()) return 'Vui lòng nhập món quà tặng';
    if (form.codeType === 'shared' && !form.isUnlimited && !(Number(form.quantity) >= 1)) return 'Số lượng phát hành phải từ 1 trở lên';
    if (!form.expiry) return 'Vui lòng chọn hạn sử dụng';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await voucherApi.createVoucher({
        venueId,
        title: form.title.trim(),
        code: form.code,
        discountType: form.discountType,
        discountPercent: Number(form.discountPercent) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        discountAmount: Number(form.discountAmount) || 0,
        giftItem: form.giftItem.trim(),
        minBill: Number(form.minBill) || 0,
        description: form.description.trim(),
        codeType: form.codeType,
        isUnlimited: form.codeType === 'shared' && form.isUnlimited,
        walletOnly: form.codeType === 'shared' && form.walletOnly,
        quantity: Number(form.quantity) || 0,
        coinCost: form.kind === 'meetup' ? 0 : Number(form.coinCost) || 0,
        premiumOnly: form.kind === 'premium',
        meetupReward: form.kind === 'meetup',
        // Hết hạn vào cuối ngày đã chọn, theo giờ máy của quán
        validUntil: new Date(`${form.expiry}T23:59:59`).toISOString(),
      });
      setForm(initialForm(venues));
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', borderRadius: '20px', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>Tạo voucher ưu đãi mới</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1. Loại voucher */}
          <div>
            <div style={{ ...sectionTitle, marginBottom: '8px' }}>1. LOẠI VOUCHER</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
              {KINDS.map((k) => {
                const active = form.kind === k.id;
                const Icon = k.icon;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => set('kind', k.id)}
                    style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '12px', border: `2px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: active ? '#FFF7ED' : '#FFFFFF', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: active ? '#C2410C' : 'var(--text-primary)' }}>
                      <Icon size={15} /> {k.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.45 }}>{k.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Thông tin */}
          <div style={section}>
            <div style={sectionTitle}>2. THÔNG TIN</div>
            <div>
              <label style={labelStyle}>Chi nhánh áp dụng *</label>
              {venues.length > 0 ? (
                <select value={venueId} onChange={(e) => set('venueId', e.target.value)} style={field}>
                  {venues.map((v) => (
                    <option key={v._id || v.id} value={v._id || v.id}>
                      {v.name}{v.status && v.status !== 'approved' ? ' (chờ admin duyệt)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ ...field, backgroundColor: '#FFF7ED', color: '#C2410C' }}>
                  Bạn chưa có chi nhánh nào. Vào <Link to="/partner/venues" style={{ color: '#C2410C', fontWeight: '700' }}>Quản lý địa điểm</Link> để thêm.
                </div>
              )}
              {venue?.status && venue.status !== 'approved' && (
                <div style={hint}>Chi nhánh này đang chờ admin duyệt: tạo voucher trước được, sinh viên sẽ thấy sau khi được duyệt.</div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Tên chương trình *</label>
                <input style={field} maxLength={100} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="VD: Giảm 20% cho cặp đôi học bài" />
              </div>
              <div>
                <label style={labelStyle}>Mã voucher *</label>
                <input
                  style={{ ...field, textTransform: 'uppercase', fontWeight: '700' }}
                  maxLength={30}
                  value={form.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="VD: TCH-HEN20"
                />
              </div>
            </div>
          </div>

          {/* 3. Ưu đãi */}
          <div style={section}>
            <div style={sectionTitle}>3. ƯU ĐÃI</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {DISCOUNT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('discountType', t.id)}
                  style={{ padding: '7px 14px', borderRadius: '999px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', border: `1.5px solid ${form.discountType === t.id ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: form.discountType === t.id ? 'var(--primary)' : '#FFFFFF', color: form.discountType === t.id ? '#FFFFFF' : 'var(--text-secondary)' }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {form.discountType === 'percent' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Giảm bao nhiêu phần trăm? *</label>
                  <UnitInput
                    unit="%"
                    invalid={percentTooBig}
                    value={form.discountPercent}
                    onChange={(v) => set('discountPercent', v.slice(0, 9))}
                    placeholder="VD: 20"
                  />
                  <QuickPicks values={[10, 15, 20, 30, 50]} format={(v) => `${v}%`} onPick={(v) => set('discountPercent', String(v))} />
                  {percentTooBig && (
                    <div style={errorHint}>
                      Phần trăm chỉ từ 1 đến 100.
                      {Number(form.discountPercent) >= 1000 && (
                        <button type="button" onClick={() => switchToAmount(form.discountPercent)} style={fixBtn}>
                          Ý bạn là giảm {groupDigits(form.discountPercent)}đ? Bấm để đổi
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Giảm tối đa</label>
                  <UnitInput unit="đ" value={groupDigits(form.maxDiscount)} onChange={(v) => set('maxDiscount', v)} placeholder="Để trống = không giới hạn" />
                  <div style={hint}>VD: giảm 20% nhưng không quá 30.000đ</div>
                </div>
              </div>
            )}
            {form.discountType === 'amount' && (
              <div>
                <label style={labelStyle}>Giảm bao nhiêu tiền? *</label>
                <UnitInput
                  unit="đ"
                  invalid={amountTooSmall}
                  value={groupDigits(form.discountAmount)}
                  onChange={(v) => set('discountAmount', v)}
                  placeholder="VD: 15.000"
                />
                <QuickPicks values={[10000, 15000, 20000, 30000, 50000]} format={(v) => `${groupDigits(String(v))}đ`} onPick={(v) => set('discountAmount', String(v))} />
                {amountTooSmall && (
                  <div style={errorHint}>
                    Số tiền giảm tối thiểu 1.000đ.
                    {Number(form.discountAmount) <= 100 && (
                      <button type="button" onClick={() => switchToPercent(form.discountAmount)} style={fixBtn}>
                        Ý bạn là giảm {form.discountAmount}%? Bấm để đổi
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {form.discountType === 'gift' && (
              <div>
                <label style={labelStyle}>Món tặng *</label>
                <input style={field} maxLength={100} value={form.giftItem} onChange={(e) => set('giftItem', e.target.value)} placeholder="VD: 1 bánh flan, 2 giờ chơi boardgame" />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Hoá đơn tối thiểu (đ)</label>
                <input style={field} inputMode="numeric" value={groupDigits(form.minBill)} onChange={(e) => set('minBill', onlyDigits(e.target.value))} placeholder="Để trống = không yêu cầu" />
              </div>
              <div>
                <label style={labelStyle}>Hạn sử dụng *</label>
                <input type="date" style={field} value={form.expiry} min={new Date().toISOString().split('T')[0]} onChange={(e) => set('expiry', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Điều kiện / ghi chú</label>
              <textarea style={{ ...field, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} maxLength={500} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="VD: Áp dụng thứ 2 – thứ 6, không cộng dồn khuyến mãi khác" />
            </div>
          </div>

          {/* 4. Phát hành */}
          <div style={section}>
            <div style={sectionTitle}>4. PHÁT HÀNH</div>
            <div style={{ display: 'grid', gridTemplateColumns: form.kind === 'meetup' ? '1fr 1fr' : '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Cách phát mã</label>
                <select style={field} value={form.codeType} onChange={(e) => set('codeType', e.target.value)}>
                  <option value="shared">Mã chung</option>
                  <option value="unique">Mã riêng mỗi bạn</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Số lượng</label>
                {form.codeType === 'unique' ? (
                  <div style={{ ...hint, marginTop: 0, paddingTop: '10px' }}>Bằng số mã bạn nạp sau khi tạo</div>
                ) : (
                  <>
                    <input style={{ ...field, backgroundColor: form.isUnlimited ? '#F1F5F9' : '#FFFFFF' }} inputMode="numeric" disabled={form.isUnlimited} value={form.isUnlimited ? '' : form.quantity} onChange={(e) => set('quantity', onlyDigits(e.target.value))} placeholder={form.isUnlimited ? 'Không giới hạn' : '100'} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: '6px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.isUnlimited} onChange={(e) => set('isUnlimited', e.target.checked)} /> Không giới hạn
                    </label>
                    <label title="Thu ngân không gõ được mã chung; sinh viên phải đưa QR trong ví" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.walletOnly} onChange={(e) => set('walletOnly', e.target.checked)} /> Chỉ quét QR trong ví
                    </label>
                  </>
                )}
              </div>
              {form.kind !== 'meetup' && (
                <div>
                  <label style={labelStyle}>Giá UniCoin</label>
                  <input style={field} inputMode="numeric" value={form.coinCost} onChange={(e) => set('coinCost', onlyDigits(e.target.value))} placeholder="0 = miễn phí" />
                  <div style={hint}>0 = sinh viên lưu miễn phí</div>
                </div>
              )}
            </div>
          </div>

          {/* Xem trước */}
          <div style={{ ...section, gap: '8px' }}>
            <div style={sectionTitle}>SINH VIÊN SẼ THẤY</div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: '#F8FAFC' }}>
              <div style={{ minWidth: '72px', padding: '10px 8px', borderRadius: '10px', backgroundColor: '#FF5722', color: '#FFFFFF', fontWeight: '900', fontSize: '14px', textAlign: 'center' }}>
                {form.discountType === 'gift' ? <Gift size={20} /> : preview.discountShort}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{form.title.trim() || 'Tên chương trình'}</div>
                <div style={{ fontSize: '12px', color: '#E64A19', fontWeight: '700' }}>{venue?.name || 'Chi nhánh'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{preview.discountLabel} · {preview.conditionLabel}</div>
              </div>
            </div>
            <div style={hint}>{WHERE_SHOWN[form.kind]}</div>
          </div>

          {error && <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: '13px' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || venues.length === 0}>
              {submitting ? <Loader2 size={16} className="spinner" /> : null} Phát hành voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
