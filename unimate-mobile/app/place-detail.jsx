import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/colors';
import { MOCK_VENUES } from '../src/data/mockVenues';


const { width } = Dimensions.get('window');

export default function PlaceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isSaved, setIsSaved] = useState(false);

  const venueId = params.id || 'v1';
  const partnerName = params.partnerName;
  const venue = MOCK_VENUES.find((v) => v.id === venueId) || MOCK_VENUES[0];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Hẹn gặp nhau tại ${venue.name} - ${venue.address} với ưu đãi ${venue.voucherBadge} trên UNI-MATE!`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleClaimVoucher = () => {
    router.push({
      pathname: '/voucher-detail',
      params: {
        venueName: venue.name,
        voucherTitle: venue.voucherBadge,
        voucherCode: venue.voucherCode,
      },
    });
  };

  const handleSelectAsMeetup = () => {
    router.push({
      pathname: '/(tabs)/chat',
      params: {
        venueName: venue.name,
        venueAddress: venue.address,
        voucherBadge: venue.voucherBadge,
        partnerName: partnerName || 'Bạn bè UNI-MATE',
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Cover Image */}
        <View style={styles.imageBox}>
          <Image source={{ uri: venue.image }} style={styles.coverImage} />

          {/* Top floating actions */}
          <SafeAreaView style={styles.topFloatBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.roundBtn}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>

            <View style={styles.rightFloatBtns}>
              <TouchableOpacity onPress={handleShare} style={styles.roundBtn}>
                <Ionicons name="share-social-outline" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsSaved(!isSaved)}
                style={[styles.roundBtn, { marginLeft: 10 }]}
              >
                <Ionicons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isSaved ? COLORS.primary : COLORS.text}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Content Box */}
        <View style={styles.infoContent}>
          {/* Header row */}
          <View style={styles.titleRow}>
            <Text style={styles.venueTitle}>{venue.name}</Text>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingNumber}>{venue.rating}</Text>
              <Text style={styles.ratingCount}>({venue.reviewsCount})</Text>
            </View>
          </View>

          {/* Address & Meta */}
          <View style={styles.metaRow}>
            <Ionicons name="location" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.metaText}>{venue.address}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color="#10B981" style={{ marginRight: 8 }} />
            <Text style={styles.metaText}>Mở cửa • {venue.openHours}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="cash-outline" size={16} color="#6366F1" style={{ marginRight: 8 }} />
            <Text style={styles.metaText}>Khoảng giá • {venue.priceRange}</Text>
          </View>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            <View style={styles.primaryTag}>
              <Text style={styles.primaryTagText}>ĐỐI TÁC CHÍNH THỨC</Text>
            </View>
            {venue.tags.map((tag, idx) => (
              <View key={idx} style={styles.regularTag}>
                <Text style={styles.regularTagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionHeading}>Giới thiệu không gian</Text>
          <Text style={styles.descText}>{venue.description}</Text>

          <View style={styles.divider} />

          {/* Voucher Promo Card */}
          <Text style={styles.sectionHeading}>Ưu đãi độc quyền UNI-MATE</Text>
          <View style={styles.voucherCard}>
            <View style={styles.voucherLeft}>
              <View style={styles.voucherIconBox}>
                <Ionicons name="gift" size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.voucherTitle}>{venue.voucherBadge}</Text>
                <Text style={styles.voucherSub}>Áp dụng cho mọi hóa đơn đồ uống</Text>
                <Text style={styles.voucherExpiry}>Hạn dùng: Còn 5 ngày</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.claimBtn} onPress={handleClaimVoucher}>
              <Text style={styles.claimBtnText}>Mã QR</Text>
            </TouchableOpacity>
          </View>

          {/* Amenities Grid */}
          <View style={styles.divider} />
          <Text style={styles.sectionHeading}>Tiện ích sinh viên</Text>
          <View style={styles.amenitiesGrid}>
            <View style={styles.amenityItem}>
              <Ionicons name="wifi" size={20} color={COLORS.primary} />
              <Text style={styles.amenityText}>Wifi 150 Mbps</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="battery-charging" size={20} color={COLORS.primary} />
              <Text style={styles.amenityText}>Mỗi bàn 2 ổ cắm</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="snow" size={20} color={COLORS.primary} />
              <Text style={styles.amenityText}>Điều hòa mát</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="volume-mute" size={20} color={COLORS.primary} />
              <Text style={styles.amenityText}>Khu vực yên tĩnh</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Ưu đãi</Text>
          <Text style={styles.priceValue}>{venue.voucherBadge}</Text>
        </View>
        <TouchableOpacity
          style={styles.mainCtaBtn}
          onPress={handleSelectAsMeetup}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={18} color={COLORS.white} style={{ marginRight: 6 }} />
          <Text style={styles.mainCtaText}>Chọn làm điểm hẹn</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageBox: {
    position: 'relative',
    height: 280,
    width: width,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  topFloatBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  rightFloatBtns: {
    flexDirection: 'row',
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  venueTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginRight: 12,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  ratingNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
  },
  ratingCount: {
    fontSize: 11,
    color: '#B45309',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  primaryTag: {
    backgroundColor: COLORS.primary + '18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryTagText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  regularTag: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  regularTagText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 18,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
  },
  descText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '30',
    padding: 14,
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  voucherIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voucherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  voucherSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  voucherExpiry: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 3,
  },
  claimBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  claimBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    width: (width - 64) / 2,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  mainCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  mainCtaText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
