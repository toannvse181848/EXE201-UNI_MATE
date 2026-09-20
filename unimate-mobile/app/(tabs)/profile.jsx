import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';

const MenuItem = ({ icon, label, sublabel, onPress, danger = false }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIcon, danger && { backgroundColor: '#FEE2E2' }]}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? COLORS.error : COLORS.primary}
      />
    </View>
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={[styles.menuLabel, danger && { color: COLORS.error }]}>
        {label}
      </Text>
      {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { user, logout, changePassword } = useAuth();
  const router = useRouter();
  const [pwModal, setPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
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
    if (!currentPw || !newPw || !confirmPw) {
      return Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
    }
    if (newPw !== confirmPw) {
      return Alert.alert('Lỗi', 'Mật khẩu mới không khớp');
    }
    if (newPw.length < 6) {
      return Alert.alert('Lỗi', 'Mật khẩu mới phải từ 6 ký tự');
    }
    setPwLoading(true);
    try {
      if (changePassword) {
        await changePassword(currentPw, newPw);
      }
      Alert.alert('Thành công', 'Đổi mật khẩu thành công!');
      setPwModal(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      Alert.alert('Thất bại', err.message || 'Có lỗi xảy ra');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Avatar name={user?.fullName || 'Minh Anh'} uri={user?.avatar} size={84} />
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => router.push('/(auth)/create-profile')}
            >
              <Ionicons name="pencil" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.userName}>{user?.fullName || 'Nguyễn Minh Anh'}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#0284C7" />
            </View>
          </View>

          <Text style={styles.userSchool}>ĐH Bách Khoa TP.HCM • K21 CNTT</Text>
          <Text style={styles.userBio}>
            "Đam mê code, thích học cafe cuối tuần và tìm bạn cùng ôn thi chứng chỉ."
          </Text>

          <View style={styles.goldPill}>
            <Text style={styles.goldText}>👑 UNI-MATE GOLD MEMBER</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>28</Text>
            <Text style={styles.statLabel}>Kết nối match</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>14</Text>
            <Text style={styles.statLabel}>Điểm check-in</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>06</Text>
            <Text style={styles.statLabel}>Voucher đã dùng</Text>
          </View>
        </View>

        {/* My Interests Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sở thích của tôi</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/interests')}>
              <Text style={styles.editText}>Thay đổi</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagWrap}>
            {['#lap_trinh', '#cafe_chill', '#doc_sach', '#ielts_7_0', '#boardgame'].map(
              (tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuCard}>
          <MenuItem
            icon="ticket-outline"
            label="Voucher của tôi"
            sublabel="Xem và quét mã QR tại quán"
            onPress={() => router.push('/(tabs)/explore')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="person-outline"
            label="Chỉnh sửa hồ sơ"
            sublabel="Cập nhật thông tin & mục đích kết nối"
            onPress={() => router.push('/(auth)/create-profile')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="key-outline"
            label="Đổi mật khẩu"
            onPress={() => setPwModal(true)}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Chính sách & Bảo mật"
            onPress={() => Alert.alert('Chính sách', 'UNI-MATE cam kết bảo vệ dữ liệu sinh viên.')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="log-out-outline"
            label="Đăng xuất"
            danger
            onPress={handleLogout}
          />
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={pwModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
            <Input
              label="Mật khẩu hiện tại"
              placeholder="Nhập mật khẩu cũ"
              value={currentPw}
              onChangeText={setCurrentPw}
              secureTextEntry
            />
            <Input
              label="Mật khẩu mới"
              placeholder="Từ 6 ký tự trở lên"
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
            />
            <Input
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPwModal(false)}
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
        </View>
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
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginRight: 6,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  userSchool: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  userBio: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
    marginBottom: 12,
  },
  goldPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  goldText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    height: '60%',
    alignSelf: 'center',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  editText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
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
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
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
