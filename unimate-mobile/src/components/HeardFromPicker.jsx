import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

// Khớp unimate-backend/src/config/acquisition.js — dùng so sánh hiệu quả kênh truyền thông
export const HEARD_FROM_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'friend', label: 'Bạn bè giới thiệu' },
  { value: 'campus', label: 'CLB / sự kiện trường' },
  { value: 'cafe', label: 'Quán cafe đối tác' },
  { value: 'team_direct', label: 'Nhóm UNI-MATE gặp trực tiếp' },
  { value: 'other', label: 'Khác' },
];

/** "Bạn biết UNI-MATE qua đâu?" — không bắt buộc, bấm lại lựa chọn đang chọn để bỏ chọn */
export function HeardFromPicker({ value, onChange }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Bạn biết UNI-MATE qua đâu? (không bắt buộc)</Text>
      <View style={styles.chips}>
        {HEARD_FROM_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => onChange(selected ? '' : opt.value)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
});
