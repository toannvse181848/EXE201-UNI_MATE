import React, { useEffect, useState } from 'react';
import { CalendarClock, Users } from 'lucide-react';
import { venueApi } from '../../services/api';

const formatWhen = (value) => {
  if (!value) return 'Chưa đặt giờ';
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `Hôm nay ${time}` : `${time} ${date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}`;
};

// Các buổi hẹn sinh viên đã chốt tại quán: để quán chuẩn bị bàn. Không có tên sinh viên, chỉ số người.
export default function UpcomingMeetups() {
  const [meetups, setMeetups] = useState(null);

  useEffect(() => {
    venueApi
      .getUpcomingMeetups()
      .then((res) => setMeetups(res?.data || []))
      .catch(() => setMeetups([]));
  }, []);

  return (
    <div className="portal-card" data-testid="upcoming-meetups">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
        <CalendarClock size={18} color="var(--primary)" />
        Buổi hẹn sắp tới tại quán
      </h3>
      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 12px' }}>
        Sinh viên đã rủ nhau và chốt hẹn tại quán. Biết trước số người để chuẩn bị bàn. Tới quầy, thu ngân quét mã của từ 2 bạn trở lên.
      </p>
      {meetups === null ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Đang tải...</p>
      ) : meetups.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Chưa có buổi hẹn nào đã chốt.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {meetups.map((m) => (
            <div
              key={m.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '12px' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{formatWhen(m.scheduledAt)}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {m.venueName}
                  {m.reward ? ` · Ưu đãi: ${m.reward.title}` : ' · Không có ưu đãi hẹn cafe'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>
                <Users size={15} />
                {m.people} bạn{m.isGroup ? ' (nhóm)' : ''}
                {m.arrived > 0 && <span style={{ color: '#059669' }}>· đã tới {m.arrived}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
