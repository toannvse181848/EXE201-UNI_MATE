import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/colors';
import { Button } from '../../src/components/Button';

const CATEGORIES = [
  {
    title: 'Học tập & Kỹ năng',
    tags: [
      { id: 'coding', name: '#lap_trinh' },
      { id: 'english', name: '#hoc_tieng_anh' },
      { id: 'ielts', name: '#ielts_7_0' },
      { id: 'ai', name: '#ai_machine_learning' },
      { id: 'uiux', name: '#thiet_ke_uiux' },
      { id: 'finance', name: '#kinh_te_tai_chinh' },
      { id: 'marketing', name: '#marketing_digital' },
    ],
  },
  {
    title: 'Đời sống & Thư giãn',
    tags: [
      { id: 'cafe', name: '#cafe_chill' },
      { id: 'boardgame', name: '#boardgame' },
      { id: 'reading', name: '#doc_sach' },
      { id: 'indie', name: '#nhac_indie' },
      { id: 'film_photo', name: '#chup_anh_film' },
      { id: 'travel', name: '#du_lich_bui' },
      { id: 'foodie', name: '#an_uong_quan_ngon' },
    ],
  },
  {
    title: 'Thể thao & Hoạt động',
    tags: [
      { id: 'running', name: '#chay_bo' },
      { id: 'gym', name: '#gym_fitness' },
      { id: 'badminton', name: '#cau_long' },
      { id: 'billiards', name: '#billiards' },
      { id: 'yoga', name: '#yoga_chill' },
    ],
  },
];

export default function InterestsScreen() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState(['coding', 'cafe', 'reading']);
  const [locationGranted, setLocationGranted] = useState(true);

  const toggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleFinish = () => {
    if (selectedTags.length < 3) {
      Alert.alert('Gợi ý', 'Vui lòng chọn tối thiểu 3 sở thích để thuật toán ghép đôi hiệu quả nhất nhé!');
      return;
    }
    // TODO: Update user interests via backend API
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with 2/2 progress */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarActive} />
          <View style={styles.progressBarActive} />
        </View>
        <Text style={styles.stepText}>2/2</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Sở thích & Tagging</Text>
          <View style={[styles.countBadge, selectedTags.length >= 3 && styles.countBadgeSuccess]}>
            <Text style={[styles.countText, selectedTags.length >= 3 && styles.countTextSuccess]}>
              {selectedTags.length}/3+
            </Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Chọn ít nhất 3 tags để UNI-MATE gợi ý bạn bè và quán cafe phù hợp nhất với bạn.
        </Text>

        {/* Categories & Chips */}
        {CATEGORIES.map((cat, idx) => (
          <View key={idx} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{cat.title}</Text>
            <View style={styles.tagGrid}>
              {cat.tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        isSelected && styles.tagTextSelected,
                      ]}
                    >
                      {tag.name}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={COLORS.white}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Location Permission Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconBox}>
            <Ionicons
              name="location"
              size={24}
              color={locationGranted ? COLORS.primary : COLORS.textMuted}
            />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>Vị trí & Bán kính ghép đôi</Text>
            <Text style={styles.locationDesc}>
              {locationGranted
                ? 'Đã bật: Tìm bạn và quán cafe trong bán kính 5km'
                : 'Bật định vị để ghép đôi với sinh viên ở trường/khu vực gần bạn'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.locationToggle, locationGranted && styles.locationToggleActive]}
            onPress={() => setLocationGranted(!locationGranted)}
          >
            <Ionicons
              name={locationGranted ? 'checkmark' : 'arrow-forward'}
              size={18}
              color={locationGranted ? COLORS.white : COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.btnWrapper}>
          <Button
            title={`Hoàn tất hồ sơ (${selectedTags.length} đã chọn)`}
            onPress={handleFinish}
          />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    padding: 6,
    marginRight: 12,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 12,
    gap: 4,
  },
  progressBarActive: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: COLORS.border,
  },
  countBadgeSuccess: {
    backgroundColor: COLORS.primary + '18',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  countTextSuccess: {
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  categorySection: {
    marginBottom: 22,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tagChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tagTextSelected: {
    color: COLORS.white,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  locationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  locationDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  locationToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  locationToggleActive: {
    backgroundColor: COLORS.primary,
  },
  btnWrapper: {
    marginTop: 10,
  },
});
