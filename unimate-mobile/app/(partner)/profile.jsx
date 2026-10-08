import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';

export default function PartnerProfile() {
  const router = useRouter();
  const { user, logout, changePassword } = useAuth();

  const [pwModal, setPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState({});

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản đối tác?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    const errs = {};
    if (!currentPw) errs.current = 'Vui lòng nhập mật khẩu hiện tại';
    if (!newPw) errs.new = 'Vui lòng nhập mật khẩu mới';
    else if (newPw.length < 6) errs.new = 'Mật khẩu mới phải từ 6 ký tự trở lên';
    if (!confirmPw) errs.confirm = 'Vui lòng xác nhận mật khẩu mới';
    else if (newPw !== confirmPw) errs.confirm = 'Mật khẩu xác nhận không khớp';

    setPwErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPwLoading(true);
    try {
      if (changePassword) {
        await changePassword(currentPw, newPw);
      }
      Alert.alert('Thành công! 🎉', 'Mật khẩu đối tác đã được cập nhật thành công.');
      setPwModal(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwErrors({});
    } catch (err) {
      Alert.alert('Đổi mật khẩu thất bại', err.message || 'Mật khẩu hiện tại không đúng');
    } finally {
      setPwLoading(false);
    }
  };

  const businessName =
    user?.partnerProfile?.businessName || user?.fullName || 'Doanh nghiệp Đối Tác';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Ionicons name="business" size={40} color={COLORS.primary} />
          </View>

          <View style={styles.partnerBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#D97706" />
            <Text style={styles.partnerBadgeText}>TÀI KHOẢN ĐỐI TÁC</Text>
          </View>

          <Text style={styles.businessTitle}>{businessName}</Text>
          <Text style={styles.repName}>Đại diện: {user?.fullName || 'Chưa cập nhật'}</Text>
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>

        {/* Business Info Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.infoLabel}>Email đối tác</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={COLORS.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>
                {user?.phone || user?.partnerProfile?.phone || 'Chưa cập nhật'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={18} color={COLORS.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.infoLabel}>Tên doanh nghiệp / Quán</Text>
              <Text style={styles.infoValue}>{businessName}</Text>
            </View>
          </View>
        </View>

        {/* Web Portal Notice */}
        <View style={styles.webNoticeCard}>
          <View style={styles.webNoticeHeader}>
            <Ionicons name="desktop-outline" size={20} color="#FF9800" />
            <Text style={styles.webNoticeTitle}>Cổng Quản Lý Web Đối Tác</Text>
          </View>
          <Text style={styles.webNoticeDesc}>
            Để tạo mới cơ sở quán cafe, tải nhiều ảnh không gian, phát hành voucher mới hoặc xuất báo cáo đối soát doanh thu, vui lòng đăng nhập trên máy tính tại Uni-Mate Partner Web Portal.
          </Text>
        </View>

        {/* Menu Actions Card */}
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setPwModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="key-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.menuLabel}>Đổi mật khẩu</Text>
              <Text style={styles.menuSublabel}>Cập nhật mật khẩu bảo mật tài khoản</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.menuLabel, { color: COLORS.error }]}>Đăng xuất</Text>
              <Text style={styles.menuSublabel}>Thoát khỏi phiên làm việc đối tác</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={pwModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons name="key-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
                <Text style={styles.modalSubtitle}>
                  Cập nhật mật khẩu mới cho tài khoản đối tác của bạn.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setPwModal(false);
                  setPwErrors({});
                  setCurrentPw('');
                  setNewPw('');
                  setConfirmPw('');
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Input
              label="Mật khẩu hiện tại"
              placeholder="Nhập mật khẩu đang dùng"
              value={currentPw}
              onChangeText={(t) => {
                setCurrentPw(t);
                if (pwErrors.current) setPwErrors((e) => ({ ...e, current: null }));
              }}
              secureTextEntry
              icon="lock-closed-outline"
              error={pwErrors.current}
            />
            <Input
              label="Mật khẩu mới"
              placeholder="Từ 6 ký tự trở lên"
              value={newPw}
              onChangeText={(t) => {
                setNewPw(t);
                if (pwErrors.new) setPwErrors((e) => ({ ...e, new: null }));
              }}
              secureTextEntry
              icon="lock-closed-outline"
              error={pwErrors.new}
            />
            <Input
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPw}
              onChangeText={(t) => {
                setConfirmPw(t);
                if (pwErrors.confirm) setPwErrors((e) => ({ ...e, confirm: null }));
              }}
              secureTextEntry
              icon="lock-closed-outline"
              error={pwErrors.confirm}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setPwModal(false);
                  setPwErrors({});
                  setCurrentPw('');
                  setNewPw('');
                  setConfirmPw('');
                }}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cập nhật"
                  onPress={handleChangePassword}
                  loading={pwLoading}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  avatarBox: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    marginBottom: 8,
  },
  partnerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  businessTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  repName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  emailText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 10,
  },
  webNoticeCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  webNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  webNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  webNoticeDesc: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  menuSublabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    marginTop: 2,
    lineHeight: 16,
  },
  modalCloseBtn: {
    padding: 4,
    marginLeft: 6,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
