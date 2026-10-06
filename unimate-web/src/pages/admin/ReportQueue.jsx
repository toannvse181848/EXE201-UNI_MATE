import React, { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import { reportApi } from '../../services/api';

export default function ReportQueue() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getAllReportsAdmin();
      const raw = res?.data || [];
      const mapped = raw.map((r) => ({
        id: r._id || r.id,
        priority: r.priority || 'high',
        studentName: r.reporter?.fullName || 'Sinh viên UNI-MATE',
        studentPhone: r.reporter?.email || 'Chưa cung cấp',
        venueName: r.targetType === 'venue' ? (r.targetId?.name || 'Quán đối tác') : 'Báo cáo người dùng',
        reportedAt: r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : 'Gần đây',
        issue: r.description || r.reason || 'Nội dung phản ánh dịch vụ',
        evidence: r.reason || 'Báo cáo vi phạm',
        status: r.status === 'resolved' ? 'resolved' : 'pending',
      }));
      setReports(mapped);
    } catch (err) {
      console.log('Backend reports note:', err.message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleResolve = async (id, note) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'resolved' } : r))
    );
    setActionSuccess(`Đã xử lý report #${id.slice(-6)}: ${note}`);
    setTimeout(() => setActionSuccess(null), 3500);

    try {
      await reportApi.resolveReport(id, 'resolved', note);
    } catch (err) {
      console.log('Lỗi cập nhật report:', err.message);
    }
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
        {loading ? (
          <div className="portal-card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
            <p style={{ fontSize: '14px', fontWeight: '600' }}>Đang tải danh sách khiếu nại...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="portal-card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <CheckCircle size={36} style={{ margin: '0 auto 12px', opacity: 0.4, color: '#10B981' }} />
            <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-secondary)' }}>Không có khiếu nại nào</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Tất cả khiếu nại đã được xử lý hoặc chưa phát sinh khiếu nại mới</p>
          </div>
        ) : (
          filtered.map((item) => (
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
        )))}
      </div>
    </div>
  );
}
