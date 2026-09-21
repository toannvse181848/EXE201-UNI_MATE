import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Coffee,
  ArrowRight,
  Lock,
  Mail,
  User,
  School,
  BookOpen,
  Phone,
  MapPin,
  IdCard,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

const UNIVERSITIES = [
  'Đại học FPT TP.HCM',
  'ĐH Bách Khoa TP.HCM (HCMUT)',
  'ĐH Kinh Tế TP.HCM (UEH)',
  'ĐH RMIT Việt Nam',
  'ĐH Quốc Gia - KHTN',
  'ĐH Ngoại Thương (FTU2)',
  'ĐH Sư Phạm Kỹ Thuật (HCMUTE)',
  'ĐH Quốc Tế (IU)',
  'ĐH Tôn Đức Thắng (TDTU)',
  'ĐH Hoa Sen (HSU)',
  'Trường Đại học khác',
];

const ACADEMIC_YEARS = [
  'Năm 1 (Tân sinh viên)',
  'Năm 2',
  'Năm 3',
  'Năm 4',
  'Năm cuối / Đang thực tập',
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState('user'); // 'user' | 'partner'
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Student form state - Khớp 100% với Thẻ Uni-Card Profile
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    studentId: '', // Mã số sinh viên (MSSV)
    phone: '',
    email: '',
    university: 'Đại học FPT TP.HCM',
    major: 'Kỹ thuật Phần mềm',
    year: 'Năm 3',
    gender: 'male', // 'male' | 'female' | 'other'
    password: '',
    confirmPassword: '',
  });

  // Partner form state
  const [partnerForm, setPartnerForm] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
  });

  const handleStudentChange = (field, value) => {
    setStudentForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handlePartnerChange = (field, value) => {
    setPartnerForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const err = {};
    if (role === 'user') {
      if (!studentForm.fullName.trim()) err.fullName = 'Vui lòng nhập họ và tên';
      if (!studentForm.studentId.trim()) err.studentId = 'Vui lòng nhập Mã số sinh viên (MSSV)';
      if (!studentForm.email.trim()) err.email = 'Vui lòng nhập email';
      else if (!/\S+@\S+\.\S+/.test(studentForm.email)) err.email = 'Email không hợp lệ';
      if (!studentForm.phone.trim()) err.phone = 'Vui lòng nhập số điện thoại';
      if (!studentForm.password) err.password = 'Vui lòng nhập mật khẩu';
      else if (studentForm.password.length < 6) err.password = 'Mật khẩu tối thiểu 6 ký tự';
      if (studentForm.password !== studentForm.confirmPassword) {
        err.confirmPassword = 'Mật khẩu nhập lại không khớp';
      }
    } else {
      if (!partnerForm.fullName.trim()) err.fullName = 'Vui lòng nhập họ tên người đại diện';
      if (!partnerForm.businessName.trim()) err.businessName = 'Vui lòng nhập tên quán/doanh nghiệp';
      if (!partnerForm.email.trim()) err.email = 'Vui lòng nhập email liên hệ';
      else if (!/\S+@\S+\.\S+/.test(partnerForm.email)) err.email = 'Email không hợp lệ';
      if (!partnerForm.phone.trim()) err.phone = 'Vui lòng nhập số điện thoại';
      if (!partnerForm.address.trim()) err.address = 'Vui lòng nhập địa chỉ quán';
      if (!partnerForm.password) err.password = 'Vui lòng nhập mật khẩu';
      else if (partnerForm.password.length < 6) err.password = 'Mật khẩu tối thiểu 6 ký tự';
      if (partnerForm.password !== partnerForm.confirmPassword) {
        err.confirmPassword = 'Mật khẩu nhập lại không khớp';
      }
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (role === 'user') {
        await register({
          ...studentForm,
          role: 'user',
        });
        navigate('/user/discover');
      } else {
        await register({
          ...partnerForm,
          role: 'partner',
        });
        navigate('/partner/dashboard');
      }
    } catch (err) {
      alert('Đăng ký thất bại: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 16px',
        backgroundColor: '#FAFAF9',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.07), 0 0 1px 1px rgba(0,0,0,0.05)',
          padding: '36px',
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              backgroundColor: '#FF5722',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 8px 20px -4px rgba(255, 87, 34, 0.45)',
              marginBottom: '14px',
            }}
          >
            {role === 'user' ? <GraduationCap size={32} /> : <Coffee size={32} />}
          </div>

          <h1
            style={{
              fontSize: '24px',
              fontWeight: '900',
              color: '#1C1917',
              letterSpacing: '-0.5px',
              margin: '0 0 6px 0',
            }}
          >
            Đăng ký tài khoản UNI-MATE
          </h1>
          <p style={{ fontSize: '14px', color: '#78716C', margin: 0 }}>
            {role === 'user'
              ? 'Tạo Thẻ sinh viên điện tử Uni-Card để kết nối bạn học & nhận ưu đãi quán cafe'
              : 'Gia nhập mạng lưới quán cafe đối tác phục vụ cộng đồng sinh viên'}
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            padding: '4px',
            backgroundColor: '#F5F5F4',
            borderRadius: '14px',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => setRole('user')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              backgroundColor: role === 'user' ? '#FFFFFF' : 'transparent',
              color: role === 'user' ? '#FF5722' : '#78716C',
              border: 'none',
              boxShadow: role === 'user' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <GraduationCap size={18} />
            <span>Sinh viên (Thẻ Uni-Card)</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('partner')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              backgroundColor: role === 'partner' ? '#FFFFFF' : 'transparent',
              color: role === 'partner' ? '#FF5722' : '#78716C',
              border: 'none',
              boxShadow: role === 'partner' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Coffee size={18} />
            <span>Đối tác Quán Cafe</span>
          </button>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {role === 'user' ? (
            /* === STUDENT REGISTRATION FIELDS (Chuẩn hóa so với Thẻ Uni-Card Profile) === */
            <>
              {/* Họ tên & MSSV */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                    Họ và tên sinh viên *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                    <User size={18} color="#A8A29E" style={{ marginRight: '8px' }} />
                    <input
                      type="text"
                      required
                      value={studentForm.fullName}
                      onChange={(e) => handleStudentChange('fullName', e.target.value)}
                      placeholder="Nguyễn Văn Toàn"
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917' }}
                    />
                  </div>
                  {errors.fullName && <span style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.fullName}</span>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                    Mã số SV (MSSV) *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                    <IdCard size={18} color="#FF5722" style={{ marginRight: '8px' }} />
                    <input
                      type="text"
                      required
                      value={studentForm.studentId}
                      onChange={(e) => handleStudentChange('studentId', e.target.value.toUpperCase())}
                      placeholder="VD: SE181848"
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917', fontWeight: '700' }}
                    />
                  </div>
                  {errors.studentId && <span style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.studentId}</span>}
                </div>
              </div>

              {/* Email & Số điện thoại */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                    Email trường / cá nhân *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                    <Mail size={18} color="#A8A29E" style={{ marginRight: '8px' }} />
                    <input
                      type="email"
                      required
                      value={studentForm.email}
                      onChange={(e) => handleStudentChange('email', e.target.value)}
                      placeholder="toan.nguyen@fpt.edu.vn"
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917' }}
                    />
                  </div>
                  {errors.email && <span style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.email}</span>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                    Số điện thoại *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                    <Phone size={18} color="#A8A29E" style={{ marginRight: '8px' }} />
                    <input
                      type="tel"
                      required
                      value={studentForm.phone}
                      onChange={(e) => handleStudentChange('phone', e.target.value)}
                      placeholder="0901234567"
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917' }}
                    />
                  </div>
                  {errors.phone && <span style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.phone}</span>}
                </div>
              </div>

              {/* Trường Đại học & Chuyên ngành */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                    Trường Đại học *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                    <School size={18} color="#A8A29E" style={{ marginRight: '8px' }} />
                    <select
                      value={studentForm.university}
                      onChange={(e) => handleStudentChange('university', e.target.value)}
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917', backgroundColor: 'transparent' }}
                    >
                      {UNIVERSITIES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                    Chuyên ngành *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                    <BookOpen size={18} color="#A8A29E" style={{ marginRight: '8px' }} />
                    <input
                      type="text"
                      required
                      value={studentForm.major}
                      onChange={(e) => handleStudentChange('major', e.target.value)}
                      placeholder="VD: Kỹ thuật Phần mềm"
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917' }}
                    />
                  </div>
                </div>
              </div>

              {/* Năm học & Giới tính */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                    Năm học / Niên khóa
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                    <Calendar size={18} color="#A8A29E" style={{ marginRight: '8px' }} />
                    <select
                      value={studentForm.year}
                      onChange={(e) => handleStudentChange('year', e.target.value)}
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917', backgroundColor: 'transparent' }}
                    >
                      {ACADEMIC_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                    Giới tính
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', height: '41px' }}>
                    {[
                      { id: 'male', label: 'Nam' },
                      { id: 'female', label: 'Nữ' },
                      { id: 'other', label: 'Khác' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleStudentChange('gender', g.id)}
                        style={{
                          borderRadius: '10px',
                          border: studentForm.gender === g.id ? '1.5px solid #FF5722' : '1px solid #E7E5E4',
                          backgroundColor: studentForm.gender === g.id ? '#FBE9E7' : '#FFFFFF',
                          color: studentForm.gender === g.id ? '#FF5722' : '#44403C',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* === PARTNER REGISTRATION FIELDS === */
            <>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                  Họ tên người đại diện quán *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 14px' }}>
                  <User size={18} color="#A8A29E" style={{ marginRight: '10px' }} />
                  <input
                    type="text"
                    required
                    value={partnerForm.fullName}
                    onChange={(e) => handlePartnerChange('fullName', e.target.value)}
                    placeholder="Nguyễn Văn Hùng"
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#1C1917' }}
                  />
                </div>
                {errors.fullName && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.fullName}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                  Tên Quán Cafe / Thương hiệu *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 14px' }}>
                  <Coffee size={18} color="#A8A29E" style={{ marginRight: '10px' }} />
                  <input
                    type="text"
                    required
                    value={partnerForm.businessName}
                    onChange={(e) => handlePartnerChange('businessName', e.target.value)}
                    placeholder="VD: The Coffee House - Chi nhánh Sư Vạn Hạnh"
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#1C1917' }}
                  />
                </div>
                {errors.businessName && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.businessName}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                    Email liên hệ *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                    <Mail size={18} color="#A8A29E" style={{ marginRight: '8px' }} />
                    <input
                      type="email"
                      required
                      value={partnerForm.email}
                      onChange={(e) => handlePartnerChange('email', e.target.value)}
                      placeholder="contact@quan.vn"
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                    Số điện thoại *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                    <Phone size={18} color="#A8A29E" style={{ marginRight: '8px' }} />
                    <input
                      type="tel"
                      required
                      value={partnerForm.phone}
                      onChange={(e) => handlePartnerChange('phone', e.target.value)}
                      placeholder="0901234567"
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                  Địa chỉ quán *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 14px' }}>
                  <MapPin size={18} color="#A8A29E" style={{ marginRight: '10px' }} />
                  <input
                    type="text"
                    required
                    value={partnerForm.address}
                    onChange={(e) => handlePartnerChange('address', e.target.value)}
                    placeholder="798 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM"
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#1C1917' }}
                  />
                </div>
                {errors.address && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.address}</span>}
              </div>
            </>
          )}

          {/* Password fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                Mật khẩu *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                <Lock size={18} color="#A8A29E" style={{ marginRight: '8px' }} />
                <input
                  type="password"
                  required
                  value={role === 'user' ? studentForm.password : partnerForm.password}
                  onChange={(e) =>
                    role === 'user'
                      ? handleStudentChange('password', e.target.value)
                      : handlePartnerChange('password', e.target.value)
                  }
                  placeholder="Tối thiểu 6 ký tự"
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917' }}
                />
              </div>
              {errors.password && <span style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.password}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '5px' }}>
                Xác nhận mật khẩu *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E7E5E4', borderRadius: '12px', padding: '10px 12px' }}>
                <Lock size={18} color="#A8A29E" style={{ marginRight: '8px' }} />
                <input
                  type="password"
                  required
                  value={role === 'user' ? studentForm.confirmPassword : partnerForm.confirmPassword}
                  onChange={(e) =>
                    role === 'user'
                      ? handleStudentChange('confirmPassword', e.target.value)
                      : handlePartnerChange('confirmPassword', e.target.value)
                  }
                  placeholder="Nhập lại mật khẩu"
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#1C1917' }}
                />
              </div>
              {errors.confirmPassword && (
                <span style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.confirmPassword}</span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '15px',
              fontWeight: '700',
              color: '#FFFFFF',
              backgroundColor: '#FF5722',
              borderRadius: '12px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 16px -4px rgba(255, 87, 34, 0.4)',
              marginTop: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span>
              {loading
                ? 'Đang tạo thẻ & tài khoản...'
                : role === 'user'
                ? 'Đăng ký & Cấp thẻ Uni-Card'
                : 'Đăng ký Đối tác Quán cafe'}
            </span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Footer Login Link */}
        <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '14px', color: '#78716C' }}>
          Đã có tài khoản?{' '}
          <Link
            to="/login"
            style={{
              color: '#FF5722',
              fontWeight: '700',
              textDecoration: 'none',
            }}
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
