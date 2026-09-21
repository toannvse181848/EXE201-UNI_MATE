import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/colors';
import { Avatar } from '../src/components/Avatar';
import { chatApi } from '../src/api/chatApi';
import { useAuth } from '../src/context/AuthContext';

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const matchId = params.matchId;
  const buddyId = params.buddyId;
  const buddyName = params.buddyName || 'Bạn học';
  const buddyAvatar = params.buddyAvatar || null;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  // Tải lịch sử tin nhắn
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!matchId) return;
    try {
      if (isInitial) setLoading(true);
      const res = await chatApi.getMessages(matchId);
      const data = res.data?.data || [];
      setMessages(data);
    } catch (err) {
      console.log('Lỗi tải tin nhắn:', err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMessages(true);

    // Polling tự động làm mới tin nhắn mỗi 3 giây
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Gửi tin nhắn
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !matchId) return;

    setInputText('');
    setSending(true);

    // Optimistic UI: hiển thị ngay tin nhắn
    const tempMsg = {
      _id: 'temp_' + Date.now(),
      text,
      sender: {
        _id: user?.id || user?._id,
        fullName: user?.fullName,
      },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await chatApi.sendMessage(matchId, text);
      const savedMsg = res.data?.data;
      if (savedMsg) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempMsg._id ? savedMsg : m))
        );
      }
    } catch (err) {
      console.log('Lỗi gửi tin nhắn:', err.message);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => {
    const currentUserId = (user?.id || user?._id)?.toString();
    const isMe =
      item.sender?._id?.toString() === currentUserId ||
      item.sender?.toString() === currentUserId;

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        {!isMe && (
          <Avatar
            name={buddyName}
            uri={buddyAvatar}
            size={32}
            style={styles.msgAvatar}
          />
        )}
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
          ]}
        >
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buddyInfo}
          activeOpacity={0.8}
          onPress={() => {}}
        >
          <View style={styles.headerAvatarWrap}>
            <Avatar name={buddyName} uri={buddyAvatar} size={40} />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.buddyTextWrap}>
            <View style={styles.nameRow}>
              <Text style={styles.headerName} numberOfLines={1}>
                {buddyName}
              </Text>
              <Ionicons name="checkmark-circle" size={14} color="#0284C7" />
            </View>
            <Text style={styles.headerStatus}>Đang trực tuyến</Text>
          </View>
        </TouchableOpacity>

        {/* Nút Rủ đi Cafe */}
        <TouchableOpacity
          style={styles.cafeInviteBtn}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: '/select-place',
              params: { matchId, buddyName },
            })
          }
        >
          <Ionicons name="cafe" size={16} color={COLORS.primary} />
          <Text style={styles.cafeInviteText}>Rủ cafe</Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách tin nhắn */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingLabel}>Đang tải cuộc trò chuyện...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id || item.createdAt}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListHeaderComponent={
              <View style={styles.matchIntroBox}>
                <View style={styles.matchIconWrap}>
                  <Ionicons name="sparkles" size={20} color="#FF5722" />
                </View>
                <Text style={styles.matchIntroTitle}>
                  Bạn và {buddyName} đã ghép đôi! 🎉
                </Text>
                <Text style={styles.matchIntroDesc}>
                  Hãy gửi lời chào đầu tiên hoặc rủ nhau qua một quán cafe yên tĩnh để học bài và cày deadline nhé.
                </Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() =>
              router.push({
                pathname: '/select-place',
                params: { matchId, buddyName },
              })
            }
          >
            <Ionicons name="cafe-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={`Nhắn tin cho ${buddyName}...`}
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={18} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backBtn: {
    padding: 6,
    marginLeft: -6,
  },
  buddyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  buddyTextWrap: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerStatus: {
    fontSize: 11.5,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 1,
  },
  cafeInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD180',
  },
  cafeInviteText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  keyboardContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLabel: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  matchIntroBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  matchIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  matchIntroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  matchIntroDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  msgText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  msgTextMe: {
    color: COLORS.white,
  },
  msgTextOther: {
    color: COLORS.text,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeTextOther: {
    color: COLORS.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    color: COLORS.text,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
