import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../src/constants/colors';
import { Button } from '../src/components/Button';
import { useAuth } from '../src/context/AuthContext';

const { width } = Dimensions.get('window');

export default function MatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const matchedName = params.matchedName || 'Lê Phương Thảo';
  const matchedPhoto = params.matchedPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800';
  const userPhoto = user?.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800';

  const handleSelectPlace = () => {
    router.push({
      pathname: '/select-place',
      params: {
        partnerName: matchedName,
        partnerPhoto: matchedPhoto,
      },
    });
  };

  const handleDismiss = () => {
    router.replace('/(tabs)/discover');
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#1E1B4B', '#0F172A', '#000000']}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Confetti / Stars celebration badge */}
        <View style={styles.celebrationBadge}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.matchSubhead}>BẠN VÀ NGƯỜI ẤY ĐÃ MATCH!</Text>
        </View>

        <Text style={styles.matchTitle}>It's a Match!</Text>
        <Text style={styles.matchDesc}>
          Bạn và <Text style={styles.highlightName}>{matchedName}</Text> đều muốn cùng học bài và đi cafe!
        </Text>

        {/* Dual Overlapping Avatars */}
        <View style={styles.avatarsWrapper}>
          <View style={[styles.avatarBox, styles.avatarLeft]}>
            <Image source={{ uri: userPhoto }} style={styles.avatarImg} />
          </View>
          <View style={[styles.avatarBox, styles.avatarRight]}>
            <Image source={{ uri: matchedPhoto }} style={styles.avatarImg} />
          </View>
          {/* Center Heart Icon */}
          <View style={styles.heartCenter}>
            <LinearGradient
              colors={[COLORS.primary, '#FF1744']}
              style={styles.heartGradient}
            >
              <Ionicons name="heart" size={26} color={COLORS.white} />
            </LinearGradient>
          </View>
        </View>

        {/* Feature info callout */}
        <View style={styles.calloutCard}>
          <Ionicons name="cafe" size={24} color={COLORS.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.calloutTitle}>Ưu đãi độc quyền UNI-MATE</Text>
            <Text style={styles.calloutDesc}>
              Chọn ngay quán cafe đối tác để nhận Voucher giảm 20% và mở phòng chat riêng tư!
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.bottomActions}>
          <Button
            title="📍 Chọn địa điểm để mở chat"
            onPress={handleSelectPlace}
            style={styles.selectBtn}
          />
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.skipBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Để sau, tiếp tục tìm kiếm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  celebrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 87, 34, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.4)',
    marginTop: 20,
  },
  celebrationEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  matchSubhead: {
    color: '#FF8A50',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  matchTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  matchDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
    paddingHorizontal: 20,
  },
  highlightName: {
    fontWeight: '800',
    color: '#FF8A50',
  },
  avatarsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 180,
    width: width - 60,
    marginVertical: 10,
  },
  avatarBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: COLORS.white,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  avatarLeft: {
    position: 'absolute',
    left: width * 0.12,
    transform: [{ rotate: '-8deg' }],
  },
  avatarRight: {
    position: 'absolute',
    right: width * 0.12,
    transform: [{ rotate: '8deg' }],
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  heartCenter: {
    position: 'absolute',
    zIndex: 10,
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },
  heartGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  calloutDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  bottomActions: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  selectBtn: {
    width: '100%',
  },
  skipBtn: {
    paddingVertical: 10,
  },
  skipText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '600',
  },
});
