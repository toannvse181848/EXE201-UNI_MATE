import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/colors';
import { Button } from '../../src/components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: 'school-outline',
    title: 'Kết nối sinh viên',
    subtitle: 'Tìm bạn học, bạn cùng dự án và mở rộng mạng lưới quan hệ trong trường đại học của bạn.',
    color: COLORS.primary,
  },
  {
    id: '2',
    icon: 'people-outline',
    title: 'Khám phá cơ hội',
    subtitle: 'Tiếp cận hàng nghìn cơ hội từ các đối tác doanh nghiệp — học bổng, thực tập, và hơn thế nữa.',
    color: COLORS.secondary,
  },
  {
    id: '3',
    icon: 'rocket-outline',
    title: 'Bứt phá tương lai',
    subtitle: 'UNI-MATE đồng hành cùng bạn từ giảng đường đến sự nghiệp. Sẵn sàng bắt đầu chưa?',
    color: '#FF6B6B',
  },
];

const SlideItem = ({ item }) => (
  <View style={styles.slide}>
    <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
      <Ionicons name={item.icon} size={72} color={item.color} />
    </View>
    <Text style={styles.title}>{item.title}</Text>
    <Text style={styles.subtitle}>{item.subtitle}</Text>
  </View>
);

export default function Onboarding() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => router.replace('/(auth)/login');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip button */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Bỏ qua</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={({ item }) => <SlideItem item={item} />}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <SafeAreaView style={styles.bottomContainer} edges={['bottom']}>
        <Button
          title={currentIndex === slides.length - 1 ? 'Bắt đầu ngay' : 'Tiếp theo'}
          onPress={handleNext}
        />
        {currentIndex === slides.length - 1 && (
          <Button
            title="Đã có tài khoản? Đăng nhập"
            onPress={() => router.replace('/(auth)/login')}
            variant="ghost"
            style={{ marginTop: 12 }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  skipBtn: { padding: 8 },
  skipText: { color: COLORS.textSecondary, fontSize: 14 },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
});
