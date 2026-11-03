import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Gift, Loader2, Ticket } from 'lucide-react';
import { formatMeetupTime } from '../../utils/meetup';
import { confirmDialog } from '../../utils/notify';

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
 * Thẻ "Rủ cả nhóm đi cafe" trong chat nhóm.
 * currentUserId: người đang xem. busy: đang gửi thao tác cho thẻ này. onAction('join' | 'leave' | 'cancel').
 */
export function GroupMeetupCard({ meetup, currentUserId, busy, onAction }) {
  const status = STATUS[meetup.status] || STATUS.proposed;
  const time = formatMeetupTime(meetup.scheduledAt);
  const participants = meetup.participants || [];
  const joined = participants.some((p) => String(p.user) === String(currentUserId));
  const isOrganizer = String(meetup.proposedBy) === String(currentUserId);
  const isOpen = meetup.status === 'proposed' || meetup.status === 'accepted';
  const isFull = participants.length >= (meetup.maxPeople || Infinity);
  const rewardDone = meetup.status === 'accepted' || meetup.status === 'completed';
  const rewardRevoked = Boolean(meetup.rewardTitle) && (meetup.status === 'cancelled' || meetup.status === 'no_show');

  const confirmThen = async (text, label, action) => {
    if (await confirmDialog(text, { confirmText: label, cancelText: 'Không', danger: true })) onAction(action);
  };
  const linkBtn = { alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: '#94A3B8', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' };

  return (
    <div style={{ width: '260px', maxWidth: '100%', backgroundColor: '#FFFFFF', color: '#0F172A', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
      {meetup.venueImage && (
        <img src={meetup.venueImage} alt={meetup.venueName} style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#FF5722' }}>☕ Rủ cả nhóm đi cafe</span>
          <span style={{ fontSize: '10.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', color: status.color, backgroundColor: status.bg, whiteSpace: 'nowrap' }}>
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

        {meetup.rewardTitle && (rewardDone || meetup.status === 'proposed') && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '7px 9px', borderRadius: '8px', backgroundColor: '#FFF7ED', border: '1px dashed #FDBA74', fontSize: '12px', color: '#9A3412' }}>
            <Gift size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              {rewardDone ? 'Mỗi bạn tham gia có trong ví: ' : 'Có từ 2 bạn tham gia, mỗi bạn nhận: '}
              <strong>{meetup.rewardTitle}</strong>
            </span>
          </div>
        )}
        {!meetup.rewardTitle && (rewardDone || meetup.status === 'proposed') && (meetup.rewardNote || meetup.status === 'accepted') && (
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>{meetup.rewardNote || 'Quán chưa có ưu đãi hẹn cafe.'}</div>
        )}

        <div style={{ fontSize: '12px', color: '#334155' }}>
          <strong>
            {participants.length}{meetup.maxPeople ? `/${meetup.maxPeople}` : ''} bạn tham gia:
          </strong>{' '}
          {participants.map((p) => p.fullName).join(', ')}
        </div>

        {isOpen && !joined && !isFull && (
          <button type="button" disabled={busy} onClick={() => onAction('join')} style={actionBtn(true)}>
            {busy ? <Loader2 size={13} className="spinner" /> : null} Tham gia
          </button>
        )}
        {isOpen && !joined && isFull && (
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>Buổi hẹn này đã đủ người.</div>
        )}

        {meetup.status === 'proposed' && isOrganizer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '11.5px', color: '#64748B' }}>
            <span>Đang chờ các bạn trong nhóm tham gia</span>
            <button type="button" disabled={busy} onClick={() => onAction('cancel')} style={{ ...linkBtn, alignSelf: 'center', flexShrink: 0 }}>
              Huỷ lời mời
            </button>
          </div>
        )}

        {meetup.status === 'accepted' && joined && (
          <>
            {meetup.rewardTitle && (
              <Link to="/user/vouchers" style={{ ...actionBtn(true), textDecoration: 'none' }}>
                <Ticket size={13} /> Mở ví voucher
              </Link>
            )}
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              {meetup.rewardTitle
                ? 'Cả nhóm cùng tới quán: quán quét mã QR trong ví của từ 2 bạn trở lên rồi mới áp dụng ưu đãi (đi một mình không dùng được). Hoặc từ 2 bạn cùng quét QR check-in của quán để được tính là đã gặp.'
                : 'Tới quán, từ 2 bạn cùng quét mã QR check-in dán tại quán trong ngày để được tính là đã gặp.'}
            </div>
            {isOrganizer ? (
              <button type="button" disabled={busy} onClick={() => confirmThen('Huỷ buổi hẹn này? Ưu đãi chưa dùng của mọi người sẽ bị thu hồi khỏi ví.', 'Huỷ buổi hẹn', 'cancel')} style={linkBtn}>
                Huỷ buổi hẹn
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => confirmThen('Không đi nữa? Ưu đãi chưa dùng của bạn sẽ bị thu hồi khỏi ví.', 'Không đi nữa', 'leave')} style={linkBtn}>
                Không đi nữa
              </button>
            )}
          </>
        )}

        {meetup.status === 'completed' && (
          <div style={{ fontSize: '11.5px', color: '#1D4ED8', fontWeight: '700' }}>
            Nhóm đã gặp nhau tại quán. Bạn nào có mặt được thưởng UniCoin 🎉 (tính trong giới hạn 60 UniCoin/ngày). Bạn đến muộn vẫn dùng được ưu đãi trong 24 giờ.
          </div>
        )}

        {rewardRevoked && (
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>Ưu đãi chưa dùng của buổi này đã được thu hồi khỏi ví.</div>
        )}

        {meetup.status === 'expired' && (
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>Lời mời không có ai tham gia trong 48 giờ nên đã hết hạn.</div>
        )}

        {meetup.status === 'no_show' && (
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>Đã quá giờ hẹn mà chưa ghi nhận nhóm tới quán.</div>
        )}
      </div>
    </div>
  );
}

/**
 * Thẻ "Rủ đi cafe" trong khung chat.
 * isMine: mình là người mời. busy: đang gửi trả lời cho thẻ này.
 */
export default function MeetupCard({ meetup, isMine, buddyName, busy, onRespond, onCancel }) {
  const status = STATUS[meetup.status] || STATUS.proposed;
  const time = formatMeetupTime(meetup.scheduledAt);
  const rewardDone = meetup.status === 'accepted' || meetup.status === 'completed';
  // Lời mời bị từ chối / huỷ / hết hạn thì không còn ưu đãi để hứa
  const rewardOpen = rewardDone || meetup.status === 'proposed';
  // Buổi đã chốt có voucher trong ví mà không diễn ra thì voucher bị thu hồi
  const rewardRevoked = Boolean(meetup.rewardTitle) && (meetup.status === 'cancelled' || meetup.status === 'no_show');

  const handleCancelAccepted = async () => {
    const agreed = await confirmDialog('Huỷ buổi hẹn này? Ưu đãi chưa dùng của cả hai bạn sẽ bị thu hồi khỏi ví.', {
      confirmText: 'Huỷ buổi hẹn',
      cancelText: 'Không',
      danger: true,
    });
    if (agreed) onCancel();
  };

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

        {meetup.rewardTitle && rewardOpen ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '7px 9px', borderRadius: '8px', backgroundColor: '#FFF7ED', border: '1px dashed #FDBA74', fontSize: '12px', color: '#9A3412' }}>
            <Gift size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              {rewardDone ? 'Đã vào ví của cả hai: ' : 'Chốt hẹn, cả hai cùng nhận: '}
              <strong>{meetup.rewardTitle}</strong>
            </span>
          </div>
        ) : (
          rewardOpen && (meetup.rewardNote || meetup.status === 'accepted') && (
            <div style={{ fontSize: '11.5px', color: '#64748B' }}>{meetup.rewardNote || 'Quán chưa có ưu đãi hẹn cafe.'}</div>
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
                ? 'Hai bạn cùng tới quán: quán quét mã QR trong ví của cả hai rồi mới áp dụng ưu đãi (đi một mình không dùng được). Hoặc cả hai quét QR check-in của quán để được tính là đã gặp.'
                : 'Tới quán, cả hai cùng quét mã QR check-in dán tại quán trong ngày để được tính là đã gặp.'}
            </div>
            <button type="button" disabled={busy} onClick={handleCancelAccepted} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: '#94A3B8', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
              Huỷ buổi hẹn
            </button>
          </>
        )}

        {meetup.status === 'completed' && (
          <div style={{ fontSize: '11.5px', color: '#1D4ED8', fontWeight: '700' }}>
            Hai bạn đã gặp nhau tại quán. Mỗi người được thưởng UniCoin 🎉 (tính trong giới hạn 60 UniCoin/ngày)
          </div>
        )}

        {rewardRevoked && (
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>Ưu đãi chưa dùng của buổi này đã được thu hồi khỏi ví.</div>
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
