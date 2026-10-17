import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { userApi, buildAvatarFormData } from '../../src/api/userApi';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { formatStudentYear } from '../../src/constants/academic';

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
  const { user, logout, changePassword, updateUser } = useAuth();
  const router = useRouter();
  const [pwModal, setPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState({});
  const [avatarLoading, setAvatarLoading] = useState(false);

  const handleAvatarPress = () => {
    Alert.alert(
      'Thay đổi ảnh đại diện',
      'Chọn phương thức cập nhật ảnh đại diện của bạn',
      [
        {
          text: 'Chụp ảnh mới 📷',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Chọn từ thư viện ảnh 🖼️',
          onPress: () => pickImage('library'),
        },
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async (sourceType) => {
    try {
      let result;
      if (sourceType === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập máy ảnh để chụp ảnh đại diện.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện để chọn ảnh đại diện.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadAvatarFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể chọn ảnh');
    }
  };

  const uploadAvatarFile = async (asset) => {
    setAvatarLoading(true);
    try {
      const res = await userApi.updateAvatar(buildAvatarFormData(asset.uri));
      const newAvatarUrl = res?.data?.data?.avatar;
      if (!newAvatarUrl) throw new Error('Máy chủ không trả về ảnh đại diện mới');

      if (updateUser) {
        updateUser({ avatar: newAvatarUrl });
      }
      Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện của bạn!');
    } catch (err) {
      // Không hiển thị ảnh local như đã lưu — ảnh chưa vào DB
      Alert.alert('Tải ảnh thất bại', err.message || 'Không thể cập nhật ảnh đại diện');
    } finally {
      setAvatarLoading(false);
    }
  };

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

  const handleUpgradePremium = () => {
    Alert.alert(
      'Nâng cấp Premium nhận Tích Xanh',
      'Đặc quyền thành viên:\n✓ Tích xanh xác thực uy tín bên cạnh tên\n✓ Ưu tiên hiển thị top khi tìm bạn học\n✓ Voucher cafe đối tác độc quyền tới 50%\n\nChọn gói nâng cấp:',
      [
        {
          text: 'Gói 1 Tháng (100 Coin)',
          onPress: async () => {
            try {
              const res = await userApi.buyPremium({ plan: 'monthly', paymentMethod: 'coin' });
              if (res.data?.data?.user) updateUser(res.data.data.user);
              Alert.alert('Thành công', 'Chúc mừng bạn đã nâng cấp Premium và nhận tích xanh xác thực!');
            } catch (err) {
              Alert.alert('Thông báo', err.response?.data?.message || err.message || 'Không thể nâng cấp');
            }
          },
        },
        {
          text: 'Gói 1 Năm (800 Coin)',
          onPress: async () => {
            try {
              const res = await userApi.buyPremium({ plan: 'yearly', paymentMethod: 'coin' });
              if (res.data?.data?.user) updateUser(res.data.data.user);
              Alert.alert('Thành công', 'Chúc mừng bạn đã nâng cấp Premium 1 Năm và nhận tích xanh xác thực!');
            } catch (err) {
              Alert.alert('Thông báo', err.response?.data?.message || err.message || 'Không thể nâng cấp');
            }
          },
        },
        {
          text: 'Đóng',
          style: 'cancel',
        },
      ]
    );
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
      Alert.alert('Thành công! 🎉', 'Mật khẩu của bạn đã được cập nhật thành công.');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAvatarPress}
              disabled={avatarLoading}
              style={{ position: 'relative' }}
            >
              <Avatar name={user?.fullName || 'U'} uri={user?.avatar} size={88} />
              {avatarLoading && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editBadge}
              onPress={handleAvatarPress}
              disabled={avatarLoading}
              activeOpacity={0.8}
            >
              {avatarLoading ? (
                <ActivityIndicator size={12} color={COLORS.white} />
              ) : (
                <Ionicons name="camera" size={15} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.userName}>{user?.fullName || 'Sinh viên'}</Text>
            {user?.isVerifiedStudent && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#0284C7" />
              </View>
            )}
          </View>

          {/* School & Major info */}
          <Text style={styles.userSchool}>
            {[user?.university, user?.major, user?.year ? formatStudentYear(user.year) : 'Sinh viên']
              .filter(Boolean)
              .join(' • ') || 'Chưa cập nhật thông tin'}
          </Text>

          {/* MSSV & Gender */}
          {(user?.studentId || user?.gender) && (
            <View style={styles.infoRow}>
              {user?.studentId && (
                <View style={styles.infoPill}>
                  <Ionicons name="id-card-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.infoPillText}>{user.studentId}</Text>
                </View>
              )}
              {user?.gender && (
                <View style={styles.infoPill}>
                  <Ionicons
                    name={user.gender === 'male' ? 'male-outline' : user.gender === 'female' ? 'female-outline' : 'transgender-outline'}
                    size={13}
                    color={COLORS.primary}
                  />
                  <Text style={styles.infoPillText}>
                    {user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {user?.bio && (
            <Text style={styles.userBio}>“{user.bio}”</Text>
          )}

          {user?.uniCoin !== undefined && (
            <TouchableOpacity
              style={styles.goldPill}
              onPress={() => router.push('/unicoin')}
              activeOpacity={0.8}
            >
              <Text style={styles.goldText}>💎 {user.uniCoin} UniCoin • Điểm danh</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.trustScore ?? 0}</Text>
            <Text style={styles.statLabel}>Trust Score</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/unicoin')}
            activeOpacity={0.8}
          >
            <Text style={styles.statNumber}>{user?.uniCoin ?? 0}</Text>
            <Text style={styles.statLabel}>UniCoin</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.isVerifiedStudent ? 'SV' : '---'}</Text>
            <Text style={styles.statLabel}>Trạng thái</Text>
          </View>
        </View>

        {/* My Interests Section */}
        {user?.interests && user.interests.length > 0 ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sở thích của tôi</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/interests')}>
                <Text style={styles.editText}>Thay đổi</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tagWrap}>
              {user.interests.map((tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.sectionCard, styles.addInterestCard]}
            onPress={() => router.push('/(auth)/interests')}
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.addInterestText}>Thêm sở thích của bạn</Text>
          </TouchableOpacity>
        )}

        {/* Menu Section */}
        <View style={styles.menuCard}>
          <MenuItem
            icon={user?.isVerifiedStudent ? "checkmark-circle" : "star-outline"}
            label={user?.isVerifiedStudent ? "Hội viên Premium (Đã có tích xanh)" : "Nâng cấp Premium nhận Tích Xanh"}
            sublabel={user?.isVerifiedStudent ? "Tài khoản của bạn đã được xác thực chính chủ" : "Nhận tích xanh uy tín & ưu tiên kết nối bạn học"}
            onPress={handleUpgradePremium}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="gift-outline"
            label="Trung tâm UniCoin & Điểm danh"
            sublabel="Điểm danh nhận xu hàng ngày & Check-in quán cafe"
            onPress={() => router.push('/unicoin')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="ticket-outline"
            label="Ví Voucher của tôi"
            sublabel="Xem mã QR và đưa nhân viên thu ngân quét"
            onPress={() => router.push('/my-vouchers')}
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
                  Cập nhật mật khẩu mới để bảo vệ tài khoản UNI-MATE của bạn.
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
              placeholder="Nhập mật khẩu cũ"
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
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  addInterestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addInterestText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
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
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
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
