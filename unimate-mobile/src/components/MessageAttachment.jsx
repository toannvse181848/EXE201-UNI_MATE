import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { API_BASE_URL } from '../constants/config';

// Link tải file qua backend để giữ đúng tên gốc
const getDownloadUrl = (fileUrl, fileName) =>
  `${API_BASE_URL}/api/chat/download?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName || 'tai-lieu')}`;

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const openUrl = async (url) => {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Lỗi', 'Không thể mở tệp này');
  }
};

/** Tin nhắn là thẻ gợi ý quán (khi đó không cần hiện dòng chữ dự phòng) */
export const isVenueMessage = (item) => item?.type === 'venue' && Boolean(item.venue);

/**
 * Hiển thị video, tài liệu và thẻ gợi ý quán trong bong bóng chat.
 * Ảnh do từng màn hình chat tự vẽ (có xem ảnh phóng to).
 */
export function MessageAttachment({ item, isMe }) {
  const router = useRouter();

  if (isVenueMessage(item)) {
    const { venue } = item;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.venueCard}
        onPress={() => router.push({ pathname: '/place-detail', params: { id: String(venue.venueId) } })}
      >
        {Boolean(venue.image) && <Image source={{ uri: venue.image }} style={styles.venueImage} resizeMode="cover" />}
        <View style={styles.venueBody}>
          <Text style={styles.venueLabel}>📍 Gợi ý quán</Text>
          <Text style={styles.venueName}>{venue.name}</Text>
          <Text style={styles.venueAddress}>{venue.address}</Text>
          <View style={styles.venueButton}>
            <Text style={styles.venueButtonText}>Xem quán</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (!item?.fileUrl || (item.type !== 'video' && item.type !== 'file')) return null;

  const isVideo = item.type === 'video';
  const url = isVideo ? item.fileUrl : getDownloadUrl(item.fileUrl, item.fileName);
  const subtitle = [isVideo ? 'Video' : 'Tài liệu', formatFileSize(item.fileSize)].filter(Boolean).join(' • ');

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.fileChip, isMe ? styles.fileChipMe : styles.fileChipOther]}
      onPress={() => openUrl(url)}
    >
      <View style={[styles.fileIcon, isMe ? styles.fileIconMe : styles.fileIconOther]}>
        <Ionicons
          name={isVideo ? 'play' : 'document-text'}
          size={18}
          color={isMe ? COLORS.primary : COLORS.white}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[styles.fileName, isMe && styles.textMe]}>
          {item.fileName || (isVideo ? 'Video' : 'Tài liệu')}
        </Text>
        <Text style={[styles.fileMeta, isMe && styles.textMe]}>{subtitle}</Text>
      </View>
      <Ionicons name={isVideo ? 'open-outline' : 'download-outline'} size={16} color={isMe ? COLORS.white : COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  venueCard: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  venueImage: {
    width: '100%',
    height: 110,
  },
  venueBody: {
    padding: 10,
  },
  venueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  venueAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  venueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
  },
  venueButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    width: 220,
  },
  fileChipMe: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  fileChipOther: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  fileIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconMe: {
    backgroundColor: COLORS.white,
  },
  fileIconOther: {
    backgroundColor: COLORS.primary,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  fileMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  textMe: {
    color: COLORS.white,
  },
});
