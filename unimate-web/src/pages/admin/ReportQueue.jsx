import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  ShieldCheck,
  User,
  Store,
  FileText,
  Send,
} from 'lucide-react';

const INITIAL_REPORTS = [
  {
    id: 'REP-902',
    priority: 'high',
    studentName: 'Lê Phương Thảo (ĐH Bách Khoa)',
    studentPhone: '0934 112 233',
    venueName: 'Highlands Coffee - Vạn Hạnh Mall',
    reportedAt: '10:45 Hôm nay',
    issue: 'Nhân viên thu ngân từ chối áp dụng voucher giảm 15k với lý do không biết chương trình UNI-MATE, dù mã QR trên app hiển thị còn hạn.',
    evidence: 'Ảnh chụp bill 115.000đ không được giảm trừ',
    status: 'pending', // 'pending' | 'resolved'
  },
  {
    id: 'REP-894',
    priority: 'high',
    studentName: 'Đặng Quốc Huy (ĐH FPT)',
    studentPhone: '0988 223 344',
    venueName: 'The Workshop Boardgame Cafe',
    reportedAt: 'Hôm qua, 20:15',
    issue: 'Quán thu thêm phụ phí bàn 30.000đ dù voucher cam kết tặng miễn phí 2 giờ chơi game cho cặp đôi sinh viên.',
    evidence: 'Ảnh tin nhắn xác nhận lịch hẹn',
    status: 'pending',
  },
  {
    id: 'REP-880',
    priority: 'medium',
    studentName: 'Nguyễn Hà My (ĐH RMIT)',
    studentPhone: '0912 334 455',
    venueName: 'Tiệm Trà Tháng 5 (Gần ĐH Bách Khoa)',
    reportedAt: '2 ngày trước',
    issue: 'Quán ghi trên app là có wifi mạnh và nhiều ổ cắm, nhưng thực tế cả phòng chỉ có 1 ổ cắm và wifi không kết nối được để học nhóm.',
    evidence: 'Phản ánh chất lượng dịch vụ',
    status: 'pending',
  },
];

export default function ReportQueue() {
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [actionSuccess, setActionSuccess] = useState(null);

  const handleResolve = (id, note) => {
    setReports(
      reports.map((r) => (r.id === id ? { ...r, status: 'resolved' } : r))
    );
    setActionSuccess(`Đã xử lý report #${id}: ${note}`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const filtered = reports.filter((r) => {
    if (priorityFilter === 'all') return true;
    if (priorityFilter === 'resolved') return r.status === 'resolved';
    return r.priority === priorityFilter && r.status === 'pending';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Hàng đợi Xử lý Report ({reports.filter((r) => r.status === 'pending').length} khiếu nại chờ)
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Giải quyết khiếu nại từ sinh viên về trải nghiệm dịch vụ hoặc từ chối voucher tại quán cafe đối tác.
        </p>
      </div>

      {actionSuccess && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1px solid #A7F3D0',
            fontSize: '14px',
            fontWeight: '700',
          }}
        >
          ✓ {actionSuccess}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="portal-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'high', label: '🔴 Khẩn cấp (High)', count: reports.filter((r) => r.priority === 'high' && r.status === 'pending').length },
            { id: 'medium', label: '🟡 Trung bình (Medium)' },
            { id: 'resolved', label: '✓ Đã giải quyết' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPriorityFilter(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                backgroundColor: priorityFilter === tab.id ? 'var(--indigo)' : 'var(--bg-page)',
                color: priorityFilter === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: priorityFilter === tab.id ? 'var(--indigo)' : 'var(--border-color)',
              }}
            >
              {tab.label} {tab.count ? `(${tab.count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            className="portal-card"
            style={{
              borderLeft: `4px solid ${
                item.status === 'resolved'
                  ? '#10B981'
                  : item.priority === 'high'
                  ? '#EF4444'
                  : '#F59E0B'
              }`,
              opacity: item.status === 'resolved' ? 0.75 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-primary)' }}>
                  Mã Report: #{item.id}
                </span>
                {item.status === 'resolved' ? (
                  <span className="badge badge-success">ĐÃ GIẢI QUYẾT</span>
                ) : item.priority === 'high' ? (
                  <span className="badge badge-danger">ƯU TIÊN CAO (HIGH)</span>
                ) : (
                  <span className="badge badge-warning">TRUNG BÌNH (MEDIUM)</span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {item.reportedAt}
              </span>
            </div>

            {/* In-depth details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: 'var(--bg-page)', padding: '14px', borderRadius: '12px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>NGƯỜI KHIẾU NẠI</span>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {item.studentName}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>SĐT: {item.studentPhone}</p>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>ĐỐI TÁC BỊ PHẢN ÁNH</span>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', marginTop: '2px' }}>
                  {item.venueName}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bằng chứng: {item.evidence}</p>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>NỘI DUNG PHẢN ÁNH:</span>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '20px', marginTop: '4px' }}>
                "{item.issue}"
              </p>
            </div>

            {/* Resolution Actions */}
            {item.status !== 'resolved' && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                <button
                  onClick={() => handleResolve(item.id, 'Đã hoàn trả voucher mới vào tài khoản sinh viên')}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '8px 14px' }}
                >
                  <CheckCircle size={14} />
                  <span>Hoàn voucher cho sinh viên</span>
                </button>

                <button
                  onClick={() => handleResolve(item.id, 'Đã gửi công văn cảnh cáo đến chủ quán đối tác')}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '8px 14px', color: '#DC2626' }}
                >
                  <AlertTriangle size={14} />
                  <span>Cảnh cáo đối tác</span>
                </button>

                <button
                  onClick={() => handleResolve(item.id, 'Đã đóng khiếu nại')}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '8px 14px' }}
                >
                  <span>Đóng hồ sơ</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
