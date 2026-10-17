import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/colors';
import { coinApi } from '../src/api/coinApi';
import { useAuth } from '../src/context/AuthContext';

export default function UniCoinScreen() {
  const router = useRouter();
  const { updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Check-in quán cafe modal
  const [venueModalVisible, setVenueModalVisible] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [venueCheckinLoading, setVenueCheckinLoading] = useState(false);

  const fetchStatus = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await coinApi.getCoinStatus();
      if (res?.data?.success) {
        setStatus(res.data.data);
        if (updateUser && typeof res.data.data.uniCoin === 'number') {
          updateUser({ uniCoin: res.data.data.uniCoin });
        }
      }
    } catch (err) {
      console.log('Lỗi tải trạng thái UniCoin:', err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Xử lý điểm danh hàng ngày
  const handleDailyCheckin = async () => {
    if (!status?.canCheckinToday) {
      return Alert.alert('Thông báo', 'Hôm nay bạn đã điểm danh rồi. Hãy quay lại vào ngày mai nhé!');
    }

    try {
      setCheckingIn(true);
      const res = await coinApi.dailyCheckin();
      if (res?.data?.success) {
        Alert.alert('Thành công 🎉', res.data.message || 'Điểm danh thành công!');
        fetchStatus();
      }
    } catch (err) {
      Alert.alert('Lỗi điểm danh', err?.response?.data?.message || 'Không thể điểm danh lúc này');
    } finally {
      setCheckingIn(false);
    }
  };

  // Xử lý check-in quán cafe
  const handleVenueCheckin = async () => {
    const rawCode = qrCodeInput.trim();
    if (!rawCode) {
      return Alert.alert('Thông báo', 'Vui lòng nhập hoặc dán nội dung mã QR check-in tại quán');
    }

    try {
      setVenueCheckinLoading(true);
      const payload = { qrContent: rawCode };
      const res = await coinApi.venueCheckin(payload);

      if (res?.data?.success) {
        Alert.alert('Check-in thành công ☕', res.data.message || 'Bạn đã nhận được UniCoin!');
        setVenueModalVisible(false);
        setQrCodeInput('');
        fetchStatus();
      }
    } catch (err) {
      Alert.alert('Check-in thất bại', err?.response?.data?.message || 'Mã QR không hợp lệ hoặc đã hết hạn');
    } finally {
      setVenueCheckinLoading(false);
    }
  };

  const streakDays = [1, 2, 3, 4, 5, 6, 7];
  const currentStreak = status?.currentStreak || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trung tâm UniCoin</Text>
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() =>
            Alert.alert(
              'Quy định UniCoin',
              '• Điểm danh hằng ngày: +10 coin/ngày.\n• Streak 3 ngày: +5 bonus.\n• Streak 7 ngày: +15 bonus.\n• Check-in quán cafe đối tác: +20 coin (tối đa 2 quán/ngày).\n• Giới hạn kiếm tối đa: 60 coin/ngày.\n• Dùng coin để đổi voucher hoặc nâng cấp Premium.'
            )
          }
        >
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu UniCoin...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchStatus(true)}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Card Số Dư UniCoin */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceTopRow}>
              <View>
                <Text style={styles.balanceLabel}>Số dư của bạn</Text>
                <View style={styles.coinAmountRow}>
                  <Text style={styles.coinIcon}>💎</Text>
                  <Text style={styles.coinValue}>{status?.uniCoin ?? 0}</Text>
                  <Text style={styles.coinUnit}>UniCoin</Text>
                </View>
              </View>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={20} color="#F59E0B" />
                <Text style={styles.streakText}>{currentStreak} ngày</Text>
              </View>
            </View>

            <View style={styles.balanceDivider} />

            <View style={styles.dailyQuotaRow}>
              <View style={styles.quotaCol}>
                <Text style={styles.quotaTitle}>Đã kiếm hôm nay</Text>
                <Text style={styles.quotaValue}>
                  {status?.earnedToday ?? 0} / {status?.maxDailyEarn ?? 60} coin
                </Text>
              </View>
              <View style={styles.quotaCol}>
                <Text style={styles.quotaTitle}>Check-in quán hôm nay</Text>
                <Text style={styles.quotaValue}>
                  {status?.venueCheckinsToday ?? 0} / {status?.maxVenueCheckinsPerDay ?? 2} lần
                </Text>
              </View>
            </View>
          </View>

          {/* Khối Điểm Danh Hàng Ngày */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Điểm danh nhận xu</Text>
                <Text style={styles.sectionSubtitle}>Duy trì liên tục để nhận thưởng Streak</Text>
              </View>
              {status?.canCheckinToday ? (
                <View style={styles.readyBadge}>
                  <Text style={styles.readyBadgeText}>Chưa điểm danh</Text>
                </View>
              ) : (
                <View style={styles.doneBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.doneBadgeText}>Đã điểm danh</Text>
                </View>
              )}
            </View>

            {/* Chuỗi 7 ngày Streak */}
            <View style={styles.streakList}>
              {streakDays.map((day) => {
                const isPassed = currentStreak >= day;
                const isCurrent = currentStreak + 1 === day && status?.canCheckinToday;
                const isBonus = day === 3 || day === 7;

                return (
                  <View
                    key={day}
                    style={[
                      styles.streakDayItem,
                      isPassed && styles.streakDayItemPassed,
                      isCurrent && styles.streakDayItemCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.streakDayTitle,
                        (isPassed || isCurrent) && styles.streakDayTitleActive,
                      ]}
                    >
                      N{day}
                    </Text>
                    <View
                      style={[
                        styles.streakDayIconCircle,
                        isPassed && styles.streakDayIconPassed,
                        isCurrent && styles.streakDayIconCurrent,
                      ]}
                    >
                      {isPassed ? (
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      ) : (
                        <Text style={styles.streakCoinBonus}>
                          {day === 7 ? '+25' : day === 3 ? '+15' : '+10'}
                        </Text>
                      )}
                    </View>
                    {isBonus && (
                      <View style={styles.bonusTag}>
                        <Text style={styles.bonusTagText}>Quà</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Nút bấm điểm danh */}
            <TouchableOpacity
              style={[
                styles.checkinActionBtn,
                !status?.canCheckinToday && styles.checkinActionBtnDisabled,
              ]}
              onPress={handleDailyCheckin}
              disabled={!status?.canCheckinToday || checkingIn}
              activeOpacity={0.85}
            >
              {checkingIn ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons
                    name={status?.canCheckinToday ? 'calendar' : 'checkmark-done-circle'}
                    size={20}
                    color="#FFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.checkinActionBtnText}>
                    {status?.canCheckinToday
                      ? 'Điểm danh ngay (+10 coin)'
                      : 'Hôm nay bạn đã điểm danh rồi'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Khối Check-in Quán Cafe */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Check-in tại Quán Cafe</Text>
                <Text style={styles.sectionSubtitle}>
                  Nhận +20 UniCoin khi ghé thăm quán đối tác
                </Text>
              </View>
              <Ionicons name="cafe" size={24} color="#D97706" />
            </View>

            <Text style={styles.venueCheckinDesc}>
              Mỗi quán cafe đối tác của UNI-MATE đều có bảng mã QR check-in tại quầy thu ngân. Hãy quét hoặc nhập mã để nhận 20 coin ngay!
            </Text>

            <TouchableOpacity
              style={styles.venueCheckinBtn}
              onPress={() => setVenueModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="qr-code-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.venueCheckinBtnText}>Nhập mã QR check-in quán</Text>
            </TouchableOpacity>
          </View>

          {/* Dùng Coin Đổi Voucher Banner */}
          <TouchableOpacity
            style={styles.redeemBanner}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.85}
          >
            <View style={styles.redeemIconBox}>
              <Ionicons name="pricetags" size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.redeemTitle}>Đổi Voucher Giảm Giá Quán Cafe</Text>
              <Text style={styles.redeemSub}>Khám phá các ưu đãi từ 10% - 50% dành cho sinh viên</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </TouchableOpacity>

          {/* Lịch sử giao dịch Coin */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Lịch sử UniCoin gần đây</Text>
            {(!status?.coinLog || status.coinLog.length === 0) ? (
              <View style={styles.emptyHistoryBox}>
                <Ionicons name="time-outline" size={32} color={COLORS.textMuted} />
                <Text style={styles.emptyHistoryText}>Chưa có lịch sử giao dịch coin nào</Text>
              </View>
            ) : (
              status.coinLog.map((log, index) => {
                const isPositive = log.amount > 0;
                const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }) : '';

                return (
                  <View key={log._id || index} style={styles.historyItem}>
                    <View
                      style={[
                        styles.historyIconCircle,
                        isPositive ? styles.historyIconPositive : styles.historyIconNegative,
                      ]}
                    >
                      <Ionicons
                        name={isPositive ? 'arrow-down-outline' : 'arrow-up-outline'}
                        size={16}
                        color={isPositive ? '#059669' : '#DC2626'}
                      />
                    </View>
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemDesc}>{log.description || 'Giao dịch UniCoin'}</Text>
                      <Text style={styles.historyItemDate}>{dateStr}</Text>
                    </View>
                    <Text
                      style={[
                        styles.historyItemAmount,
                        isPositive ? styles.amountPositive : styles.amountNegative,
                      ]}
                    >
                      {isPositive ? `+${log.amount}` : log.amount}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal Check-in Quán Cafe */}
      <Modal
        visible={venueModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVenueModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Check-in tại quán Cafe</Text>
              <TouchableOpacity onPress={() => setVenueModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Nhập hoặc dán nội dung mã QR check-in dán tại quán (ví dụ: UNIMATE-CHECKIN:...) để nhận ngay +20 coin.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Dán mã QR check-in tại đây..."
              placeholderTextColor={COLORS.textMuted}
              value={qrCodeInput}
              onChangeText={setQrCodeInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setVenueModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, venueCheckinLoading && { opacity: 0.7 }]}
                onPress={handleVenueCheckin}
                disabled={venueCheckinLoading}
              >
                {venueCheckinLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Xác nhận (+20 coin)</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  helpBtn: {
    padding: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Balance Card
  balanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  coinAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  coinIcon: {
    fontSize: 26,
    marginRight: 8,
  },
  coinValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#F8FAFC',
    marginRight: 6,
  },
  coinUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#38BDF8',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
    marginLeft: 4,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  dailyQuotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quotaCol: {
    flex: 1,
  },
  quotaTitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  quotaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 2,
  },
  // Section Card
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  readyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  readyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  doneBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 4,
  },
  // Streak 7 days
  streakList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  streakDayItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    minWidth: 42,
  },
  streakDayItemPassed: {
    backgroundColor: '#E0F2FE',
  },
  streakDayItemCurrent: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  streakDayTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  streakDayTitleActive: {
    color: COLORS.primary,
  },
  streakDayIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakDayIconPassed: {
    backgroundColor: '#0284C7',
  },
  streakDayIconCurrent: {
    backgroundColor: COLORS.primary,
  },
  streakCoinBonus: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  bonusTag: {
    marginTop: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bonusTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#EF4444',
  },
  checkinActionBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
  checkinActionBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  checkinActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  // Venue checkin
  venueCheckinDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  venueCheckinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#F0F9FF',
    paddingVertical: 12,
    borderRadius: 12,
  },
  venueCheckinBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Banner Redeem
  redeemBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  redeemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  redeemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  redeemSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  // History
  historySection: {
    marginTop: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyHistoryText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyIconPositive: {
    backgroundColor: '#D1FAE5',
  },
  historyIconNegative: {
    backgroundColor: '#FEE2E2',
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  historyItemDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  historyItemAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  amountPositive: {
    color: '#059669',
  },
  amountNegative: {
    color: '#DC2626',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
