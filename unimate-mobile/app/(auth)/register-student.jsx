import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/colors';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { useAuth } from '../../src/context/AuthContext';
import { MAJORS, ACADEMIC_YEARS, UNIVERSITIES } from '../../src/constants/academic';

const GENDER_OPTIONS = [
  { label: 'Nam', value: 'male', icon: 'male-outline' },
  { label: 'Nữ', value: 'female', icon: 'female-outline' },
  { label: 'Khác', value: 'other', icon: 'transgender-outline' },
];

export default function RegisterStudent() {
  const router = useRouter();
  const { registerStudent } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    studentId: '',
    gender: '',
    university: UNIVERSITIES[0],
    major: MAJORS[0],
    year: ACADEMIC_YEARS[2], // Sinh viên năm 3
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.fullName) e.fullName = 'Vui lòng nhập họ tên';
    if (!form.email) e.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ';
    if (!form.password) e.password = 'Vui lòng nhập mật khẩu';
    else if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (!form.studentId) e.studentId = 'Vui lòng nhập mã số sinh viên';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await registerStudent({
        ...form,
        email: form.email.trim(),
      });
      router.replace('/(auth)/create-profile');
    } catch (err) {
      Alert.alert('Đăng ký thất bại', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.surface]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, { backgroundColor: COLORS.primary + '15', top: -80, right: -60 }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <View style={styles.headerBadge}>
              <Ionicons name="school-outline" size={20} color={COLORS.primary} />
              <Text style={styles.headerBadgeText}>Sinh viên</Text>
            </View>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Điền thông tin để bắt đầu kết nối</Text>

            <View style={styles.card}>
              <Text style={styles.section}>Thông tin cơ bản</Text>
              <Input label="Họ và tên *" value={form.fullName} onChangeText={set('fullName')}
                placeholder="VD: Nguyễn Văn A" autoCapitalize="words" icon="person-outline" error={errors.fullName} />
              <Input label="Email *" value={form.email} onChangeText={set('email')}
                placeholder="VD: sinhvien@school.edu.vn" keyboardType="email-address" icon="mail-outline" error={errors.email} />
              <Input label="Mật khẩu *" value={form.password} onChangeText={set('password')}
                placeholder="Tối thiểu 6 ký tự" secureTextEntry icon="lock-closed-outline" error={errors.password} />
              <Input label="Số điện thoại" value={form.phone} onChangeText={set('phone')}
                placeholder="VD: 0912345678" keyboardType="phone-pad" icon="call-outline" />

              <Text style={[styles.section, { marginTop: 8 }]}>Thông tin sinh viên</Text>
              <Input label="Mã số sinh viên *" value={form.studentId} onChangeText={set('studentId')}
                placeholder="VD: SE181848" autoCapitalize="characters" icon="id-card-outline" error={errors.studentId} />

              {/* Gender Picker */}
              <Text style={styles.inputLabel}>Giới tính</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.genderBtn, form.gender === opt.value && styles.genderBtnActive]}
                    onPress={() => setForm((f) => ({ ...f, gender: opt.value }))}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={form.gender === opt.value ? COLORS.white : COLORS.textSecondary}
                    />
                    <Text style={[styles.genderBtnText, form.gender === opt.value && styles.genderBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.section, { marginTop: 8 }]}>Thông tin học tập</Text>
              <Input label="Trường đại học" value={form.university} onChangeText={set('university')}
                placeholder="VD: Đại học FPT" autoCapitalize="words" icon="business-outline" />

              {/* Major Picker */}
              <Text style={styles.inputLabel}>Chuyên ngành</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowMajorPicker(!showMajorPicker)}
              >
                <Ionicons name="book-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
                <Text style={styles.pickerBtnText}>{form.major}</Text>
                <Ionicons name={showMajorPicker ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              {showMajorPicker && (
                <View style={styles.pickerList}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                    {MAJORS.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.pickerItem, form.major === m && styles.pickerItemActive]}
                        onPress={() => { setForm((f) => ({ ...f, major: m })); setShowMajorPicker(false); }}
                      >
                        <Text style={[styles.pickerItemText, form.major === m && styles.pickerItemTextActive]}>
                          {m}
                        </Text>
                        {form.major === m && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Year Picker */}
              <Text style={[styles.inputLabel, { marginTop: 4 }]}>Năm học</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowYearPicker(!showYearPicker)}
              >
                <Ionicons name="calendar-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
                <Text style={styles.pickerBtnText}>{form.year}</Text>
                <Ionicons name={showYearPicker ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              {showYearPicker && (
                <View style={styles.pickerList}>
                  {ACADEMIC_YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.pickerItem, form.year === y && styles.pickerItemActive]}
                      onPress={() => { setForm((f) => ({ ...f, year: y })); setShowYearPicker(false); }}
                    >
                      <Text style={[styles.pickerItemText, form.year === y && styles.pickerItemTextActive]}>
                        {y}
                      </Text>
                      {form.year === y && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Button
              title="Đăng ký"
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: 24 }}
            />

            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
              <Text style={styles.loginLinkText}>
                Đã có tài khoản? <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Đăng nhập</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  blob: { position: 'absolute', width: 250, height: 250, borderRadius: 125 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },
  backBtn: { paddingVertical: 8, marginBottom: 16 },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  headerBadgeText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, marginBottom: 24 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  section: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginLinkText: { color: COLORS.textSecondary, fontSize: 14 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  genderBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  genderBtnTextActive: {
    color: COLORS.white,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 4,
  },
  pickerBtnText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  pickerList: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  pickerItemActive: {
    backgroundColor: COLORS.primary + '10',
  },
  pickerItemText: {
    fontSize: 14,
    color: COLORS.text,
  },
  pickerItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
