import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { venueApi } from '../../services/api';
import {
  FileText,
  CheckCircle2,
  Clock,
  Edit3,
  Store,
  RefreshCw,
  AlertCircle,
  MapPin,
  Phone,
  Image as ImageIcon,
  ShieldCheck,
  Calendar,
  LayoutDashboard,
  Ticket,
  ChevronRight,
} from 'lucide-react';

export default function PendingReview() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyVenueStatus = async () => {
    try {
      setRefreshing(true);
      const res = await venueApi.getMyVenues();
      const list = res?.data || [];
      if (list.length > 0) {
        setVenue(list[0]);
      } else {
        setVenue(null);
      }
    } catch (err) {
      console.log('Lỗi lấy thông tin quán:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyVenueStatus();
  }, []);

  const venueStatus = venue?.status || 'pending';
  const isApproved = venueStatus === 'approved';
  const isRejected = venueStatus === 'rejected';
  const isPending = venueStatus === 'pending';

  const venueName = venue?.name || user?.partnerProfile?.businessName || 'Cơ sở đối tác chưa đặt tên';
  const venueAddress = venue?.address || user?.partnerProfile?.address || 'Chưa cập nhật địa chỉ';
  const venuePhone = venue?.phone || user?.phone || 'Chưa cập nhật SĐT';
  const venueImagesCount = venue?.images?.length || (venue?.image ? 1 : 0);
  const registeredDate = venue?.createdAt
    ? new Date(venue.createdAt).toLocaleDateString('vi-VN')
    : new Date().toLocaleDateString('vi-VN');

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', paddingTop: '10px', paddingBottom: '40px' }}>
      {/* Top Header Card */}
      <div className="portal-card" style={{ padding: '36px 32px', textAlign: 'center', position: 'relative' }}>
        {/* Refresh Button */}
        <button
          onClick={fetchMyVenueStatus}
          disabled={refreshing}
          className="btn btn-secondary"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '6px 12px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Kiểm tra lại trạng thái duyệt từ Admin"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Đang kiểm tra...' : 'Làm mới trạng thái'}</span>
        </button>

        {/* State Icon */}
        {isApproved ? (
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '26px',
              backgroundColor: '#ECFDF5',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
              marginBottom: '18px',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)',
            }}
          >
            <ShieldCheck size={44} />
          </div>
        ) : isRejected ? (
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '26px',
              backgroundColor: '#FEF2F2',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              marginBottom: '18px',
              boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)',
            }}
          >
            <AlertCircle size={44} />
          </div>
        ) : (
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '26px',
              backgroundColor: '#FFFBEB',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
              marginBottom: '18px',
              boxShadow: '0 8px 20px rgba(217, 119, 6, 0.15)',
            }}
          >
            <FileText size={42} />
          </div>
        )}

        {/* Dynamic Header Titles */}
        {isApproved ? (
          <>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#065F46', marginBottom: '8px' }}>
              Hồ sơ cơ sở đã được phê duyệt chính thức! 🎉
            </h1>
            <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto 28px', lineHeight: '22px' }}>
              Chúc mừng bạn! Cơ sở <strong>{venueName}</strong> đã được Ban quản trị UNI-MATE kiểm duyệt thành công và đang hiển thị công khai trên ứng dụng di động cho sinh viên.
            </p>
          </>
        ) : isRejected ? (
          <>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#991B1B', marginBottom: '8px' }}>
              Hồ sơ cơ sở cần chỉnh sửa hoặc bổ sung
            </h1>
            <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto 20px', lineHeight: '22px' }}>
              Hồ sơ địa điểm của bạn chưa đạt yêu cầu kiểm duyệt từ Ban quản trị. Vui lòng xem lý do bên dưới và cập nhật lại thông tin để được duyệt lại.
            </p>
            {venue?.rejectionReason && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  maxWidth: '560px',
                  margin: '0 auto 24px',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#991B1B', display: 'block', marginBottom: '4px' }}>
                  Lý do từ Ban Quản Trị:
                </span>
                <span style={{ fontSize: '13.5px', color: '#B91C1C' }}>
                  {venue.rejectionReason}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Hồ sơ đang chờ phê duyệt
            </h1>
            <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto 28px', lineHeight: '22px' }}>
              Cảm ơn bạn đã đăng ký làm đối tác UNI-MATE. Đội ngũ kiểm duyệt đang thẩm định thông tin quán <strong>{venueName}</strong> và hình ảnh cơ sở trong vòng 24 giờ làm việc.
            </p>
          </>
        )}

        {/* Real Dossier Summary Box */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '20px',
            textAlign: 'left',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={18} color="var(--primary)" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Thông tin cơ sở đã đăng ký
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Ngày gửi: {registeredDate}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: isApproved ? '#D1FAE5' : (isRejected ? '#FEE2E2' : '#FEF3C7'),
                  color: isApproved ? '#065F46' : (isRejected ? '#991B1B' : '#92400E'),
                }}
              >
                {isApproved ? 'ĐÃ DUYỆT (APPROVED)' : (isRejected ? 'TỪ CHỐI (REJECTED)' : 'CHỜ DUYỆT (PENDING)')}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Store size={16} color="var(--text-muted)" style={{ marginTop: '2px' }} />
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Tên địa điểm:</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{venueName}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <MapPin size={16} color="var(--text-muted)" style={{ marginTop: '2px' }} />
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Địa chỉ:</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{venueAddress}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Phone size={16} color="var(--text-muted)" style={{ marginTop: '2px' }} />
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Hotline liên hệ:</span>
                <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>{venuePhone}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <ImageIcon size={16} color="var(--text-muted)" style={{ marginTop: '2px' }} />
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Hình ảnh không gian:</span>
                <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--primary)' }}>
                  {venueImagesCount > 0 ? `${venueImagesCount} ảnh đã tải lên` : 'Chưa có ảnh'}
                </span>
              </div>
            </div>
          </div>

          {/* Real Thumbnail Showcase */}
          {venue?.images && venue.images.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed var(--border-color)' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Ảnh không gian quán gửi duyệt:
              </span>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {venue.images.slice(0, 5).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Ảnh quán ${i + 1}`}
                    style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                  />
                ))}
                {venue.images.length > 5 && (
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      backgroundColor: '#E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '800',
                      color: '#475569',
                    }}
                  >
                    +{venue.images.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Verification Progress Checklist */}
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
          <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Quy trình xác thực hồ sơ đối tác
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Step 1: User Profile */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={20} color="#10B981" />
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>
                    1. Tài khoản đối tác ({user?.fullName || user?.email || 'Đã kích hoạt'})
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Email: {user?.email}</span>
                </div>
              </div>
              <span className="badge badge-success">Đã hoàn thành</span>
            </div>

            {/* Step 2: Venue Information */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={20} color="#10B981" />
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>
                    2. Thông tin cơ sở ({venueName})
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{venueAddress}</span>
                </div>
              </div>
              <span className="badge badge-success">Đã hoàn thành</span>
            </div>

            {/* Step 3: Photos */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={20} color="#10B981" />
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>
                    3. Hình ảnh không gian & góc học tập ({venueImagesCount} ảnh)
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Mặt tiền, bàn học nhóm, ổ cắm điện</span>
                </div>
              </div>
              <span className="badge badge-success">Đã hoàn thành</span>
            </div>

            {/* Step 4: Admin Moderation Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: isApproved ? '#ECFDF5' : (isRejected ? '#FEF2F2' : '#FFFBEB'),
                borderRadius: '12px',
                border: isApproved ? '1px solid #A7F3D0' : (isRejected ? '1px solid #FCA5A5' : '1px solid #FDE68A'),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isApproved ? (
                  <CheckCircle2 size={20} color="#10B981" />
                ) : isRejected ? (
                  <AlertCircle size={20} color="#EF4444" />
                ) : (
                  <Clock size={20} color="#D97706" />
                )}
                <div>
                  <span
                    style={{
                      fontSize: '13.5px',
                      fontWeight: '800',
                      color: isApproved ? '#065F46' : (isRejected ? '#991B1B' : '#92400E'),
                      display: 'block',
                    }}
                  >
                    4. Xét duyệt từ Ban Quản Trị UNI-MATE
                  </span>
                  <span style={{ fontSize: '11.5px', color: isApproved ? '#047857' : (isRejected ? '#B91C1C' : '#B45309') }}>
                    {isApproved
                      ? 'Cơ sở đã được duyệt và hoạt động trên toàn hệ thống'
                      : isRejected
                      ? 'Hồ sơ bị từ chối, vui lòng cập nhật lại'
                      : 'Đang thẩm định (Phản hồi trong vòng 24 giờ làm việc)'}
                  </span>
                </div>
              </div>
              <span className={isApproved ? 'badge badge-success' : (isRejected ? 'badge badge-danger' : 'badge badge-warning')}>
                {isApproved ? 'Đã duyệt' : (isRejected ? 'Bị từ chối' : 'Đang chờ (Pending)')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons based on actual status */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/partner/venues')}
            className="btn btn-secondary"
            style={{ padding: '12px 24px' }}
          >
            <Edit3 size={16} />
            <span>Chỉnh sửa thông tin cơ sở</span>
          </button>

          {isApproved ? (
            <button
              onClick={() => navigate('/partner/dashboard')}
              className="btn btn-primary"
              style={{ padding: '12px 24px' }}
            >
              <LayoutDashboard size={16} />
              <span>Vào Dashboard đối tác</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/partner/vouchers')}
              className="btn btn-primary"
              style={{ padding: '12px 24px' }}
            >
              <Ticket size={16} />
              <span>Quản lý Voucher ưu đãi</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
