import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/colors';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { useAuth } from '../../src/context/AuthContext';

export default function Login() {
  const router = useRouter();
  const { login, forgotPassword, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // State cho luồng Quên mật khẩu
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email không hợp lệ';
    if (!password) e.password = 'Vui lòng nhập mật khẩu';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      if (user?.role === 'partner') {
        router.replace('/(partner)/dashboard');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err) {
      Alert.alert('Đăng nhập thất bại', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gửi email yêu cầu đặt lại mật khẩu
  const handleSendForgotEmail = async () => {
    if (!forgotEmail.trim()) {
      return Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email');
    }
    if (!/\S+@\S+\.\S+/.test(forgotEmail.trim())) {
      return Alert.alert('Lỗi', 'Email không đúng định dạng');
    }

    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail.trim());
      Alert.alert(
        'Đã gửi email! 📬',
        'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết kèm mã xác thực đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn (cả mục Spam/Rác).',
        [
          {
            text: 'Nhập mã đổi mật khẩu ngay',
            onPress: () => setForgotStep('reset'),
          },
          {
            text: 'Đóng',
            onPress: () => {
              setShowForgotModal(false);
              setForgotStep('request');
            },
            style: 'cancel',
          },
        ]
      );
    } catch (err) {
      Alert.alert('Gửi thất bại', err.message || 'Không thể gửi email lúc này');
    } finally {
      setForgotLoading(false);
    }
  };

  // Xác nhận đặt lại mật khẩu mới bằng token
  const handleResetPassword = async () => {
    if (!resetToken.trim()) {
      return Alert.alert('Lỗi', 'Vui lòng nhập mã token từ email');
    }
    if (!newPassword || newPassword.length < 6) {
      return Alert.alert('Lỗi', 'Mật khẩu mới phải từ 6 ký tự trở lên');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
    }

    setForgotLoading(true);
    try {
      await resetPassword(resetToken.trim(), newPassword);
      Alert.alert(
        'Thành công! 🎉',
        'Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập lại.',
        [
          {
            text: 'Đăng nhập ngay',
            onPress: () => {
              if (forgotEmail) setEmail(forgotEmail);
              setPassword('');
              setShowForgotModal(false);
              setForgotStep('request');
              setResetToken('');
              setNewPassword('');
              setConfirmPassword('');
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Đặt lại mật khẩu thất bại', err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.coverWrapper}>
                <Image
                  source={require('../../assets/cover.png')}
                  style={styles.coverBanner}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>Chào mừng trở lại</Text>
              <Text style={styles.subtitle}>Đăng nhập để tiếp tục hành trình của bạn</Text>
            </View>

            {/* Form card */}
            <View style={styles.card}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                keyboardType="email-address"
                icon="mail-outline"
                error={errors.email}
              />
              <Input
                label="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu"
                secureTextEntry
                icon="lock-closed-outline"
                error={errors.password}
              />

              {/* Forgot password link */}
              <View style={styles.forgotRow}>
                <TouchableOpacity
                  onPress={() => {
                    setForgotEmail(email);
                    setForgotStep('request');
                    setShowForgotModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Đăng nhập"
                onPress={handleLogin}
                loading={loading}
                style={{ marginTop: 8 }}
              />
            </View>

            {/* Footer */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              style={styles.footer}
              activeOpacity={0.7}
            >
              <Text style={styles.footerText}>
                Chưa có tài khoản?{' '}
                <Text style={styles.registerLinkText}>Đăng ký ngay</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modal Quên & Đặt lại mật khẩu */}
      <Modal visible={showForgotModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons
                  name={forgotStep === 'request' ? 'key-outline' : 'shield-checkmark-outline'}
                  size={24}
                  color={COLORS.primary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>
                  {forgotStep === 'request' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {forgotStep === 'request'
                    ? 'Nhập email để nhận link & mã đặt lại mật khẩu qua thư điện tử.'
                    : 'Nhập mã token từ email và thiết lập mật khẩu mới.'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowForgotModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {forgotStep === 'request' ? (
              <View style={{ marginTop: 12 }}>
                <Input
                  label="Email đã đăng ký"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  placeholder="name@university.edu.vn"
                  keyboardType="email-address"
                  icon="mail-outline"
                />

                <Button
                  title="Gửi mã đặt lại mật khẩu"
                  onPress={handleSendForgotEmail}
                  loading={forgotLoading}
                  style={{ marginTop: 8 }}
                />

                <TouchableOpacity
                  onPress={() => setForgotStep('reset')}
                  style={styles.switchStepBtn}
                >
                  <Text style={styles.switchStepText}>
                    Đã nhận được mã token? Đặt lại mật khẩu ngay →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <Input
                  label="Mã token xác thực (từ email)"
                  value={resetToken}
                  onChangeText={setResetToken}
                  placeholder="Dán mã token 64 ký tự từ email"
                  icon="key-outline"
                />

                <Input
                  label="Mật khẩu mới"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Tối thiểu 6 ký tự"
                  secureTextEntry
                  icon="lock-closed-outline"
                />

                <Input
                  label="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  secureTextEntry
                  icon="lock-closed-outline"
                />

                <Button
                  title="Xác nhận đổi mật khẩu"
                  onPress={handleResetPassword}
                  loading={forgotLoading}
                  style={{ marginTop: 8 }}
                />

                <TouchableOpacity
                  onPress={() => setForgotStep('request')}
                  style={styles.switchStepBtn}
                >
                  <Text style={styles.switchStepText}>
                    ← Quay lại gửi lại mã xác thực
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  blob1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary + '15',
    top: -100,
    right: -80,
  },
  blob2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.secondary + '10',
    bottom: 100,
    left: -60,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: { alignItems: 'center', marginBottom: 28 },
  coverWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  coverBanner: {
    width: 260,
    height: 98,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  registerLinkText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  modalCloseBtn: {
    padding: 4,
    marginLeft: 6,
  },
  switchStepBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchStepText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
