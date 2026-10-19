import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, RefreshCw, AlertTriangle, Info, Copy, CheckCircle2, Save } from 'lucide-react';
import { adminApi } from '../../services/api';
import { FunnelChart, LineChart } from '../../components/admin/Oc3Charts';
import { VIZ } from '../../components/admin/vizTokens';

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('vi-VN') : '-');
const vnd = (n) => (typeof n === 'number' ? `${Math.round(n).toLocaleString('vi-VN')}đ` : '-');
const pct = (v) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '-');
const share = ({ returned, cohort }) => (cohort ? returned / cohort : null);
const weekLabel = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

// Link gắn mã theo dõi (UTM) cho từng kênh: người mở link rồi đăng ký sẽ được tính vào đúng kênh
const TRACKING_LINKS = [
  { label: 'Bài đăng fanpage Facebook', params: 'utm_source=facebook&utm_medium=social&utm_content=fanpage' },
  { label: 'Group Facebook của trường', params: 'utm_source=facebook&utm_medium=social&utm_content=group' },
  { label: 'Link ở bio TikTok', params: 'utm_source=tiktok&utm_medium=social&utm_content=bio' },
  { label: 'Bình luận ghim / mô tả video TikTok', params: 'utm_source=tiktok&utm_medium=social&utm_content=video' },
  { label: 'Mã QR in ở CLB / sự kiện trường', params: 'utm_source=campus&utm_medium=offline&utm_content=event' },
  { label: 'Mã QR đặt tại quán cafe đối tác', params: 'utm_source=cafe&utm_medium=offline&utm_content=standee' },
  { label: 'Gửi bạn bè qua Messenger / Zalo', params: 'utm_source=friend&utm_medium=referral' },
];

const sectionTitle = { fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 };
const sectionNote = { fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 16px' };
// Tiêu đề cột được xuống dòng để bảng nhiều cột vẫn vừa khung
const th = { textAlign: 'left', verticalAlign: 'bottom', padding: '8px 10px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', minWidth: '64px' };
const td = { padding: '8px 10px', fontSize: '13px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const inputStyle = { width: '120px', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', textAlign: 'right' };

/** Thanh tiến độ so với mục tiêu: phần đã đạt và phần còn lại cùng một tông màu */
function Meter({ value }) {
  const filled = Math.min(1, Math.max(0, value || 0)) * 100;
  return (
    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: VIZ.meterTrack, overflow: 'hidden' }}>
      <div style={{ width: `${filled}%`, height: '100%', backgroundColor: VIZ.series[0], borderRadius: '3px' }} />
    </div>
  );
}

function StatTile({ label, value, detail, progress }) {
  return (
    <div className="portal-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</span>
      {progress !== undefined && <Meter value={progress} />}
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

export default function Oc3Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputs, setInputs] = useState({ channels: {}, otherCost: 0 });
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, settings] = await Promise.all([adminApi.getOc3(), adminApi.getOc3Settings()]);
      setData(dashboard.data);
      const channels = {};
      for (const c of settings.data.channels) {
        channels[c.key] = { cost: c.cost || 0, reach: c.reach || 0, clicks: c.clicks || 0 };
      }
      setInputs({ channels, otherCost: settings.data.otherCost || 0 });
    } catch (err) {
      setError(err.message || 'Không tải được số liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setChannelInput = (key, field, value) =>
    setInputs((prev) => ({
      ...prev,
      channels: { ...prev.channels, [key]: { ...prev.channels[key], [field]: value } },
    }));

  const handleSave = async () => {
    setSaving(true);
    setSaveNotice(null);
    try {
      await adminApi.saveOc3Settings(inputs);
      setSaveNotice('Đã lưu. Số liệu theo kênh đã được tính lại.');
      await load();
    } catch (err) {
      setSaveNotice(`Lưu thất bại: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportOc3();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `unimate_so_lieu_oc3_${data?.today || 'moi-nhat'}.xlsx`);
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

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading && !data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tính số liệu...</div>;
  }
  if (error && !data) {
    return <Notice tone="warning">Không tải được số liệu OC3: {error}</Notice>;
  }

  const { students, business, retention, partners } = data;
  const weeks = data.weekly.map((w) => weekLabel(w.weekStart));
  const trackedChannels = data.channels.filter((c) => c.key !== 'unknown');
  const unknown = data.channels.find((c) => c.key === 'unknown');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {/* Tiêu đề + nút */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={26} /> Số liệu OC3
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tính trực tiếp từ database mỗi lần mở trang, đã loại tài khoản admin, tài khoản mẫu và thành viên nhóm. Ngày chốt số liệu: {data.today}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} /> Tải lại
          </button>
          <button type="button" className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            <Download size={16} /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

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
          label="Người dùng hợp lệ (mục tiêu 20)"
          value={`${fmt(students.valid)} / 20`}
          progress={students.valid / 20}
          detail={`${fmt(students.registered)} sinh viên đăng ký`}
        />
        <StatTile
          label="Người trả phí (mục tiêu 10)"
          value={`${fmt(business.payers)} / 10`}
          progress={business.payers / 10}
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
          label="Doanh thu trừ chi phí"
          value={vnd(business.profit)}
          detail={`Chi phí đã nhập ${vnd(business.totalCost)} · khách mua lại ${business.repeatBuyers}`}
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

      {/* Theo kênh */}
      <div className="portal-card" style={{ overflowX: 'auto' }}>
        <h3 style={sectionTitle}>Hiệu quả theo kênh</h3>
        <p style={sectionNote}>
          Kênh của mỗi người dùng lấy từ link có mã theo dõi họ đã mở, nếu không có thì lấy câu trả lời "Bạn biết UNI-MATE qua đâu?" lúc đăng ký.
          Lượt tiếp cận, lượt nhấp và chi phí nhập tay từ Meta Business Suite, TikTok Studio và bảng chi phí OC2 (cộng dồn từ đầu chiến dịch).
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Kênh', 'CTR', 'SV đăng ký', 'Quán đăng ký', 'Người dùng hợp lệ', 'Người trả phí', 'Doanh thu', 'Chi phí', 'Chi phí / người dùng hợp lệ', 'CPA (chi phí / khách trả phí)'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...trackedChannels, ...(unknown ? [unknown] : [])].map((c) => (
              <tr key={c.key}>
                <td style={{ ...td, fontWeight: 600, whiteSpace: 'normal', color: c.key === 'unknown' ? 'var(--text-secondary)' : td.color }}>
                  {c.key === 'unknown' ? `${c.label} (đăng ký trước khi có tính năng ghi nguồn)` : c.label}
                </td>
                <td style={td}>{pct(c.ctr)}</td>
                <td style={td}>{c.registeredStudents}</td>
                <td style={td}>{c.registeredPartners}</td>
                <td style={td}>{c.validStudents}</td>
                <td style={td}>{c.payers}</td>
                <td style={td}>{vnd(c.revenue)}</td>
                <td style={td}>{c.key === 'unknown' ? '-' : vnd(c.cost)}</td>
                <td style={td}>{vnd(c.costPerValidUser)}</td>
                <td style={td}>{vnd(c.cpa)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 style={{ ...sectionTitle, fontSize: '14px', marginTop: '24px' }}>Nhập số liệu kênh</h4>
        <p style={sectionNote}>Cộng dồn từ đầu chiến dịch đến hôm nay. Bấm Lưu để tính lại CTR, chi phí trên mỗi người dùng và CPA.</p>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Kênh', 'Lượt tiếp cận', 'Lượt nhấp', 'Chi phí (đ)'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trackedChannels.map((c) => (
              <tr key={c.key}>
                <td style={{ ...td, fontWeight: 600 }}>{c.label}</td>
                {['reach', 'clicks', 'cost'].map((field) => (
                  <td key={field} style={td}>
                    <input
                      type="number"
                      min="0"
                      value={inputs.channels[c.key]?.[field] ?? 0}
                      onChange={(e) => setChannelInput(c.key, field, e.target.value)}
                      style={inputStyle}
                      aria-label={`${field} ${c.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Chi phí khác (tên miền, in ấn, vận hành)
            <input
              type="number"
              min="0"
              value={inputs.otherCost}
              onChange={(e) => setInputs((prev) => ({ ...prev, otherCost: e.target.value }))}
              style={{ ...inputStyle, width: '120px' }}
            />
          </label>
          <button type="button" className="btn btn-indigo" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu số liệu kênh'}
          </button>
          {saveNotice && <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{saveNotice}</span>}
        </div>
      </div>

      {/* Kế hoạch so với thực tế */}
      <div className="portal-card" style={{ overflowX: 'auto' }}>
        <h3 style={sectionTitle}>Kế hoạch so với thực tế</h3>
        <p style={sectionNote}>Mục tiêu tối thiểu của môn học và mục tiêu nhóm đặt ra trong slide OC2 (hết tuần 10)</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Nguồn mục tiêu', 'Chỉ số', 'Kế hoạch', 'Thực tế', 'Đạt'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.targets.map((t) => (
              <tr key={t.label}>
                <td style={{ ...td, color: 'var(--text-secondary)' }}>{t.group}</td>
                <td style={td}>{t.label}</td>
                <td style={td}>{fmt(t.plan)}</td>
                <td style={td}>{fmt(t.actual)}</td>
                <td style={{ ...td, minWidth: '140px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <Meter value={t.achieved} />
                    </div>
                    <span>{pct(t.achieved)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ ...sectionNote, margin: '12px 0 0' }}>
          Quán đối tác hoạt động: {partners.active}/{partners.registered} quán đã đăng ký có quán được duyệt. Người dùng hoạt động 7 ngày qua: web {data.platforms.last7Days.web}, app mobile {data.platforms.last7Days.mobile}.
        </p>
      </div>

      {/* Link có mã theo dõi */}
      <div className="portal-card">
        <h3 style={sectionTitle}>Link có mã theo dõi cho từng kênh</h3>
        <p style={sectionNote}>
          Dùng đúng link của từng kênh khi đăng bài hoặc in mã QR. Người mở link rồi đăng ký sẽ được tính vào kênh đó ở bảng trên và trong Google Analytics.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {TRACKING_LINKS.map((l) => {
            const url = `${window.location.origin}/?${l.params}&utm_campaign=unimate`;
            return (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '13px' }}>
                <span style={{ minWidth: '230px', color: 'var(--text-primary)', fontWeight: 600 }}>{l.label}</span>
                <code style={{ flex: 1, minWidth: '240px', padding: '6px 8px', borderRadius: '8px', backgroundColor: 'var(--border-light)', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                  {url}
                </code>
                <button type="button" className="btn btn-secondary" onClick={() => copyLink(url)} style={{ padding: '6px 10px' }}>
                  {copied === url ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copied === url ? 'Đã chép' : 'Chép'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
