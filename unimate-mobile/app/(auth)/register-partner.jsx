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

export default function RegisterPartner() {
  const router = useRouter();
  const { registerPartner } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    businessName: '',
  });
  const [errors, setErrors] = useState({});

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.fullName) e.fullName = 'Vui lòng nhập họ tên';
    if (!form.email) e.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ';
    if (!form.password) e.password = 'Vui lòng nhập mật khẩu';
    else if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (!form.businessName) e.businessName = 'Vui lòng nhập tên doanh nghiệp';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await registerPartner({ ...form, email: form.email.trim() });
      Alert.alert(
        'Đăng ký thành công',
        'Tài khoản đối tác đang chờ phê duyệt. Chúng tôi sẽ liên hệ sớm!',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
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
      <View style={[styles.blob, { backgroundColor: COLORS.secondary + '15', top: -80, left: -60 }]} />

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
              <Ionicons name="briefcase-outline" size={20} color={COLORS.secondary} />
              <Text style={[styles.headerBadgeText, { color: COLORS.secondary }]}>Đối tác</Text>
            </View>
            <Text style={styles.title}>Đăng ký đối tác</Text>
            <Text style={styles.subtitle}>Kết nối với hàng nghìn sinh viên tài năng</Text>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
              <Text style={styles.infoText}>
                Tài khoản đối tác sẽ cần được phê duyệt trước khi sử dụng.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.section}>Thông tin người đại diện</Text>
              <Input label="Họ và tên *" value={form.fullName} onChangeText={set('fullName')}
                placeholder="Nguyễn Văn A" autoCapitalize="words" icon="person-outline" error={errors.fullName} />
              <Input label="Email *" value={form.email} onChangeText={set('email')}
                placeholder="contact@company.com" keyboardType="email-address" icon="mail-outline" error={errors.email} />
              <Input label="Mật khẩu *" value={form.password} onChangeText={set('password')}
                placeholder="Tối thiểu 6 ký tự" secureTextEntry icon="lock-closed-outline" error={errors.password} />
              <Input label="Số điện thoại" value={form.phone} onChangeText={set('phone')}
                placeholder="0xxxxxxxxx" keyboardType="phone-pad" icon="call-outline" />

              <Text style={[styles.section, { marginTop: 8 }]}>Thông tin doanh nghiệp</Text>
              <Input label="Tên doanh nghiệp *" value={form.businessName} onChangeText={set('businessName')}
                placeholder="VD: Công ty ABC" autoCapitalize="words" icon="business-outline" error={errors.businessName} />
            </View>

            <Button
              title="Gửi đăng ký"
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
    backgroundColor: COLORS.secondary + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  headerBadgeText: { fontSize: 13, fontWeight: '600' },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, marginBottom: 16 },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.warning + '15',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: { color: COLORS.warning, fontSize: 13, flex: 1, lineHeight: 18 },
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
});
