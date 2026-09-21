import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { COLORS } from '../../src/constants/colors';
import { Avatar } from '../../src/components/Avatar';
import { chatApi } from '../../src/api/chatApi';
import { matchApi } from '../../src/api/matchApi';
import { useAuth } from '../../src/context/AuthContext';

// Hiển thị thời gian tin nhắn
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) return 'Hôm qua';
  else if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' | 'sent' | 'received'
  const [conversations, setConversations] = useState([]);
  const [sentLikes, setSentLikes] = useState([]);
  const [receivedLikes, setReceivedLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const venueInvite = params.venueName
    ? {
        venueName: params.venueName,
        venueAddress: params.venueAddress,
        voucherBadge: params.voucherBadge,
        partnerName: params.partnerName || 'bạn',
      }
    : null;

  const loadAllData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      // Gọi đồng thời lấy hội thoại, lời thích đã gửi và lời thích nhận được
      const [convRes, sentRes, receivedRes] = await Promise.allSettled([
        chatApi.getConversations(),
        matchApi.getSentLikes(),
        matchApi.getReceivedLikes(),
      ]);

      if (convRes.status === 'fulfilled') {
        setConversations(convRes.value.data?.data || []);
      }
      if (sentRes.status === 'fulfilled') {
        setSentLikes(sentRes.value.data?.data || []);
      }
      if (receivedRes.status === 'fulfilled') {
        setReceivedLikes(receivedRes.value.data?.data || []);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải tin nhắn');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Tự động tải lại dữ liệu khi quay lại màn hình Chat từ chat-room hoặc tab khác
  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  // Xử lý khi bấm thích lại người đã thích mình -> Match thành công!
  const handleAcceptLike = async (item) => {
    const buddyId = item.buddy?.id || item.buddy?._id;
    try {
      setActionLoadingId(item.matchId);
      const res = await matchApi.swipe(buddyId, 'like');
      const { isMatch } = res.data || {};

      Alert.alert(
        '🎉 Ghép đôi thành công!',
        `Bạn và ${item.buddy?.fullName} đã được ghép đôi. Hãy bắt đầu trò chuyện ngay!`,
        [
          {
            text: 'Nhắn tin ngay',
            onPress: () => {
              loadAllData(true);
              setActiveTab('conversations');
              router.push({
                pathname: '/chat-room',
                params: {
                  matchId: item.matchId,
                  buddyId: buddyId,
                  buddyName: item.buddy?.fullName,
                  buddyAvatar: item.buddy?.avatar || '',
                },
              });
            },
          },
          { text: 'Để sau', onPress: () => loadAllData(true) },
        ]
      );
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể hoàn tất ghép đôi. Vui lòng thử lại.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openChat = (conv) => {
    router.push({
      pathname: '/chat-room',
      params: {
        matchId: conv.matchId,
        buddyId: conv.buddy?.id || conv.buddy?._id,
        buddyName: conv.buddy?.fullName,
        buddyAvatar: conv.buddy?.avatar || '',
      },
    });
  };

  // Render từng hội thoại đã ghép đôi
  const renderConversation = ({ item }) => {
    const hasUnread = item.unreadCount > 0;
    const lastMsg = item.lastMessage;

    return (
      <TouchableOpacity
        style={styles.chatRow}
        activeOpacity={0.7}
        onPress={() => openChat(item)}
      >
        <View style={styles.avatarWrap}>
          <Avatar name={item.buddy?.fullName || '?'} uri={item.buddy?.avatar} size={52} />
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.chatMain}>
          <View style={styles.chatTopLine}>
            <View style={styles.nameVerifiedRow}>
              <Text style={styles.chatName}>{item.buddy?.fullName}</Text>
              <Ionicons name="checkmark-circle" size={14} color="#0284C7" />
            </View>
            <Text style={styles.chatTime}>
              {lastMsg ? formatTime(lastMsg.createdAt) : formatTime(item.matchedAt)}
            </Text>
          </View>

          <View style={styles.chatBottomLine}>
            <Text
              style={[styles.chatMsg, hasUnread && styles.chatMsgBold]}
              numberOfLines={1}
            >
              {lastMsg
                ? (lastMsg.isFromMe ? 'Bạn: ' : '') + lastMsg.text
                : '🎉 Ghép đôi thành công! Bắt đầu trò chuyện'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>

          {item.buddy?.university && (
            <Text style={styles.buddyUni} numberOfLines={1}>
              {item.buddy.university}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render người mình đã thả tim (đang chờ họ phản hồi)
  const renderSentLike = ({ item }) => (
    <View style={styles.pendingCard}>
      <Avatar name={item.buddy?.fullName || '?'} uri={item.buddy?.avatar} size={54} />
      <View style={styles.pendingInfo}>
        <Text style={styles.pendingName}>{item.buddy?.fullName}</Text>
        <Text style={styles.pendingUni} numberOfLines={1}>
          {item.buddy?.university || 'Sinh viên'} {item.buddy?.major ? `• ${item.buddy.major}` : ''}
        </Text>
        <View style={styles.pendingBadgeRow}>
          <View style={styles.sentBadge}>
            <Ionicons name="heart" size={12} color="#FF5722" />
            <Text style={styles.sentBadgeText}>Đã gửi lời thích</Text>
          </View>
          <Text style={styles.pendingTimeText}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.pendingAction}>
        <Text style={styles.waitingNotice}>Chờ phản hồi ⏳</Text>
      </View>
    </View>
  );

  // Render người đã thích mình (chờ mình thích lại để ghép đôi)
  const renderReceivedLike = ({ item }) => (
    <View style={styles.pendingCard}>
      <Avatar name={item.buddy?.fullName || '?'} uri={item.buddy?.avatar} size={54} />
      <View style={styles.pendingInfo}>
        <Text style={styles.pendingName}>{item.buddy?.fullName}</Text>
        <Text style={styles.pendingUni} numberOfLines={1}>
          {item.buddy?.university || 'Sinh viên'}
        </Text>
        <View style={styles.receivedTag}>
          <Ionicons name="sparkles" size={12} color="#10B981" />
          <Text style={styles.receivedTagText}>Đã thích hồ sơ của bạn!</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.matchNowBtn}
        onPress={() => handleAcceptLike(item)}
        disabled={actionLoadingId === item.matchId}
      >
        <Ionicons name="heart" size={14} color={COLORS.white} />
        <Text style={styles.matchNowBtnText}>
          {actionLoadingId === item.matchId ? '...' : 'Ghép đôi'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tin nhắn</Text>
        <TouchableOpacity style={styles.newChatBtn} onPress={() => loadAllData(true)}>
          <Ionicons name="reload" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Sub-Tabs: Trò chuyện / Đã thả tim / Thích bạn */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'conversations' && styles.tabItemActive]}
          onPress={() => setActiveTab('conversations')}
        >
          <Text style={[styles.tabLabel, activeTab === 'conversations' && styles.tabLabelActive]}>
            Hội thoại ({conversations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'sent' && styles.tabItemActive]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabLabel, activeTab === 'sent' && styles.tabLabelActive]}>
            Đã thả tim ({sentLikes.length})
          </Text>
          {sentLikes.length > 0 && <View style={styles.badgeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'received' && styles.tabItemActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabLabel, activeTab === 'received' && styles.tabLabelActive]}>
            Thích bạn ({receivedLikes.length})
          </Text>
          {receivedLikes.length > 0 && <View style={[styles.badgeDot, { backgroundColor: '#10B981' }]} />}
        </TouchableOpacity>
      </View>

      {/* Venue Invitation Banner */}
      {venueInvite && (
        <View style={styles.inviteCard}>
          <View style={styles.inviteTop}>
            <View style={styles.inviteTag}>
              <Ionicons name="cafe" size={14} color={COLORS.white} />
              <Text style={styles.inviteTagText}>ĐIỂM HẸN CAFE ĐÃ CHỌN</Text>
            </View>
            {venueInvite.voucherBadge && (
              <Text style={styles.voucherTagMini}>{venueInvite.voucherBadge}</Text>
            )}
          </View>
          <Text style={styles.inviteTitle}>
            Cuộc hẹn với {venueInvite.partnerName} tại {venueInvite.venueName}
          </Text>
          {venueInvite.venueAddress && (
            <Text style={styles.inviteAddr} numberOfLines={1}>
              {venueInvite.venueAddress}
            </Text>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu kết nối...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadAllData()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'conversations' ? (
        // TAB 1: DANH SÁCH HỘI THOẠI ĐÃ GHÉP ĐÔI
        conversations.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện nào</Text>
            <Text style={styles.emptySubtitle}>
              Khi cả hai bạn cùng thả tim nhau, phòng chat sẽ xuất hiện tại đây!
            </Text>
            {sentLikes.length > 0 && (
              <TouchableOpacity
                style={styles.viewSentBtn}
                onPress={() => setActiveTab('sent')}
              >
                <Text style={styles.viewSentBtnText}>
                  Xem {sentLikes.length} bạn bạn đã thả tim 👉
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.discoverBtn}
              onPress={() => router.push('/(tabs)/discover')}
            >
              <Ionicons name="heart" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.discoverBtnText}>Khám phá thêm bạn học</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.matchId?.toString()}
            renderItem={renderConversation}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadAllData(true)}
                tintColor={COLORS.primary}
              />
            }
          />
        )
      ) : activeTab === 'sent' ? (
        // TAB 2: DANH SÁCH NHỮNG NGƯỜI MÌNH ĐÃ THẢ TIM
        sentLikes.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="heart-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Chưa thả tim bạn học nào</Text>
            <Text style={styles.emptySubtitle}>
              Hãy vào mục Khám phá để thả tim những người bạn học hợp gu nhé!
            </Text>
            <TouchableOpacity
              style={styles.discoverBtn}
              onPress={() => router.push('/(tabs)/discover')}
            >
              <Text style={styles.discoverBtnText}>Bắt đầu quẹt tìm bạn</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={sentLikes}
            keyExtractor={(item) => item.matchId?.toString()}
            renderItem={renderSentLike}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadAllData(true)}
                tintColor={COLORS.primary}
              />
            }
            ListHeaderComponent={
              <View style={styles.tabNoticeBox}>
                <Ionicons name="information-circle-outline" size={16} color="#FF5722" />
                <Text style={styles.tabNoticeText}>
                  Đây là danh sách bạn học bạn đã thả tim. Khi đối phương thả tim lại bạn, cuộc trò chuyện sẽ tự động được tạo!
                </Text>
              </View>
            }
          />
        )
      ) : (
        // TAB 3: DANH SÁCH NHỮNG NGƯỜI ĐÃ THÍCH MÌNH
        receivedLikes.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="sparkles-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có lời thích mới</Text>
            <Text style={styles.emptySubtitle}>
              Cập nhật hồ sơ và tích cực hoạt động để nhiều bạn học tìm thấy bạn hơn!
            </Text>
          </View>
        ) : (
          <FlatList
            data={receivedLikes}
            keyExtractor={(item) => item.matchId?.toString()}
            renderItem={renderReceivedLike}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadAllData(true)}
                tintColor={COLORS.primary}
              />
            }
            ListHeaderComponent={
              <View style={[styles.tabNoticeBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.tabNoticeText, { color: '#065F46' }]}>
                  Các bạn học dưới đây đã thả tim bạn! Bấm "Ghép đôi" để mở phòng chat ngay lập tức.
                </Text>
              </View>
            }
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    gap: 4,
  },
  tabItemActive: {
    borderBottomColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: 10,
    right: 8,
  },
  tabNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  tabNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#E64A19',
    lineHeight: 16,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '60',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10B981',
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
    fontWeight: '700',
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
    marginBottom: 2,
  },
  chatMsg: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
    marginRight: 8,
  },
  chatMsgBold: {
    color: COLORS.text,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  buddyUni: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pendingName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  pendingUni: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF5722',
  },
  pendingTimeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  pendingAction: {
    alignItems: 'flex-end',
  },
  waitingNotice: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  receivedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  receivedTagText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#10B981',
  },
  matchNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  matchNowBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  viewSentBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    marginBottom: 16,
  },
  viewSentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5722',
  },
  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  discoverBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },
  retryText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  inviteCard: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FFD180',
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
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inviteTagText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  voucherTagMini: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  inviteAddr: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
