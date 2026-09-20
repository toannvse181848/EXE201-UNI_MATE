import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { Avatar } from '../../src/components/Avatar';
import { MOCK_VENUES } from '../select-place';

const QUICK_ACTIONS = [
  {
    icon: 'flame',
    label: 'Ghép đôi',
    sub: 'Tìm bạn học & cafe',
    color: '#FF5722',
    route: '/(tabs)/discover',
  },
  {
    icon: 'storefront',
    label: 'Quán cafe',
    sub: 'Không gian yên tĩnh',
    color: '#FF9800',
    route: '/(tabs)/explore',
  },
  {
    icon: 'ticket',
    label: 'Voucher hot',
    sub: 'Giảm tới 20%',
    color: '#10B981',
    route: '/(tabs)/explore',
  },
  {
    icon: 'pricetags',
    label: 'Sở thích',
    sub: 'Cập nhật tag cá nhân',
    color: '#6366F1',
    route: '/(auth)/interests',
  },
];

const SUGGESTED_MATES = [
  {
    id: 'm1',
    name: 'Phương Thảo',
    school: 'ĐH Bách Khoa',
    score: '98%',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
  },
  {
    id: 'm2',
    name: 'Hoàng Nam',
    school: 'ĐH Kinh Tế',
    score: '94%',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300',
  },
  {
    id: 'm3',
    name: 'Hà My',
    school: 'ĐH RMIT',
    score: '91%',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
  },
  {
    id: 'm4',
    name: 'Quốc Huy',
    school: 'ĐH FPT',
    score: '89%',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.fullName || 'Minh Anh';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.userSection}>
            <Avatar name={displayName} uri={user?.avatar} size={48} />
            <View style={styles.greetingBox}>
              <View style={styles.badgeRow}>
                <Text style={styles.goldBadge}>UNI-MATE GOLD 👑</Text>
              </View>
              <Text style={styles.greetingText}>Chào bạn, {displayName}!</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push('/voucher-detail')}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
        </View>

        {/* Hero Discovery Banner */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/discover')}
          style={styles.heroWrapper}
        >
          <LinearGradient
            colors={[COLORS.primary, '#FF7043']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroContent}>
              <View style={styles.liveTag}>
                <View style={styles.liveIndicator} />
                <Text style={styles.liveTagText}>1.240 bạn đang online</Text>
              </View>
              <Text style={styles.heroTitle}>Tìm bạn cùng học bài & đi cafe ngay hôm nay!</Text>
              <View style={styles.heroCta}>
                <Text style={styles.heroCtaText}>Bắt đầu ghép đôi</Text>
                <Ionicons name="arrow-forward" size={15} color={COLORS.primary} />
              </View>
            </View>
            <View style={styles.heroIllustration}>
              <Ionicons name="flame" size={80} color="rgba(255,255,255,0.25)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Grid (4 Actions) */}
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={() => router.push(item.route)}
            >
              <View
                style={[
                  styles.quickIconBox,
                  { backgroundColor: item.color + '15' },
                ]}
              >
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
              <Text style={styles.quickSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Suggested Friends Carousel */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Gợi ý hợp gu hôm nay</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.friendsScroll}
        >
          {SUGGESTED_MATES.map((mate) => (
            <TouchableOpacity
              key={mate.id}
              style={styles.mateCard}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/discover')}
            >
              <Image source={{ uri: mate.avatar }} style={styles.mateAvatar} />
              <View style={styles.matchPill}>
                <Ionicons name="sparkles" size={10} color={COLORS.white} />
                <Text style={styles.matchPillText}>{mate.score}</Text>
              </View>
              <Text style={styles.mateName} numberOfLines={1}>
                {mate.name}
              </Text>
              <Text style={styles.mateSchool} numberOfLines={1}>
                {mate.school}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hot Partner Venues */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Địa điểm hot gần bạn</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAllText}>Tất cả ({MOCK_VENUES.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.venuesContainer}>
          {MOCK_VENUES.slice(0, 2).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.homeVenueCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/place-detail',
                  params: { id: item.id },
                })
              }
            >
              <Image source={{ uri: item.image }} style={styles.homeVenueImg} />
              <View style={styles.homeVenueInfo}>
                <View style={styles.homeVenueTop}>
                  <Text style={styles.homeVenueName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.homeVenueRating}>
                    <Ionicons name="star" size={12} color="#D97706" />
                    <Text style={styles.homeVenueRatingNum}>{item.rating}</Text>
                  </View>
                </View>
                <Text style={styles.homeVenueAddr} numberOfLines={1}>
                  {item.address}
                </Text>
                <View style={styles.homeVoucherTag}>
                  <Ionicons name="pricetag" size={11} color={COLORS.primary} />
                  <Text style={styles.homeVoucherTagText}>{item.voucherBadge}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingBox: {
    marginLeft: 12,
  },
  badgeRow: {
    marginBottom: 2,
  },
  goldBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  greetingText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: 10,
    right: 10,
  },
  heroWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  heroBanner: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  heroContent: {
    flex: 1,
    zIndex: 2,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveTagText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.white,
    lineHeight: 24,
    marginBottom: 12,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  heroCtaText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  heroIllustration: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    zIndex: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  quickCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  quickSub: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  friendsScroll: {
    gap: 12,
    paddingBottom: 20,
  },
  mateCard: {
    width: 108,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  mateAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  matchPill: {
    position: 'absolute',
    top: 54,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  matchPillText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  mateName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 6,
    textAlign: 'center',
  },
  mateSchool: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  venuesContainer: {
    gap: 12,
  },
  homeVenueCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  homeVenueImg: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  homeVenueInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  homeVenueTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeVenueName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  homeVenueRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  homeVenueRatingNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  homeVenueAddr: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    marginBottom: 6,
  },
  homeVoucherTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  homeVoucherTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
