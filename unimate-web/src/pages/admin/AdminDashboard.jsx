import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { FunnelChart, LineChart } from '../../components/admin/AnalyticsCharts';
import { VIZ } from '../../components/admin/vizTokens';
import {
  Store,
  Users,
  HeartHandshake,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  ShieldAlert,
  Download,
  RefreshCw,
} from 'lucide-react';

// Hiển thị "…" khi chưa tải xong
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('vi-VN') : '…');
const vnd = (n) => (typeof n === 'number' ? `${Math.round(n).toLocaleString('vi-VN')}đ` : '-');
const pct = (v) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '-');
const share = ({ returned, cohort }) => (cohort ? returned / cohort : null);
const weekLabel = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

const sectionTitle = { fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 };
const sectionNote = { fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 16px' };
// Tiêu đề cột được xuống dòng để bảng nhiều cột vẫn vừa khung
const th = { textAlign: 'left', verticalAlign: 'bottom', padding: '8px 10px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', minWidth: '64px' };
const td = { padding: '8px 10px', fontSize: '13px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

function StatTile({ label, value, detail }) {
  return (
    <div className="portal-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</span>
      {detail && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{detail}</span>}
    </div>
  );
}

function Notice({ tone, children }) {
  const warning = tone === 'warning';
  const Icon = warning ? AlertTriangle : Info;
  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        padding: '12px 14px',
        borderRadius: '12px',
        fontSize: '13px',
        backgroundColor: warning ? '#FFFBEB' : '#F0F9FF',
        border: `1px solid ${warning ? '#FDE68A' : '#BAE6FD'}`,
        color: warning ? '#92400E' : '#075985',
      }}
    >
      <Icon size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
      <span>{children}</span>
    </div>
  );
}

/** Phần phân tích: người dùng thật (đã loại admin, tài khoản mẫu, thành viên nhóm) */
function Analytics({ data }) {
  const { students, business, retention } = data;
  const weeks = data.weekly.map((w) => weekLabel(w.weekStart));

  return (
    <>
      {!data.excludeListConfigured && (
        <Notice tone="warning">
          Chưa cấu hình danh sách loại trừ (biến OC3_EXCLUDE_EMAILS trên Render), nên số liệu đang tính cả tài khoản của thành viên nhóm.
        </Notice>
      )}
      <Notice tone="info">
        {data.activityTrackedSince
          ? `Nhật ký ngày mở app (web và mobile) có từ ${data.activityTrackedSince}. Trước ngày này, tỷ lệ quay lại được ước tính từ các hành động có ghi thời gian (kết bạn, nhắn tin, lưu voucher, điểm danh, đơn hàng).`
          : 'Chưa có nhật ký ngày mở app. Tỷ lệ quay lại đang được ước tính từ các hành động có ghi thời gian.'}
      </Notice>

      {/* Chỉ số chính */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatTile
          label="Người dùng hợp lệ"
          value={fmt(students.valid)}
          detail={`${fmt(students.registered)} sinh viên đăng ký`}
        />
        <StatTile
          label="Người trả phí"
          value={fmt(business.payers)}
          detail={`Sinh viên ${business.studentPayers} · quán ${business.partnerPayers}`}
        />
        <StatTile
          label="Doanh thu"
          value={vnd(business.revenue)}
          detail={`${fmt(business.paidOrders)} đơn · trung bình ${vnd(business.averageOrderValue)}`}
        />
        <StatTile
          label="Quay lại trong 7 ngày đầu"
          value={pct(share(retention.within7))}
          detail={`Đúng ngày 1: ${pct(share(retention.day1))} · đúng ngày 7: ${pct(share(retention.day7))}`}
        />
        <StatTile
          label="Chuyển đổi đăng ký → trả phí"
          value={pct(business.conversionRate)}
          detail={`Khách mua lại (từ 2 đơn): ${business.repeatBuyers} · ${pct(business.repeatRate)} người trả phí`}
        />
      </div>

      {/* Phễu */}
      <div className="portal-card">
        <h3 style={sectionTitle}>Phễu chuyển đổi (sinh viên)</h3>
        <p style={sectionNote}>
          Mỗi bước chỉ đếm người đã qua mọi bước trước. Phần trăm so với số đăng ký.
          {data.biggestDrop && ` Bước mất nhiều người nhất: "${data.biggestDrop.step}".`}
        </p>
        <FunnelChart steps={data.funnel} />
      </div>

      {/* Theo tuần */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '16px' }}>
        <div className="portal-card">
          <h3 style={sectionTitle}>Sinh viên theo tuần</h3>
          <p style={sectionNote}>Đăng ký mới và số sinh viên có dùng app trong tuần</p>
          <LineChart
            categories={weeks}
            series={[
              { label: 'Đăng ký mới', color: VIZ.series[0], values: data.weekly.map((w) => w.newStudents) },
              { label: 'Hoạt động trong tuần', color: VIZ.series[1], values: data.weekly.map((w) => w.activeStudents) },
            ]}
            formatValue={fmt}
          />
        </div>
        <div className="portal-card">
          <h3 style={sectionTitle}>Doanh thu cộng dồn</h3>
          <p style={sectionNote}>Tổng tiền các đơn đã thanh toán tính đến hết mỗi tuần</p>
          <LineChart
            categories={weeks}
            series={[{ label: 'Doanh thu cộng dồn', color: VIZ.series[0], values: data.weekly.map((w) => w.cumulativeRevenue) }]}
            formatValue={vnd}
            area
          />
        </div>
      </div>

      <div className="portal-card" style={{ overflowX: 'auto' }}>
        <h3 style={sectionTitle}>Bảng theo tuần</h3>
        <p style={sectionNote}>Tuần tính từ thứ Hai, giờ Việt Nam</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Tuần từ', 'SV đăng ký mới', 'Quán đăng ký mới', 'SV hoạt động', 'Kết bạn mới', 'Voucher lưu / đổi', 'Đơn thanh toán', 'Doanh thu', 'Tổng SV', 'Người trả phí cộng dồn', 'Doanh thu cộng dồn'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.weekly.map((w) => (
              <tr key={w.weekStart}>
                <td style={td}>{weekLabel(w.weekStart)}</td>
                <td style={td}>{w.newStudents}</td>
                <td style={td}>{w.newPartners}</td>
                <td style={td}>{w.activeStudents}</td>
                <td style={td}>{w.newMatches}</td>
                <td style={td}>{w.vouchersClaimed} / {w.vouchersRedeemed}</td>
                <td style={td}>{w.paidOrders}</td>
                <td style={td}>{vnd(w.revenue)}</td>
                <td style={td}>{w.cumulativeStudents}</td>
                <td style={td}>{w.cumulativePayers}</td>
                <td style={td}>{vnd(w.cumulativeRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setAnalyticsError(null);
    const [stats, metrics] = await Promise.allSettled([adminApi.getStats(), adminApi.getOc3()]);
    if (stats.status === 'fulfilled') setData(stats.value?.data || null);
    else console.log('Lỗi tải thống kê admin:', stats.reason?.message);
    if (metrics.status === 'fulfilled') setAnalytics(metrics.value.data);
    else setAnalyticsError(metrics.reason?.message || 'Không tải được số liệu');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportOc3();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `unimate_so_lieu_${analytics?.today || 'moi-nhat'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không xuất được file: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    {
      label: 'ĐỊA ĐIỂM ĐÃ DUYỆT',
      val: fmt(data?.venues?.approved),
      change: `+${fmt(data?.venues?.newThisMonth)} quán mới tháng này`,
      icon: Store,
      color: '#3B82F6',
    },
    {
      label: 'SINH VIÊN HOẠT ĐỘNG (30 NGÀY)',
      val: fmt(data?.students?.activeLast30Days),
      change: `Tổng ${fmt(data?.students?.total)} tài khoản · +${fmt(data?.students?.newThisMonth)} tháng này`,
      icon: Users,
      color: '#10B981',
    },
    {
      label: 'LƯỢT MATCH THÀNH CÔNG',
      val: fmt(data?.matches?.total),
      change: `+${fmt(data?.matches?.thisMonth)} tháng này`,
      icon: HeartHandshake,
      color: '#EC4899',
    },
    {
      label: 'LƯỢT ĐỔI VOUCHER',
      val: fmt(data?.vouchers?.redeemed),
      change: `${fmt(data?.vouchers?.claimed)} lượt lưu ví · +${fmt(data?.vouchers?.redeemedThisMonth)} lượt đổi tháng này`,
      icon: DollarSign,
      color: '#FF5722',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Tổng quan Sàn UNI-MATE
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Số liệu phân tích tính trực tiếp từ database mỗi lần mở trang, đã loại tài khoản admin, tài khoản mẫu và thành viên nhóm.
            {analytics && ` Ngày chốt số liệu: ${analytics.today}.`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} /> Tải lại
          </button>
          <button type="button" className="btn btn-primary" onClick={handleExport} disabled={exporting || !analytics}>
            <Download size={16} /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      {/* Urgent Operational Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
        {/* Pending Venues Card */}
        <div
          className="portal-card"
          style={{
            borderLeft: '4px solid #F59E0B',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} color="#D97706" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {fmt(data?.venues?.pending)} Quán đối tác đang chờ duyệt
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Các quán mới đăng ký cần xác thực giấy phép và menu
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/venues')}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <span>Duyệt hồ sơ</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Urgent Reports Card */}
        <div
          className="portal-card"
          style={{
            borderLeft: '4px solid #EF4444',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={22} color="#DC2626" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {fmt(data?.reports?.pending)} Báo cáo đang chờ xử lý
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Phản ánh về người dùng, quán hoặc voucher cần Ban quản trị xem xét
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/reports')}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px', color: '#DC2626' }}
          >
            <span>Xử lý ngay</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Phân tích số liệu */}
      {analytics ? (
        <Analytics data={analytics} />
      ) : analyticsError ? (
        <Notice tone="warning">Không tải được số liệu phân tích: {analyticsError}</Notice>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tính số liệu...</div>
      )}

      {/* Toàn sàn: đếm mọi tài khoản, kể cả tài khoản test */}
      <div>
        <h3 style={sectionTitle}>Hoạt động toàn sàn</h3>
        <p style={{ ...sectionNote, marginBottom: 0 }}>Đếm mọi tài khoản trong hệ thống, kể cả tài khoản mẫu và tài khoản test</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="portal-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                  {s.label}
                </span>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: s.color + '15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {s.val}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#10B981', fontWeight: '700' }}>
                <TrendingUp size={13} />
                <span>{s.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Partner Breakdown Section */}
      <div className="portal-card">
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
          Phân bổ trạng thái {fmt(data?.venues?.total)} cơ sở đối tác
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '16px', backgroundColor: '#ECFDF5', borderRadius: '14px', border: '1px solid #A7F3D0' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#065F46' }}>ĐANG HOẠT ĐỘNG</span>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#065F46', marginTop: '4px' }}>{fmt(data?.venues?.approved)}</h2>
            <span style={{ fontSize: '11px', color: '#059669' }}>
              {data?.venues?.total
                ? `${((data.venues.approved / data.venues.total) * 100).toFixed(1)}% trên toàn sàn`
                : 'Chưa có cơ sở nào'}
            </span>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '14px', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#92400E' }}>ĐANG CHỜ DUYỆT</span>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#92400E', marginTop: '4px' }}>{fmt(data?.venues?.pending)}</h2>
            <span style={{ fontSize: '11px', color: '#D97706' }}>Cần xử lý trong 24h</span>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '14px', border: '1px solid #FECACA' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#991B1B' }}>BỊ TỪ CHỐI</span>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#991B1B', marginTop: '4px' }}>{fmt(data?.venues?.rejected)}</h2>
            <span style={{ fontSize: '11px', color: '#DC2626' }}>Hồ sơ không đạt yêu cầu</span>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '14px', border: '1px solid #BFDBFE' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E40AF' }}>VOUCHER ĐANG CHẠY</span>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#1E40AF', marginTop: '4px' }}>{fmt(data?.vouchers?.active)}</h2>
            <span style={{ fontSize: '11px', color: '#2563EB' }}>Trên tổng {fmt(data?.vouchers?.total)} voucher đã tạo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
