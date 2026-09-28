import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../src/constants/colors';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { MAJORS, UNIVERSITIES } from '../../src/constants/academic';

const PURPOSES = [
  { id: 'study', label: 'Tìm bạn học bài', icon: 'book-outline', emoji: '📚' },
  { id: 'project', label: 'Tìm teammate đồ án', icon: 'code-slash-outline', emoji: '💻' },
  { id: 'cafe', label: 'Đi cafe chill', icon: 'cafe-outline', emoji: '☕' },
  { id: 'hangout', label: 'Hangout cuối tuần', icon: 'people-outline', emoji: '👥' },
  { id: 'workshop', label: 'Tham gia workshop', icon: 'bulb-outline', emoji: '🎯' },
  { id: 'sports', label: 'Thể thao & chạy bộ', icon: 'fitness-outline', emoji: '🏃' },
];

export default function CreateProfileScreen() {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [university, setUniversity] = useState(UNIVERSITIES[0]);
  const [major, setMajor] = useState(MAJORS[0]);
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const [district, setDistrict] = useState('Quận 10, TP.HCM');
  const [bio, setBio] = useState('');
  const [selectedPurposes, setSelectedPurposes] = useState(['study', 'cafe']);
  const [avatarUri, setAvatarUri] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500');

  const togglePurpose = (id) => {
    if (selectedPurposes.includes(id)) {
      if (selectedPurposes.length > 1) {
        setSelectedPurposes(selectedPurposes.filter((p) => p !== id));
      }
    } else {
      setSelectedPurposes([...selectedPurposes, id]);
    }
  };

  const handleNext = () => {
    if (!fullName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ và tên của bạn');
      return;
    }
    router.push({
      pathname: '/(auth)/interests',
      params: {
        objectives: JSON.stringify(selectedPurposes),
        bio: bio.trim(),
        university,
        major,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarActive} />
          <View style={styles.progressBarInactive} />
        </View>
        <Text style={styles.stepText}>1/2</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Tạo hồ sơ sinh viên</Text>
        <Text style={styles.subtitle}>
          Hoàn thiện thông tin để cộng đồng UNI-MATE kết nối bạn với những người bạn hợp gu nhất!
        </Text>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện để chọn ảnh.');
                    return;
                  }
                  const res = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                  });
                  if (!res.canceled && res.assets && res.assets.length > 0) {
                    setAvatarUri(res.assets[0].uri);
                  }
                } catch {
                  // Fallback
                }
              }}
            >
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={18} color={COLORS.white} />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarHint}>Chạm vào để chọn ảnh đại diện từ thiết bị</Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.form}>
          <Input
            label="Họ và tên *"
            placeholder="Ví dụ: Nguyễn Minh Anh"
            value={fullName}
            onChangeText={setFullName}
            icon="person-outline"
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Input
                label="Năm sinh"
                placeholder="2003"
                value={birthYear}
                onChangeText={setBirthYear}
                keyboardType="numeric"
                icon="calendar-outline"
              />
            </View>
            <View style={{ flex: 1.5, marginLeft: 8 }}>
              <Input
                label="Khu vực / Quận"
                placeholder="Quận 10, TP.HCM"
                value={district}
                onChangeText={setDistrict}
                icon="location-outline"
              />
            </View>
          </View>

          <Input
            label="Trường Đại học"
            placeholder="Chọn hoặc nhập tên trường"
            value={university}
            onChangeText={setUniversity}
            icon="school-outline"
          />

          {/* Major Picker */}
          <Text style={styles.pickerLabel}>Chuyên ngành học</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowMajorPicker(!showMajorPicker)}
          >
            <Ionicons name="book-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
            <Text style={styles.pickerBtnText}>{major}</Text>
            <Ionicons name={showMajorPicker ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          {showMajorPicker && (
            <View style={styles.pickerList}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {MAJORS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pickerItem, major === m && styles.pickerItemActive]}
                    onPress={() => { setMajor(m); setShowMajorPicker(false); }}
                  >
                    <Text style={[styles.pickerItemText, major === m && styles.pickerItemTextActive]}>
                      {m}
                    </Text>
                    {major === m && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Input
            label="Giới thiệu bản thân (Bio)"
            placeholder="Viết đôi dòng về phong cách, sở thích học tập của bạn..."
            value={bio}
            onChangeText={setBio}
            icon="create-outline"
          />

          {/* Connection Goals / Purposes */}
          <Text style={styles.sectionLabel}>Mục đích kết nối chính</Text>
          <Text style={styles.sectionHint}>Chọn ít nhất 1 mục đích bạn quan tâm nhất</Text>

          <View style={styles.purposeGrid}>
            {PURPOSES.map((item) => {
              const isSelected = selectedPurposes.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => togglePurpose(item.id)}
                  style={[
                    styles.purposeChip,
                    isSelected && styles.purposeChipSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.purposeEmoji}>{item.emoji}</Text>
                  <Text
                    style={[
                      styles.purposeText,
                      isSelected && styles.purposeTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={COLORS.primary}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.btnWrapper}>
            <Button title="Tiếp tục (Chọn sở thích)" onPress={handleNext} />
          </View>
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
  },
  progressBarActive: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressBarInactive: {
    flex: 1,
    backgroundColor: COLORS.borderLight,
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.primary,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.surface,
  },
  avatarHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  purposeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  purposeChipSelected: {
    backgroundColor: COLORS.primary + '12',
    borderColor: COLORS.primary,
  },
  purposeEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  purposeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  purposeTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  btnWrapper: {
    marginTop: 10,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 4,
  },
  pickerBtnText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  pickerList: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  pickerItemActive: {
    backgroundColor: COLORS.primary + '10',
  },
  pickerItemText: {
    fontSize: 14,
    color: COLORS.text,
  },
  pickerItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
