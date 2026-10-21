import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, Crown, Gift, Loader2, Search, Send, Sparkles, X } from 'lucide-react';
import { meetupApi, venueApi } from '../../services/api';
import { trackEvent } from '../../utils/analytics';
import { toDateTimeLocal } from '../../utils/meetup';

/**
 * Khung "Rủ đi cafe": chọn quán đối tác (+ giờ hẹn nếu muốn) rồi gửi lời mời vào hội thoại.
 * Quán trả Gói Đối tác đứng đầu, quán có ưu đãi hẹn cafe đứng trước quán chưa có.
 */
export default function MeetupInviteModal({ open, onClose, matchId, buddyName, onInvited }) {
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [search, setSearch] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [quota, setQuota] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [error, setError] = useState('');
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setSearch('');
    setError('');
    setQuotaBlocked(false);
    meetupApi
      .getQuota()
      .then((res) => !cancelled && setQuota(res.data || null))
      .catch(() => {});
    if (venues.length === 0) {
      setLoadingVenues(true);
      venueApi
        .getPublicVenues()
        .then((res) => {
          if (cancelled) return;
          const list = [...(res.data || [])];
          list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(Boolean(b.meetupReward)) - Number(Boolean(a.meetupReward)));
          setVenues(list);
        })
        .catch((err) => !cancelled && setError(err.message))
        .finally(() => !cancelled && setLoadingVenues(false));
    }
    return () => {
      cancelled = true;
    };
    // Danh sách quán chỉ tải lần đầu mở khung
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const shown = q ? venues.filter((v) => v.name?.toLowerCase().includes(q) || v.address?.toLowerCase().includes(q)) : venues;

  const handleInvite = async (venue) => {
    if (sendingId) return;
    setSendingId(venue._id);
    setError('');
    try {
      const res = await meetupApi.create({
        matchId,
        venueId: venue._id,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      trackEvent('meetup_invite', { venue_name: venue.name, has_reward: Boolean(venue.meetupReward) });
      onInvited(res.data?.message);
      onClose();
    } catch (err) {
      if (err.code === 'MEETUP_QUOTA') setQuotaBlocked(true);
      else setError(err.message);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coffee size={20} color="#FF5722" /> Rủ {buddyName || 'bạn ấy'} đi cafe
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Bạn ấy đồng ý là chốt hẹn. Quán có ưu đãi hẹn cafe thì cả hai cùng nhận vào ví.
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        {quotaBlocked ? (
          <div style={{ padding: '24px 22px', textAlign: 'center' }}>
            <Crown size={36} color="#F59E0B" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Bạn đã dùng hết {quota?.limit || 3} lượt rủ cafe tuần này</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Nâng cấp Premium để rủ bạn bè đi cafe không giới hạn, xem ai đã thích bạn và mở khoá voucher độc quyền.
            </p>
            <Link to="/user/profile?upgrade=monthly" onClick={onClose} style={{ display: 'inline-block', padding: '11px 20px', borderRadius: '12px', backgroundColor: '#FF5722', color: '#FFFFFF', fontWeight: '800', fontSize: '14px', textDecoration: 'none' }}>
              Nâng cấp Premium – 49.000đ/tháng
            </Link>
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                Giờ hẹn (không bắt buộc)
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={toDateTimeLocal(new Date())}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--border-color)', fontSize: '13.5px', outline: 'none', fontFamily: 'inherit' }}
                />
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm quán theo tên hoặc địa chỉ..."
                  style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {quota && !quota.isPremium && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Còn <strong style={{ color: 'var(--text-primary)' }}>{quota.remaining}/{quota.limit}</strong> lượt rủ cafe trong 7 ngày ·{' '}
                  <Link to="/user/profile?upgrade=monthly" onClick={onClose} style={{ color: '#FF5722', fontWeight: '700' }}>Premium không giới hạn</Link>
                </div>
              )}
              {error && <div style={{ fontSize: '12.5px', color: '#DC2626' }}>{error}</div>}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loadingVenues ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}><Loader2 size={22} className="spinner" /></div>
              ) : shown.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', backgroundColor: '#F8FAFC', borderRadius: '12px', fontSize: '13px' }}>Không tìm thấy quán phù hợp</div>
              ) : (
                shown.map((venue) => {
                  const thumb = venue.images?.[0] || venue.image;
                  return (
                    <div key={venue._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px', border: `1.5px solid ${venue.isFeatured ? '#FDBA74' : 'var(--border-color)'}`, backgroundColor: venue.isFeatured ? '#FFFBF5' : '#FFFFFF' }}>
                      {thumb ? (
                        <img src={thumb} alt={venue.name} style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '52px', height: '52px', borderRadius: '10px', backgroundColor: '#FFF3E0', color: '#FF5722', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Coffee size={22} /></div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-primary)' }}>{venue.name}</span>
                          {venue.isFeatured && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '800', color: '#B45309', backgroundColor: '#FEF3C7', padding: '1px 6px', borderRadius: '999px' }}>
                              <Sparkles size={10} /> Nổi bật
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{venue.address}</div>
                        {venue.meetupReward && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: '#C2410C', marginTop: '2px' }}>
                            <Gift size={12} /> Hẹn ở đây, cả hai nhận: {venue.meetupReward.title}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInvite(venue)}
                        disabled={Boolean(sendingId)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', borderRadius: '10px', border: 'none', backgroundColor: '#FF5722', color: '#FFFFFF', fontSize: '12.5px', fontWeight: '800', cursor: sendingId ? 'wait' : 'pointer', flexShrink: 0 }}
                      >
                        {sendingId === venue._id ? <Loader2 size={14} className="spinner" /> : <Send size={14} />} Mời
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
