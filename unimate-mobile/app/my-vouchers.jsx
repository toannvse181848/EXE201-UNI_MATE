import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/colors';
import { voucherApi } from '../src/api/voucherApi';

export default function MyVouchersScreen() {
  const router = useRouter();

  const [wallet, setWallet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('active'); // 'all' | 'active' | 'used'
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const fetchWallet = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await voucherApi.getMyWallet();
      const list = res.data?.data || res.data || [];
      setWallet(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Lỗi tải ví voucher:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const now = new Date();

  // Phân loại voucher
  const activeVouchers = wallet.filter((item) => {
    const isSaved = item.status === 'saved';
    const isValid = !item.voucherId?.validUntil || new Date(item.voucherId.validUntil) >= now;
    return isSaved && isValid;
  });

  const inactiveVouchers = wallet.filter((item) => {
    const isUsed = item.status === 'used';
    const isExpired = item.status === 'expired' || (item.voucherId?.validUntil && new Date(item.voucherId.validUntil) < now);
    return isUsed || isExpired;
  });

  const displayedList =
    activeFilter === 'active'
      ? activeVouchers
      : activeFilter === 'used'
      ? inactiveVouchers
      : wallet;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Không thời hạn';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderVoucherItem = ({ item }) => {
    const v = item.voucherId || {};
    const venue = v.venueId || {};
    const isExpired = item.status === 'expired' || (v.validUntil && new Date(v.validUntil) < now);
    const isUsed = item.status === 'used';
    const isUsable = item.status === 'saved' && !isExpired;

    const discountLabel = v.discountPercent
      ? `GIẢM ${v.discountPercent}%`
      : v.discountAmount
      ? `GIẢM ${(v.discountAmount / 1000).toLocaleString('vi-VN')}K`
      : 'ƯU ĐÃI';

    return (
      <View style={[styles.card, !isUsable && styles.cardInactive]}>
        <View style={styles.cardHeader}>
          <View style={[styles.discountBadge, !isUsable && styles.discountBadgeInactive]}>
            <Ionicons name="pricetag" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.discountBadgeText}>{discountLabel}</Text>
          </View>

          <View style={[styles.statusTag, isUsable ? styles.statusTagActive : styles.statusTagInactive]}>
            <Text style={[styles.statusTagText, isUsable ? styles.statusTextActive : styles.statusTextInactive]}>
              {isUsed ? 'Đã sử dụng' : isExpired ? 'Đã hết hạn' : 'Sẵn sàng dùng'}
            </Text>
          </View>
        </View>

        <Text style={styles.voucherTitle} numberOfLines={2}>
          {v.title || 'Ưu đãi sinh viên'}
        </Text>

        <View style={styles.venueRow}>
          <Ionicons name="cafe" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={styles.venueName} numberOfLines={1}>
            {venue.name || 'Quán đối tác UNI-MATE'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.expiryLabel}>Hạn sử dụng</Text>
            <Text style={styles.expiryDate}>{formatDate(v.validUntil)}</Text>
          </View>

          {isUsable ? (
            <TouchableOpacity
              style={styles.openQrBtn}
              activeOpacity={0.85}
              onPress={() => setSelectedVoucher(item)}
            >
              <Ionicons name="qr-code" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.openQrBtnText}>Mã QR</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.disabledBtn}>
              <Text style={styles.disabledBtnText}>{isUsed ? 'Đã dùng' : 'Hết hạn'}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ví Voucher của tôi</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchWallet(true)} activeOpacity={0.7}>
          <Ionicons name="reload" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'active' && styles.filterTabActive]}
          onPress={() => setActiveFilter('active')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'active' && styles.filterTabTextActive]}>
            Khả dụng ({activeVouchers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
            Tất cả ({wallet.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'used' && styles.filterTabActive]}
          onPress={() => setActiveFilter('used')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'used' && styles.filterTabTextActive]}>
            Đã dùng ({inactiveVouchers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải ví voucher...</Text>
        </View>
      ) : displayedList.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="ticket-outline" size={54} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>
            {activeFilter === 'active'
              ? 'Chưa có voucher khả dụng'
              : 'Không có voucher nào'}
          </Text>
          <Text style={styles.emptySubtitle}>
            Hãy khám phá các ưu đãi giảm giá cafe từ đối tác UNI-MATE và lưu vào ví nhé!
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.exploreBtnText}>Khám phá voucher ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayedList}
          keyExtractor={(item) => (item._id || item.id).toString()}
          renderItem={renderVoucherItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchWallet(true)}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {/* MODAL MÃ QR VOUCHER */}
      <Modal
        visible={Boolean(selectedVoucher)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedVoucher(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedVoucher(null)}
            >
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.qrHeader}>
              <View style={styles.qrHeaderIcon}>
                <Ionicons name="ticket" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.qrTitle} numberOfLines={2}>
                {selectedVoucher?.voucherId?.title}
              </Text>
              <Text style={styles.qrVenueName}>
                📍 {selectedVoucher?.voucherId?.venueId?.name || 'Quán đối tác UNI-MATE'}
              </Text>
            </View>

            <View style={styles.qrImageBox}>
              {Boolean(selectedVoucher) && (
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      selectedVoucher.qrPayload ||
                        selectedVoucher.displayCode ||
                        selectedVoucher.voucherId?.code ||
                        'UNIMATE_VOUCHER'
                    )}`,
                  }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              )}
            </View>

            <Text style={styles.qrInstruction}>
              Đưa mã QR này cho thu ngân quán quét để áp dụng khuyến mãi
            </Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>MÃ VOUCHER ĐỌC CHO THU NGÂN</Text>
              <Text style={styles.codeValue}>
                {selectedVoucher?.displayCode || selectedVoucher?.voucherId?.code || '---'}
              </Text>
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
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  refreshBtn: {
    padding: 6,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterTabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInactive: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeInactive: {
    backgroundColor: '#94A3B8',
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagActive: {
    backgroundColor: '#ECFDF5',
  },
  statusTagInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextInactive: {
    color: '#64748B',
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  venueName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expiryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  expiryDate: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  openQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  openQrBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabledBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  disabledBtnText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  qrHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  qrVenueName: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  qrImageBox: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginBottom: 14,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrInstruction: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  codeBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#0F172A',
  },
});
