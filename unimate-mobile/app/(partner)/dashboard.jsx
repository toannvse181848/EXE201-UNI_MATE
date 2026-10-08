import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { venueApi } from '../../src/api/venueApi';
import { voucherApi } from '../../src/api/voucherApi';

export default function PartnerDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [venues, setVenues] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [redemptionsCount, setRedemptionsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('venues'); // 'venues' | 'vouchers'

  const loadData = useCallback(async () => {
    try {
      const [venuesRes, vouchersRes, redemptionsRes] = await Promise.all([
        venueApi.getMyVenues().catch(() => ({ data: { data: [] } })),
        voucherApi.getMyPartnerVouchers().catch(() => ({ data: { data: [] } })),
        voucherApi.getPartnerRedemptions(50).catch(() => ({ data: { data: [] } })),
      ]);

      setVenues(venuesRes?.data?.data || []);
      setVouchers(vouchersRes?.data?.data || []);
      setRedemptionsCount((redemptionsRes?.data?.data || []).length);
    } catch (err) {
      console.log('Error loading partner data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleVoucher = async (voucherId) => {
    try {
      await voucherApi.toggleVoucherStatus(voucherId);
      setVouchers((prev) =>
        prev.map((v) => (v._id === voucherId ? { ...v, isActive: !v.isActive } : v))
      );
    } catch (err) {
      Alert.alert('Thao tác thất bại', err.message || 'Không thể đổi trạng thái voucher');
    }
  };

  const businessName =
    user?.partnerProfile?.businessName || user?.fullName || 'Đối tác UNI-MATE';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Header Profile Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarBox}>
              <Ionicons name="business" size={26} color={COLORS.primary} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <View style={styles.partnerBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#D97706" />
                <Text style={styles.partnerBadgeText}>ĐỐI TÁC CHÍNH THỨC</Text>
              </View>
              <Text style={styles.businessName}>{businessName}</Text>
              <Text style={styles.partnerEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Quick QR Scanner Banner */}
        <TouchableOpacity
          style={styles.quickScanCard}
          onPress={() => router.push('/(partner)/scanner')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, '#E64A19']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.quickScanGradient}
          >
            <View style={styles.quickScanIconBox}>
              <Ionicons name="qr-code" size={32} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.quickScanTitle}>Máy quét đối soát Voucher</Text>
              <Text style={styles.quickScanSubtitle}>
                Quét mã QR từ ví sinh viên hoặc nhập mã để áp dụng ưu đãi tại quầy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{venues.length}</Text>
            <Text style={styles.statLabel}>Quán cafe</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{vouchers.length}</Text>
            <Text style={styles.statLabel}>Vouchers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{redemptionsCount}</Text>
            <Text style={styles.statLabel}>Lượt Check-in</Text>
          </View>
        </View>

        {/* Tabs Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'venues' && styles.activeSwitchTab]}
            onPress={() => setActiveTab('venues')}
          >
            <Ionicons
              name="cafe-outline"
              size={18}
              color={activeTab === 'venues' ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.switchTabText,
                activeTab === 'venues' && styles.activeSwitchTabText,
              ]}
            >
              Quán của tôi ({venues.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'vouchers' && styles.activeSwitchTab]}
            onPress={() => setActiveTab('vouchers')}
          >
            <Ionicons
              name="ticket-outline"
              size={18}
              color={activeTab === 'vouchers' ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.switchTabText,
                activeTab === 'vouchers' && styles.activeSwitchTabText,
              ]}
            >
              Vouchers ({vouchers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 13 }}>
              Đang tải dữ liệu quán & voucher...
            </Text>
          </View>
        ) : activeTab === 'venues' ? (
          /* Venues List */
          venues.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="storefront-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có quán nào</Text>
              <Text style={styles.emptySubtitle}>
                Bạn có thể đăng nhập trên máy tính (Web Partner Portal) để tạo mới quán cafe và tải ảnh không gian quán.
              </Text>
            </View>
          ) : (
            venues.map((venue) => {
              const statusColor =
                venue.status === 'approved'
                  ? '#10B981'
                  : venue.status === 'rejected'
                  ? '#EF4444'
                  : '#F59E0B';
              const statusText =
                venue.status === 'approved'
                  ? 'Đã phê duyệt'
                  : venue.status === 'rejected'
                  ? 'Bị từ chối'
                  : 'Đang chờ duyệt';

              const coverUri =
                venue.images?.[0] ||
                venue.image ||
                'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600';

              return (
                <View key={venue._id} style={styles.venueCard}>
                  <Image source={{ uri: coverUri }} style={styles.venueImage} />
                  <View style={styles.venueBody}>
                    <View style={styles.venueHeaderRow}>
                      <Text style={styles.venueName} numberOfLines={1}>
                        {venue.name}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {statusText}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.venueMetaRow}>
                      <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.venueAddress} numberOfLines={1}>
                        {venue.address}
                      </Text>
                    </View>

                    <View style={styles.venueMetaRow}>
                      <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.venueHours}>
                        {venue.openHours || '07:00 - 22:30'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )
        ) : (
          /* Vouchers List */
          vouchers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="ticket-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có voucher nào</Text>
              <Text style={styles.emptySubtitle}>
                Vui lòng tạo voucher trên Web Đối Tác để thu hút sinh viên đến quán.
              </Text>
            </View>
          ) : (
            vouchers.map((voucher) => (
              <View key={voucher._id} style={styles.voucherItemCard}>
                <View style={styles.voucherItemHeader}>
                  <View style={styles.voucherItemTitleRow}>
                    <Ionicons name="gift" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.voucherItemTitle} numberOfLines={1}>
                      {voucher.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleToggleVoucher(voucher._id)}
                    style={[
                      styles.toggleBtn,
                      voucher.isActive ? styles.toggleBtnActive : styles.toggleBtnInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: voucher.isActive ? '#10B981' : COLORS.textMuted },
                      ]}
                    >
                      {voucher.isActive ? 'Đang bật' : 'Tạm dừng'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.voucherCodePill}>
                  <Text style={styles.voucherCodeLabel}>MÃ VOUCHER:</Text>
                  <Text style={styles.voucherCodeValue}>{voucher.code}</Text>
                </View>

                <View style={styles.voucherDetailsRow}>
                  <Text style={styles.voucherDetailItem}>
                    🎟️ Còn lại: {voucher.remainingCount ?? voucher.totalQuantity ?? '---'} lượt
                  </Text>
                  <Text style={styles.voucherDetailItem}>
                    📅 HSD: {voucher.validUntil ? new Date(voucher.validUntil).toLocaleDateString('vi-VN') : 'Không hạn'}
                  </Text>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  partnerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.4,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  partnerEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  quickScanCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  quickScanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  quickScanIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickScanTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  quickScanSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.borderLight,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  switchTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  activeSwitchTab: {
    backgroundColor: COLORS.primary + '18',
  },
  switchTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeSwitchTabText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  venueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  venueImage: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.surfaceLight,
  },
  venueBody: {
    padding: 16,
  },
  venueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  venueName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  venueMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  venueAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  venueHours: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  voucherItemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  voucherItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  voucherItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  voucherItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#10B98118',
  },
  toggleBtnInactive: {
    backgroundColor: COLORS.surfaceLight,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  voucherCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  voucherCodeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  voucherCodeValue: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  voucherDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 10,
  },
  voucherDetailItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
