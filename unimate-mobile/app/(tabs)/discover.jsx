import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../src/constants/colors';
import { matchApi } from '../../src/api/matchApi';

const { width, height } = Dimensions.get('window');

export default function DiscoverScreen() {
  const router = useRouter();
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);

  const [notice, setNotice] = useState(null);

  const currentProfile = deck[currentIndex];

  // Chuẩn hóa profile từ API sang format hiển thị
  const normalizeProfile = (user) => ({
    id: user._id,
    name: user.fullName,
    photo: user.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800`,
    university: user.studentProfile?.university || 'Đại học',
    major: user.studentProfile?.major || 'Sinh viên',
    year: user.studentProfile?.year,
    bio: user.studentProfile?.bio || 'Đang tìm bạn học cùng ☕',
    tags: (user.studentProfile?.interests || []).slice(0, 3).map((i) => `#${i}`),
    matchScore: Math.floor(Math.random() * 20) + 80, // tạm thời random
    distance: `${(Math.random() * 4 + 0.5).toFixed(1)} km`,
    purpose: user.studentProfile?.objectives?.[0] === 'study_buddy'
      ? '📚 Tìm bạn học'
      : user.studentProfile?.objectives?.[0] === 'project'
      ? '💻 Tìm teammate'
      : '🤝 Kết nối',
  });

  const fetchDeck = useCallback(async () => {
    try {
      setLoading(true);
      const res = await matchApi.getDiscoverDeck();
      const profiles = (res.data?.data || []).map(normalizeProfile);
      setDeck(profiles);
      setCurrentIndex(0);
    } catch {
      setDeck([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeck(); }, [fetchDeck]);

  const handleSwipe = async (action) => {
    if (!currentProfile || swiping) return;
    const swipedName = currentProfile.name;
    setSwiping(true);

    try {
      const res = await matchApi.swipe(currentProfile.id, action === 'pass' ? 'pass' : 'like');
      const { isMatch } = res.data || {};

      // Chỉ navigate match screen khi backend xác nhận mutual match
      if (isMatch) {
        router.push({
          pathname: '/match',
          params: {
            matchedName: currentProfile.name,
            matchedPhoto: currentProfile.photo,
            matchedUniversity: currentProfile.university,
            matchedMajor: currentProfile.major,
          },
        });
      } else if (action === 'like') {
        setNotice(`💖 Đã gửi lời thích đến ${swipedName}! Xem trong tab Tin nhắn (mục "Đã thả tim").`);
        setTimeout(() => setNotice(null), 3500);
      }
    } catch {
      // swipe lỗi → vẫn chuyển card
    } finally {
      setSwiping(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const resetDeck = () => fetchDeck();

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>UNI</Text>
          <Text style={styles.logoAccent}>MATE</Text>
          <View style={styles.pulseDot} />
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Ionicons name="storefront-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Notice Toast */}
      {notice && (
        <View style={styles.noticeToast}>
          <Ionicons name="heart" size={16} color="#FFFFFF" />
          <Text style={styles.noticeToastText}>{notice}</Text>
        </View>
      )}

      {/* Loading */}
      {loading ? (
        <View style={styles.deckContainer}>
          <View style={[styles.emptyContainer]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ color: COLORS.textMuted, marginTop: 16 }}>Đang tải hồ sơ...</Text>
          </View>
        </View>
      ) : (
        <View style={styles.deckContainer}>
          {currentProfile ? (
          <View style={styles.card}>
            <Image source={{ uri: currentProfile.photo }} style={styles.cardImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.92)']}
              style={styles.gradient}
            />

            {/* Top Badges inside card */}
            <View style={styles.cardTopRow}>
              <View style={styles.matchBadge}>
                <Ionicons name="sparkles" size={14} color={COLORS.white} />
                <Text style={styles.matchText}>{currentProfile.matchScore}% Hợp gu</Text>
              </View>
              <View style={styles.distanceBadge}>
                <Ionicons name="location-sharp" size={13} color={COLORS.white} />
                <Text style={styles.distanceText}>{currentProfile.distance}</Text>
              </View>
            </View>

            {/* Bottom Info inside card */}
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>
                  {currentProfile.name}, {currentProfile.age}
                </Text>
                <Ionicons name="checkmark-circle" size={20} color="#38BDF8" />
              </View>

              <Text style={styles.subInfoText}>
                {currentProfile.university} • {currentProfile.major}
              </Text>

              <View style={styles.purposeTag}>
                <Text style={styles.purposeTagText}>{currentProfile.purpose}</Text>
              </View>

              <Text style={styles.bioText} numberOfLines={2}>
                {currentProfile.bio}
              </Text>

              <View style={styles.tagRow}>
                {currentProfile.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="planet-outline" size={54} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Hết danh sách hồ sơ gần bạn</Text>
            <Text style={styles.emptyDesc}>
              Bạn đã xem hết các bạn sinh viên phù hợp trong bán kính 5km. Hãy thử làm mới lại danh sách nhé!
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={resetDeck}>
              <Ionicons name="reload" size={18} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.refreshBtnText}>Khám phá lại từ đầu</Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
      )}

      {/* Floating Action Controls */}
      {!loading && currentProfile && (
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.passBtn]}
            onPress={() => handleSwipe('pass')}
            activeOpacity={0.8}
            disabled={swiping}
          >
            <Ionicons name="close" size={28} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.superBtn]}
            onPress={() => handleSwipe('superlike')}
            activeOpacity={0.8}
            disabled={swiping}
          >
            <Ionicons name="star" size={26} color="#F59E0B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.likeBtn, swiping && { opacity: 0.6 }]}
            onPress={() => handleSwipe('like')}
            activeOpacity={0.8}
            disabled={swiping}
          >
            <Ionicons name="heart" size={32} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  logoAccent: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  card: {
    width: width - 32,
    height: height * 0.64,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardTopRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  matchText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  distanceText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    marginRight: 6,
  },
  subInfoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginBottom: 8,
  },
  purposeTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 87, 34, 0.3)',
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  purposeTagText: {
    color: '#FFE0B2',
    fontSize: 12,
    fontWeight: '700',
  },
  bioText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingVertical: 14,
  },
  actionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  passBtn: {
    width: 58,
    height: 58,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  superBtn: {
    width: 54,
    height: 54,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  likeBtn: {
    width: 68,
    height: 68,
    backgroundColor: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  noticeToast: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FF5722',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  noticeToastText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
});
