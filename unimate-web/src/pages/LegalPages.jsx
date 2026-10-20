import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const UPDATED_AT = '20/10/2026';

function LegalLayout({ title, children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '32px 16px' }}>
      <article
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: 'clamp(20px, 5vw, 40px)',
          color: '#475569',
          fontSize: '15px',
          lineHeight: 1.7,
        }}
      >
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '13px', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Về trang chủ UNI-MATE
        </Link>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: '16px 0 4px' }}>{title}</h1>
        <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>Cập nhật lần cuối: {UPDATED_AT}</p>
        {children}
        <p style={{ marginTop: '32px', fontSize: '13px', color: '#94A3B8' }}>
          <Link to="/privacy" style={{ color: '#64748B' }}>Chính sách quyền riêng tư</Link>
          {' · '}
          <Link to="/terms" style={{ color: '#64748B' }}>Điều khoản sử dụng</Link>
        </p>
      </article>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>{title}</h2>
      {children}
    </section>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Chính sách quyền riêng tư">
      <p style={{ marginBottom: '20px' }}>
        UNI-MATE là ứng dụng giúp sinh viên tìm bạn học, khám phá quán cà phê đối tác và nhận voucher ưu đãi.
        Trang này giải thích UNI-MATE thu thập dữ liệu gì, dùng vào việc gì và bạn có quyền gì với dữ liệu của mình.
      </p>

      <Section title="1. Dữ liệu chúng tôi thu thập">
        <ul style={{ paddingLeft: '20px' }}>
          <li>Thông tin tài khoản: họ tên, email, mật khẩu (được mã hoá một chiều, không ai đọc được).</li>
          <li>
            Khi đăng nhập bằng Google: chỉ họ tên, địa chỉ email và ảnh đại diện từ tài khoản Google của bạn.
            UNI-MATE không đọc Gmail, danh bạ, Drive hay bất kỳ dữ liệu Google nào khác.
          </li>
          <li>Hồ sơ bạn tự điền: trường, chuyên ngành, năm học, sở thích, giới thiệu bản thân, ảnh đại diện.</li>
          <li>Dữ liệu sử dụng: lượt kết bạn, tin nhắn, voucher đã lưu và đã dùng, lượt check-in, đơn hàng gói Premium.</li>
          <li>Nguồn bạn biết đến UNI-MATE (mã chiến dịch trên đường link và câu trả lời khi đăng ký) và ngày bạn mở ứng dụng.</li>
        </ul>
      </Section>

      <Section title="2. Mục đích sử dụng">
        <ul style={{ paddingLeft: '20px' }}>
          <li>Tạo và đăng nhập tài khoản, gợi ý bạn học phù hợp, quản lý voucher và đơn hàng.</li>
          <li>Xác nhận thanh toán chuyển khoản cho gói Premium / gói đối tác.</li>
          <li>Thống kê tổng hợp (không định danh từng người) để cải thiện sản phẩm; website dùng Google Analytics.</li>
        </ul>
      </Section>

      <Section title="3. Chia sẻ dữ liệu">
        <p>
          UNI-MATE không bán dữ liệu cá nhân. Người dùng khác chỉ thấy thông tin hồ sơ công khai của bạn
          (tên, trường, sở thích, ảnh). Quán đối tác chỉ thấy thông tin cần thiết để xác nhận voucher bạn sử dụng.
          Dữ liệu được lưu trên các dịch vụ hạ tầng mà ứng dụng sử dụng (máy chủ và cơ sở dữ liệu đám mây).
        </p>
      </Section>

      <Section title="4. Quyền của bạn">
        <p>
          Bạn có thể xem và sửa hồ sơ trong mục Hồ sơ của ứng dụng. Bạn có thể yêu cầu xoá tài khoản cùng toàn bộ dữ liệu
          liên quan, hoặc gỡ quyền truy cập của UNI-MATE vào tài khoản Google tại{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" style={{ color: '#2563EB' }}>
            myaccount.google.com/permissions
          </a>.
        </p>
      </Section>

      <Section title="5. Liên hệ">
        <p>
          UNI-MATE là dự án khởi nghiệp của nhóm sinh viên môn EXE201. Mọi yêu cầu về dữ liệu cá nhân, vui lòng gửi tới
          email hỗ trợ hiển thị trên màn hình đăng nhập Google của UNI-MATE.
        </p>
      </Section>
    </LegalLayout>
  );
}

export function TermsOfService() {
  return (
    <LegalLayout title="Điều khoản sử dụng">
      <Section title="1. Đối tượng sử dụng">
        <p>
          UNI-MATE dành cho sinh viên và các quán cà phê đối tác. Khi tạo tài khoản, bạn đồng ý cung cấp thông tin
          trung thực và tự bảo mật mật khẩu của mình.
        </p>
      </Section>

      <Section title="2. Quy tắc cộng đồng">
        <p>
          Không mạo danh người khác, không quấy rối, không gửi nội dung phản cảm, lừa đảo hoặc vi phạm pháp luật.
          Tài khoản vi phạm có thể bị khoá sau khi xem xét báo cáo.
        </p>
      </Section>

      <Section title="3. Voucher và gói trả phí">
        <p>
          Voucher do quán đối tác phát hành và áp dụng theo điều kiện ghi trên từng voucher. Gói Premium và gói đối tác
          được kích hoạt sau khi thanh toán được xác nhận, có hiệu lực theo thời hạn của gói đã mua.
        </p>
      </Section>

      <Section title="4. Thay đổi dịch vụ">
        <p>
          UNI-MATE đang trong giai đoạn thử nghiệm và có thể điều chỉnh tính năng. Thay đổi quan trọng về điều khoản
          sẽ được cập nhật trên trang này.
        </p>
      </Section>
    </LegalLayout>
  );
}
