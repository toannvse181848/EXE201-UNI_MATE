import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../src/constants/colors';
import { Avatar } from '../../src/components/Avatar';

const MOCK_ACTIVE_MATCHES = [
  {
    id: 'm1',
    name: 'Phương Thảo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
    isNew: true,
  },
  {
    id: 'm2',
    name: 'Hoàng Nam',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300',
    isNew: true,
  },
  {
    id: 'm3',
    name: 'Hà My',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
    isNew: false,
  },
  {
    id: 'm4',
    name: 'Quốc Huy',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    isNew: false,
  },
];

const INITIAL_CHATS = [
  {
    id: 'c1',
    name: 'Lê Phương Thảo',
    lastMsg: 'Mình đồng ý hẹn ở The Coffee House Sư Vạn Hạnh nhé! ☕',
    time: '10:30',
    unread: 2,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
    verified: true,
    place: 'The Coffee House',
  },
  {
    id: 'c2',
    name: 'Trần Hoàng Nam',
    lastMsg: 'Bạn có mang theo laptop không hay chỉ ôn lý thuyết?',
    time: '09:15',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300',
    verified: true,
    place: null,
  },
  {
    id: 'c3',
    name: 'Cộng Cà Phê Partner',
    lastMsg: 'Chúc mừng bạn nhận được voucher Mua 1 Tặng 1!',
    time: 'Hôm qua',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300',
    verified: true,
    place: null,
  },
];

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [chats, setChats] = useState(INITIAL_CHATS);

  const venueInvite = params.venueName
    ? {
        venueName: params.venueName,
        venueAddress: params.venueAddress,
        voucherBadge: params.voucherBadge,
        partnerName: params.partnerName || 'Phương Thảo',
      }
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tin nhắn</Text>
        <TouchableOpacity style={styles.newChatBtn}>
          <Ionicons name="create-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Venue Invitation Banner if coming from select-place */}
        {venueInvite && (
          <View style={styles.inviteCard}>
            <View style={styles.inviteTop}>
              <View style={styles.inviteTag}>
                <Ionicons name="cafe" size={14} color={COLORS.white} />
                <Text style={styles.inviteTagText}>ĐIỂM HẸN CAFE ĐÃ CHỌN</Text>
              </View>
              <Text style={styles.voucherTagMini}>{venueInvite.voucherBadge}</Text>
            </View>
            <Text style={styles.inviteTitle}>
              Cuộc hẹn với {venueInvite.partnerName} tại {venueInvite.venueName}
            </Text>
            <Text style={styles.inviteAddr} numberOfLines={1}>
              {venueInvite.venueAddress}
            </Text>
            <TouchableOpacity
              style={styles.openVoucherBtn}
              onPress={() =>
                router.push({
                  pathname: '/voucher-detail',
                  params: {
                    venueName: venueInvite.venueName,
                    voucherTitle: venueInvite.voucherBadge,
                  },
                })
              }
            >
              <Ionicons name="qr-code" size={15} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.openVoucherText}>Mở mã QR Voucher của quán</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Matched Friends Horizontal Bar */}
        <View style={styles.matchesSection}>
          <Text style={styles.matchesTitle}>Người bạn vừa ghép đôi</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.matchesScroll}
          >
            {MOCK_ACTIVE_MATCHES.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.matchAvatarBox}
                activeOpacity={0.8}
              >
                <View style={[styles.avatarRing, m.isNew && styles.avatarRingActive]}>
                  <Image source={{ uri: m.avatar }} style={styles.matchThumb} />
                </View>
                <Text style={styles.matchNameText} numberOfLines={1}>
                  {m.name}
                </Text>
                {m.isNew && <View style={styles.newBadgeDot} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Conversation List */}
        <Text style={styles.listSectionTitle}>Cuộc trò chuyện</Text>

        {chats.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.chatRow}
            activeOpacity={0.7}
          >
            <View style={styles.avatarWrap}>
              <Image source={{ uri: item.avatar }} style={styles.chatAvatar} />
              <View style={styles.onlineDot} />
            </View>

            <View style={styles.chatMain}>
              <View style={styles.chatTopLine}>
                <View style={styles.nameVerifiedRow}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  {item.verified && (
                    <Ionicons name="checkmark-circle" size={14} color="#0284C7" />
                  )}
                </View>
                <Text style={styles.chatTime}>{item.time}</Text>
              </View>

              <View style={styles.chatBottomLine}>
                <Text
                  style={[
                    styles.chatMsg,
                    item.unread > 0 && styles.chatMsgBold,
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMsg}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  inviteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  inviteTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inviteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  inviteTagText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  voucherTagMini: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inviteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  inviteAddr: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  openVoucherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  openVoucherText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  matchesSection: {
    marginBottom: 20,
  },
  matchesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  matchesScroll: {
    gap: 16,
  },
  matchAvatarBox: {
    alignItems: 'center',
    width: 68,
    position: 'relative',
  },
  avatarRing: {
    padding: 2.5,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  avatarRingActive: {
    borderColor: COLORS.primary,
  },
  matchThumb: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  matchNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  newBadgeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: 48,
    right: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  listSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  chatMain: {
    flex: 1,
  },
  chatTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  chatTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  chatBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMsg: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  chatMsgBold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
});
