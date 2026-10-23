import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Gift, Loader2, Ticket } from 'lucide-react';
import { formatMeetupTime } from '../../utils/meetup';

const STATUS = {
  proposed: { label: 'Chờ trả lời', color: '#B45309', bg: '#FEF3C7' },
  accepted: { label: 'Đã chốt hẹn', color: '#047857', bg: '#D1FAE5' },
  completed: { label: 'Đã gặp tại quán', color: '#1D4ED8', bg: '#DBEAFE' },
  declined: { label: 'Đã từ chối', color: '#64748B', bg: '#F1F5F9' },
  cancelled: { label: 'Đã huỷ', color: '#64748B', bg: '#F1F5F9' },
  expired: { label: 'Hết hạn', color: '#64748B', bg: '#F1F5F9' },
  no_show: { label: 'Không diễn ra', color: '#64748B', bg: '#F1F5F9' },
};

const actionBtn = (primary) => ({
  flex: 1,
  padding: '8px 10px',
  borderRadius: '8px',
  border: primary ? 'none' : '1px solid #E2E8F0',
  backgroundColor: primary ? '#FF5722' : '#FFFFFF',
  color: primary ? '#FFFFFF' : '#475569',
  fontSize: '12.5px',
  fontWeight: '800',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
});

/**
 * Thẻ "Rủ đi cafe" trong khung chat.
 * isMine: mình là người mời. busy: đang gửi trả lời cho thẻ này.
 */
export default function MeetupCard({ meetup, isMine, buddyName, busy, onRespond, onCancel }) {
  const status = STATUS[meetup.status] || STATUS.proposed;
  const time = formatMeetupTime(meetup.scheduledAt);
  const rewardDone = meetup.status === 'accepted' || meetup.status === 'completed';

  return (
    <div style={{ width: '260px', maxWidth: '100%', backgroundColor: '#FFFFFF', color: '#0F172A', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
      {meetup.venueImage && (
        <img src={meetup.venueImage} alt={meetup.venueName} style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#FF5722' }}>☕ Rủ đi cafe</span>
          <span style={{ fontSize: '10.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', color: status.color, backgroundColor: status.bg }}>
            {status.label}
          </span>
        </div>

        <div>
          <div style={{ fontSize: '14px', fontWeight: '800' }}>{meetup.venueName}</div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>{meetup.venueAddress}</div>
        </div>

        {time && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#334155', fontWeight: '600' }}>
            <Clock size={13} /> {time}
          </div>
        )}

        {meetup.rewardTitle ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '7px 9px', borderRadius: '8px', backgroundColor: '#FFF7ED', border: '1px dashed #FDBA74', fontSize: '12px', color: '#9A3412' }}>
            <Gift size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              {rewardDone ? 'Đã vào ví của cả hai: ' : 'Chốt hẹn, cả hai cùng nhận: '}
              <strong>{meetup.rewardTitle}</strong>
            </span>
          </div>
        ) : (
          meetup.status === 'accepted' && (
            <div style={{ fontSize: '11.5px', color: '#64748B' }}>Quán chưa có ưu đãi hẹn cafe.</div>
          )
        )}

        {meetup.status === 'proposed' && !isMine && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
            <button type="button" disabled={busy} onClick={() => onRespond('accept')} style={actionBtn(true)}>
              {busy ? <Loader2 size={13} className="spinner" /> : null} Đồng ý
            </button>
            <button type="button" disabled={busy} onClick={() => onRespond('decline')} style={actionBtn(false)}>
              Để lần khác
            </button>
          </div>
        )}

        {meetup.status === 'proposed' && isMine && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '11.5px', color: '#64748B' }}>
            <span>Đang chờ {buddyName || 'bạn ấy'} trả lời</span>
            <button type="button" disabled={busy} onClick={onCancel} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
              Huỷ lời mời
            </button>
          </div>
        )}

        {meetup.status === 'accepted' && (
          <>
            {meetup.rewardTitle && (
              <Link to="/user/vouchers" style={{ ...actionBtn(true), textDecoration: 'none' }}>
                <Ticket size={13} /> Mở ví voucher
              </Link>
            )}
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              {meetup.rewardTitle
                ? 'Tới quán, mỗi người đưa mã QR trong ví cho quán quét để dùng ưu đãi (hoặc cả hai cùng quét QR check-in của quán).'
                : 'Tới quán, cả hai cùng quét mã QR check-in dán tại quán trong ngày để được tính là đã gặp.'}
            </div>
          </>
        )}

        {meetup.status === 'completed' && (
          <div style={{ fontSize: '11.5px', color: '#1D4ED8', fontWeight: '700' }}>
            Hai bạn đã gặp nhau tại quán. Mỗi người được thưởng UniCoin 🎉
          </div>
        )}

        {meetup.status === 'expired' && (
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>Lời mời không được trả lời trong 48 giờ nên đã hết hạn.</div>
        )}

        {meetup.status === 'no_show' && (
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>Đã quá giờ hẹn mà chưa ghi nhận hai bạn tới quán.</div>
        )}
      </div>
    </div>
  );
}
