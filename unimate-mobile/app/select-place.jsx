import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/colors';

import { MOCK_VENUES } from '../src/data/mockVenues';
export { MOCK_VENUES };


const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'study', label: 'Học tập & Yên tĩnh' },
  { id: 'chill', label: 'Cafe Chill trò chuyện' },
  { id: 'boardgame', label: 'Boardgame vui nhộn' },
];

export default function SelectPlaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeFilter, setActiveFilter] = useState('all');

  const partnerName = params.partnerName || 'Lê Phương Thảo';

  const filteredVenues =
    activeFilter === 'all'
      ? MOCK_VENUES
      : MOCK_VENUES.filter((v) => v.category === activeFilter);

  const handleSelectVenue = (venue) => {
    // Navigate to Chat and pass place invite info
    router.push({
      pathname: '/(tabs)/chat',
      params: {
        venueName: venue.name,
        venueAddress: venue.address,
        voucherBadge: venue.voucherBadge,
        partnerName: partnerName,
      },
    });
  };

  const handleViewVenueDetail = (venue) => {
    router.push({
      pathname: '/place-detail',
      params: {
        id: venue.id,
        partnerName: partnerName,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Chọn địa điểm hẹn</Text>
          <Text style={styles.headerSubtitle}>với {partnerName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/chat')}
          style={styles.skipTextBtn}
        >
          <Text style={styles.skipText}>Bỏ qua</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setActiveFilter(f.id)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Venues List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>
          {filteredVenues.length} quán đối tác UNI-MATE có ưu đãi gần bạn
        </Text>

        {filteredVenues.map((item) => (
          <View key={item.id} style={styles.venueCard}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleViewVenueDetail(item)}
              style={styles.imageContainer}
            >
              <Image source={{ uri: item.image }} style={styles.venueImage} />
              <View style={styles.voucherPill}>
                <Ionicons name="pricetag" size={13} color={COLORS.white} />
                <Text style={styles.voucherPillText}>{item.voucherBadge}</Text>
              </View>
              <View style={styles.distancePill}>
                <Ionicons name="location" size={12} color={COLORS.white} />
                <Text style={styles.distancePillText}>{item.distance}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.cardContent}>
              <View style={styles.nameRow}>
                <Text style={styles.venueName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              </View>

              <Text style={styles.addressText} numberOfLines={1}>
                {item.address}
              </Text>

              <View style={styles.tagsRow}>
                {item.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{tag}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => handleViewVenueDetail(item)}
                >
                  <Text style={styles.detailBtnText}>Chi tiết</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => handleSelectVenue(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="paper-plane" size={15} color={COLORS.white} style={{ marginRight: 6 }} />
                  <Text style={styles.selectBtnText}>Chọn quán này & Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    padding: 6,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  skipTextBtn: {
    padding: 6,
  },
  skipText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  filtersWrapper: {
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  venueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
    width: '100%',
  },
  venueImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  voucherPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  voucherPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  distancePill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  distancePillText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  venueName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tagBadge: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  selectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  selectBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
