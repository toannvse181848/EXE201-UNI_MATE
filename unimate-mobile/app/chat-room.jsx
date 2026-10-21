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
  Modal,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../src/constants/colors';
import { Avatar } from '../src/components/Avatar';
import { MessageAttachment, isVenueMessage } from '../src/components/MessageAttachment';
import { MeetupCard, isMeetupMessage } from '../src/components/MeetupCard';
import { meetupApi } from '../src/api/meetupApi';
import { chatApi } from '../src/api/chatApi';
import { useAuth } from '../src/context/AuthContext';

const QUICK_EMOJIS = ['☕', '📚', '🎉', '🔥', '❤️', '👍', '😂', '👋', '💯', '✨', '💻', '🙌'];

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const matchId = params.matchId;
  const buddyId = params.buddyId;
  const buddyName = params.buddyName || 'Bạn học';
  const buddyAvatar = params.buddyAvatar || null;

  const [messages, setMessages] = useState([]);
  // Thẻ "Rủ đi cafe" đang được trả lời / huỷ
  const [busyMeetupId, setBusyMeetupId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [buddyPresence, setBuddyPresence] = useState({ isOnline: false, lastActiveAt: null });
  const flatListRef = useRef(null);
  const currentUserId = (user?.id || user?._id)?.toString();

  // Helper build FormData cho ảnh
  const buildMediaFormData = (uri) => {
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const type = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename,
      type,
    });
    return formData;
  };

  // Helper tính trạng thái trực tuyến
  const getPresenceText = () => {
    if (buddyPresence.isOnline) return 'Đang trực tuyến';
    if (!buddyPresence.lastActiveAt) return 'Không trực tuyến';
    const diffMs = Math.max(0, Date.now() - new Date(buddyPresence.lastActiveAt).getTime());
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffMins < 3) return 'Đang trực tuyến';
    if (diffMins < 60) return `Hoạt động ${diffMins} phút trước`;
    if (diffHours < 24) return `Hoạt động ${diffHours} giờ trước`;
    return 'Không trực tuyến';
  };

  const isBuddyOnline = buddyPresence.isOnline || (
    buddyPresence.lastActiveAt &&
    Date.now() - new Date(buddyPresence.lastActiveAt).getTime() < 3 * 60 * 1000
  );

  // Tải lịch sử tin nhắn
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!matchId) return;
    try {
      if (isInitial) setLoading(true);
      const res = await chatApi.getMessages(matchId);
      const data = res.data?.data || [];
      setMessages(data);
      if (res.data?.buddy) {
        setBuddyPresence({
          isOnline: res.data.buddy.isOnline || false,
          lastActiveAt: res.data.buddy.lastActiveAt || null,
        });
      }
    } catch (err) {
      console.log('Lỗi tải tin nhắn:', err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMessages(true);

    const interval = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Gửi tin nhắn văn bản
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !matchId) return;

    setInputText('');
    setShowEmojiBar(false);
    setSending(true);

    // Optimistic UI
    const tempMsg = {
      _id: 'temp_' + Date.now(),
      text,
      type: 'text',
      sender: {
        _id: currentUserId,
        fullName: user?.fullName,
      },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await chatApi.sendMessage(matchId, { text, type: 'text' });
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

  // Chọn và gửi hình ảnh
  const handlePickImage = () => {
    Alert.alert(
      'Gửi hình ảnh',
      'Chọn phương thức tải ảnh',
      [
        {
          text: 'Chụp ảnh mới 📷',
          onPress: () => processImagePick('camera'),
        },
        {
          text: 'Chọn từ thư viện 🖼️',
          onPress: () => processImagePick('library'),
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const processImagePick = async (source) => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền máy ảnh để chụp ảnh');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền thư viện để chọn ảnh');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadAndSendImage(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể chọn ảnh');
    }
  };

  const uploadAndSendImage = async (uri) => {
    setUploadingImage(true);
    try {
      const formData = buildMediaFormData(uri);
      const uploadRes = await chatApi.uploadMedia(formData);
      const fileData = uploadRes.data?.data;
      if (!fileData?.fileUrl) {
        throw new Error('Không nhận được đường dẫn ảnh từ máy chủ');
      }

      const res = await chatApi.sendMessage(matchId, {
        text: '',
        type: 'image',
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName || 'photo.jpg',
        fileSize: fileData.fileSize || null,
        fileMimeType: fileData.fileMimeType || 'image/jpeg',
      });

      if (res.data?.data) {
        setMessages((prev) => [...prev, res.data.data]);
      }
    } catch (err) {
      Alert.alert('Lỗi gửi ảnh', err.message || 'Không thể tải ảnh lên');
    } finally {
      setUploadingImage(false);
    }
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Trả lời / huỷ lời mời đi cafe ngay trên thẻ trong chat
  const handleMeetupAction = async (meetupId, action) => {
    if (!meetupId || busyMeetupId) return;
    setBusyMeetupId(String(meetupId));
    try {
      const res = action === 'cancel' ? await meetupApi.cancel(meetupId) : await meetupApi.respond(meetupId, action);
      const updated = res.data?.data?.message;
      if (updated) setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
      if (action === 'accept' && res.data?.message) Alert.alert('Đã chốt hẹn ☕', res.data.message);
    } catch (err) {
      Alert.alert('Không thực hiện được', err.message);
      fetchMessages(false);
    } finally {
      setBusyMeetupId(null);
    }
  };

  const renderItem = ({ item }) => {
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
          {/* Hiển thị hình ảnh nếu có */}
          {Boolean(item.fileUrl) && item.type === 'image' && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setPreviewImage(item.fileUrl)}
              style={styles.imageBubble}
            >
              <Image
                source={{ uri: item.fileUrl }}
                style={styles.chatImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Video, tài liệu, thẻ gợi ý quán */}
          <MessageAttachment item={item} isMe={isMe} />

          {/* Thẻ rủ đi cafe */}
          {isMeetupMessage(item) && (
            <MeetupCard
              meetup={item.meetup}
              isMine={isMe}
              buddyName={buddyName}
              busy={busyMeetupId === String(item.meetup.meetupId)}
              onRespond={(action) => handleMeetupAction(item.meetup.meetupId, action)}
              onCancel={() => handleMeetupAction(item.meetup.meetupId, 'cancel')}
              onOpenWallet={() => router.push('/my-vouchers')}
            />
          )}

          {/* Hiển thị văn bản nếu có (thẻ quán / thẻ rủ cafe đã đủ thông tin nên ẩn chữ dự phòng) */}
          {Boolean(item.text) && !isVenueMessage(item) && !isMeetupMessage(item) && (
            <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
              {item.text}
            </Text>
          )}

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
          onPress={() => {
            if (buddyId) {
              router.push({
                pathname: '/profile',
                params: { userId: buddyId },
              });
            }
          }}
        >
          <View style={{ position: 'relative' }}>
            <Avatar name={buddyName} uri={buddyAvatar} size={40} />
            <View
              style={[
                styles.presenceDot,
                isBuddyOnline ? styles.presenceOnline : styles.presenceOffline,
              ]}
            />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName} numberOfLines={1}>
              {buddyName}
            </Text>
            <Text style={[styles.headerStatus, isBuddyOnline && styles.headerStatusOnline]}>
              {getPresenceText()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Nút Rủ đi Cafe */}
        <TouchableOpacity
          style={styles.cafeInviteBtn}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: '/select-place',
              params: { matchId, buddyName, returnTo: 'chat' },
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
            extraData={busyMeetupId}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListHeaderComponent={
              <View style={styles.matchIntroBox}>
                <View style={styles.matchIconWrap}>
                  <Ionicons name="sparkles" size={20} color="#FF5722" />
                </View>
                <Text style={styles.matchIntroTitle}>
                  Bạn và {buddyName} đã kết bạn! 🎉
                </Text>
                <Text style={styles.matchIntroDesc}>
                  Hãy gửi lời chào đầu tiên hoặc rủ nhau qua một quán cafe yên tĩnh để học bài và cày deadline nhé.
                </Text>
              </View>
            }
          />
        )}

        {/* Emoji Quick Bar */}
        {showEmojiBar && (
          <View style={styles.emojiBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiList}>
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiBtn}
                  onPress={() => setInputText((prev) => prev + emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={handlePickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="image-outline" size={22} color={COLORS.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => setShowEmojiBar((prev) => !prev)}
          >
            <Ionicons
              name={showEmojiBar ? 'happy' : 'happy-outline'}
              size={22}
              color={showEmojiBar ? COLORS.primary : COLORS.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() =>
              router.push({
                pathname: '/select-place',
                params: { matchId, buddyName, returnTo: 'chat' },
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

      {/* LIGHTBOX PREVIEW ẢNH */}
      <Modal visible={Boolean(previewImage)} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {Boolean(previewImage) && (
            <Image source={{ uri: previewImage }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
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
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  presenceOnline: {
    backgroundColor: '#10B981',
  },
  presenceOffline: {
    backgroundColor: '#94A3B8',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerStatus: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  headerStatusOnline: {
    color: '#10B981',
    fontWeight: '600',
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
    borderColor: '#FFE0B2',
  },
  cafeInviteText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  keyboardContainer: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  matchIntroBox: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFF8F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFEBE5',
    marginBottom: 20,
  },
  matchIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEBE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  matchIntroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  matchIntroDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
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
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageBubble: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
  },
  chatImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  msgText: {
    fontSize: 14,
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
    color: 'rgba(255, 255, 255, 0.75)',
  },
  timeTextOther: {
    color: COLORS.textMuted,
  },
  emojiBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
  },
  emojiList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  emojiBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emojiText: {
    fontSize: 22,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 99,
    padding: 10,
  },
  lightboxImage: {
    width: '94%',
    height: '80%',
  },
});
