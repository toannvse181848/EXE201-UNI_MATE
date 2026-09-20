import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Store,
  Sparkles,
} from 'lucide-react';

export default function PendingReview() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const handleSimulateApprove = () => {
    const updated = { ...user, status: 'active' };
    setUser(updated);
    localStorage.setItem('unimate_portal_user', JSON.stringify(updated));
    navigate('/partner/dashboard');
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', paddingTop: '20px' }}>
      <div className="portal-card" style={{ padding: '40px', textAlign: 'center' }}>
        {/* Illustration Icon */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '28px',
            backgroundColor: '#FEF3C7',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D97706',
            marginBottom: '20px',
          }}
        >
          <FileText size={44} />
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Hồ sơ đang chờ duyệt
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 32px' }}>
          Cảm ơn bạn đã đăng ký làm đối tác UNI-MATE. Đội ngũ admin sàn đang tiến hành kiểm tra thông tin địa điểm và sẽ phản hồi trong vòng 24 giờ làm việc.
        </p>

        {/* Verification Checklist */}
        <div
          style={{
            backgroundColor: 'var(--bg-page)',
            borderRadius: '18px',
            padding: '24px',
            textAlign: 'left',
            marginBottom: '32px',
            border: '1px solid var(--border-color)',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Tiến độ xác thực hồ sơ đối tác
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={20} color="#10B981" />
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  1. Thông tin đối tác doanh nghiệp (Profile)
                </span>
              </div>
              <span className="badge badge-success">Đã hoàn thành</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={20} color="#10B981" />
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  2. Thông tin địa điểm cơ sở (The Coffee House - Sư Vạn Hạnh)
                </span>
              </div>
              <span className="badge badge-success">Đã hoàn thành</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={20} color="#10B981" />
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  3. Hình ảnh không gian & menu đồ uống (Photos)
                </span>
              </div>
              <span className="badge badge-success">Đã hoàn thành</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FFFBEB', borderRadius: '12px', border: '1px solid #FDE68A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={20} color="#D97706" />
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#92400E' }}>
                  4. Trạng thái xét duyệt từ Admin UNI-MATE
                </span>
              </div>
              <span className="badge badge-warning">Đang chờ (Pending)</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/partner/venues')}
            className="btn btn-secondary"
            style={{ padding: '12px 24px' }}
          >
            <Edit3 size={16} />
            <span>Chỉnh sửa hồ sơ quán</span>
          </button>

          {/* Quick Simulation CTA */}
          <button
            onClick={handleSimulateApprove}
            className="btn btn-primary"
            style={{ padding: '12px 24px' }}
          >
            <Sparkles size={16} />
            <span>Mô phỏng: Admin duyệt ngay (Xem Dashboard)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
