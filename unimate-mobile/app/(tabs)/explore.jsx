import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants/colors';
import { MOCK_VENUES, TAG_FILTERS } from '../../src/data/mockVenues';
import { MOCK_MY_VOUCHERS } from '../../src/data/mockVouchers';
import { venueApi } from '../../src/api/venueApi';

export default function ExploreScreen() {
  const router = useRouter();
  const [venuesList, setVenuesList] = useState(MOCK_VENUES);
  const [activeTab, setActiveTab] = useState('venues'); // 'venues' | 'vouchers'
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const res = await venueApi.getVenues();
        if (res.data?.data && res.data.data.length > 0) {
          setVenuesList(res.data.data);
        }
      } catch {
        // Fallback to MOCK_VENUES
      }
    };
    fetchVenues();
  }, []);

  const filteredVenues = venuesList.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.address.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });


  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Địa điểm & Ưu đãi</Text>
          <Text style={styles.headerSubtitle}>Khám phá quán đối tác & nhận voucher</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => router.push('/voucher-detail')}
        >
          <Ionicons name="qr-code-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Segmented Switch: Venues vs Vouchers */}
      <View style={styles.switchWrapper}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'venues' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab('venues')}
          >
            <Ionicons
              name="storefront"
              size={15}
              color={activeTab === 'venues' ? COLORS.white : COLORS.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'venues' && styles.segmentTextActive,
              ]}
            >
              Quán đối tác ({filteredVenues.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'vouchers' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab('vouchers')}
          >
            <Ionicons
              name="ticket"
              size={15}
              color={activeTab === 'vouchers' ? COLORS.white : COLORS.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'vouchers' && styles.segmentTextActive,
              ]}
            >
              Voucher của tôi ({MOCK_MY_VOUCHERS.filter((v) => !v.used).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      {activeTab === 'venues' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Box */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm quán cafe, khu học bài, trà sữa..."
              placeholderTextColor={COLORS.textMuted}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Filter Tags */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagScroll}
          >
            {TAG_FILTERS.map((t) => {
              const isSelected = selectedTag === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tagPill, isSelected && styles.tagPillActive]}
                  onPress={() => setSelectedTag(t.id)}
                >
                  <Text
                    style={[
                      styles.tagPillText,
                      isSelected && styles.tagPillTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Venues Grid / List */}
          {filteredVenues.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.venueCard}
              activeOpacity={0.9}
              onPress={() =>
                router.push({
                  pathname: '/place-detail',
                  params: { id: item.id },
                })
              }
            >
              <View style={styles.cardImageContainer}>
                <Image source={{ uri: item.image }} style={styles.cardImage} />
                <View style={styles.badgeTopLeft}>
                  <Text style={styles.badgeText}>{item.voucherBadge}</Text>
                </View>
                <View style={styles.badgeBottomRight}>
                  <Text style={styles.distText}>{item.distance}</Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.titleLine}>
                  <Text style={styles.nameLine} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.starBox}>
                    <Ionicons name="star" size={12} color="#D97706" />
                    <Text style={styles.starText}>{item.rating}</Text>
                  </View>
                </View>

                <Text style={styles.addressLine} numberOfLines={1}>
                  {item.address}
                </Text>

                <View style={styles.amenityRow}>
                  {item.tags.map((tg, i) => (
                    <View key={i} style={styles.microChip}>
                      <Text style={styles.microChipText}>{tg}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.bottomCardRow}>
                  <Text style={styles.priceMeta}>{item.priceRange}</Text>
                  <View style={styles.viewDetailLink}>
                    <Text style={styles.viewDetailText}>Xem quán</Text>
                    <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        /* Vouchers Tab */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.voucherTabHint}>
            Đưa mã QR voucher cho nhân viên thu ngân tại quán để được giảm giá trực tiếp!
          </Text>

          {MOCK_MY_VOUCHERS.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.myVoucherCard, v.used && styles.myVoucherUsed]}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/voucher-detail',
                  params: {
                    venueName: v.venueName,
                    voucherTitle: v.title,
                    voucherCode: v.code,
                  },
                })
              }
            >
              <Image source={{ uri: v.image }} style={styles.voucherThumb} />
              <View style={styles.voucherInfoBox}>
                <Text style={styles.voucherVenueTitle} numberOfLines={1}>
                  {v.venueName}
                </Text>
                <Text style={styles.voucherOfferTitle}>{v.title}</Text>
                <View style={styles.voucherMetaRow}>
                  <Text style={styles.voucherCodeBadge}>{v.code}</Text>
                  <Text
                    style={[
                      styles.expiryBadge,
                      v.used ? styles.expiryUsed : styles.expiryActive,
                    ]}
                  >
                    {v.used ? 'Đã sử dụng' : `Còn ${v.expiresIn}`}
                  </Text>
                </View>
              </View>
              <View style={styles.qrActionCircle}>
                <Ionicons
                  name="qr-code"
                  size={20}
                  color={v.used ? COLORS.textMuted : COLORS.primary}
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 14,
  },
  tagScroll: {
    gap: 8,
    marginBottom: 16,
  },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagPillActive: {
    backgroundColor: COLORS.primary + '18',
    borderColor: COLORS.primary,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tagPillTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  venueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageContainer: {
    position: 'relative',
    height: 150,
    width: '100%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeTopLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  badgeBottomRight: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    padding: 14,
  },
  titleLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameLine: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginRight: 8,
  },
  starBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  starText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  addressLine: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  amenityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  microChip: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  microChipText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  bottomCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 8,
  },
  priceMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  viewDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  voucherTabHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  myVoucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  myVoucherUsed: {
    opacity: 0.6,
  },
  voucherThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  voucherInfoBox: {
    flex: 1,
  },
  voucherVenueTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  voucherOfferTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginVertical: 2,
  },
  voucherMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  voucherCodeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expiryBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  expiryActive: {
    color: COLORS.primary,
  },
  expiryUsed: {
    color: COLORS.textMuted,
  },
  qrActionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 8,
  },
});
