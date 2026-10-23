import React, { useEffect, useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { matchApi } from '../../services/api';
import { getAvatarUrl } from '../../constants/avatar';

/** Danh sách người mình đã chặn (trang Hồ sơ), bỏ chặn được */
export default function BlockedUsersCard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    matchApi
      .getBlocked()
      .then((res) => setItems(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (userId) => {
    setBusyId(userId);
    setError('');
    try {
      await matchApi.unblock(userId);
      setItems((prev) => prev.filter((b) => b.user?.id !== userId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ marginTop: '24px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', padding: '20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <Ban size={20} color="#DC2626" />
        <div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>Người đã chặn</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bỏ chặn thì hai bạn có thể thấy nhau lại ở Khám phá, nhưng phải kết bạn lại từ đầu</div>
        </div>
      </div>
      {error && <p style={{ fontSize: '13px', color: '#DC2626', marginBottom: '8px' }}>{error}</p>}
      {loading ? (
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
      ) : items.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Bạn chưa chặn ai.</p>
      ) : (
        items.map((b) => (
          <div key={b.matchId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={getAvatarUrl(b.user?.avatar)} alt={b.user?.fullName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{b.user?.fullName || 'Người dùng'}</span>
            </div>
            <button
              type="button"
              disabled={busyId === b.user?.id}
              onClick={() => handleUnblock(b.user?.id)}
              style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontSize: '12.5px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
            >
              {busyId === b.user?.id ? 'Đang bỏ chặn...' : 'Bỏ chặn'}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
