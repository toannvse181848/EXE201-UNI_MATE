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
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../src/constants/colors';
import { Avatar } from '../src/components/Avatar';
import { groupChatApi } from '../src/api/groupChatApi';
import { useAuth } from '../src/context/AuthContext';

const QUICK_EMOJIS = ['☕', '📚', '🎉', '🔥', '❤️', '👍', '😂', '👋', '💯', '✨', '💻', '🙌'];

export default function GroupChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const groupId = params.groupId;
  const initialName = params.groupName || 'Nhóm học tập';
  const initialAvatar = params.groupAvatar || null;

  const [group, setGroup] = useState({
    id: groupId,
    name: initialName,
    avatar: initialAvatar,
    memberCount: params.memberCount ? Number(params.memberCount) : 1,
    members: [],
  });

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Modals
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [invitableFriends, setInvitableFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [loadingInvitable, setLoadingInvitable] = useState(false);

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

  // Tải tin nhắn và thông tin nhóm
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!groupId) return;
    try {
      if (isInitial) setLoading(true);
      const res = await groupChatApi.getGroupMessages(groupId);
      const data = res.data?.data || [];
      setMessages(data);

      if (res.data?.group) {
        setGroup((prev) => ({
          ...prev,
          ...res.data.group,
        }));
      }
    } catch (err) {
      console.log('Lỗi tải tin nhắn nhóm:', err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMessages(true);

    const interval = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Gửi tin nhắn văn bản
  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text || sending || !groupId) return;

    setInputText('');
    setShowEmojiBar(false);
    setSending(true);

    const tempMsg = {
      _id: 'temp_' + Date.now(),
      text,
      type: 'text',
      sender: {
        _id: currentUserId,
        fullName: user?.fullName || 'Tôi',
        avatar: user?.avatar,
      },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await groupChatApi.sendGroupMessage(groupId, { text, type: 'text' });
      const savedMsg = res.data?.data;
      if (savedMsg) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempMsg._id ? savedMsg : m))
        );
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn: ' + (err.message || 'Thử lại'));
    } finally {
      setSending(false);
    }
  };

  // Chọn ảnh để gửi
  const handlePickImage = () => {
    Alert.alert(
      'Gửi hình ảnh vào nhóm',
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
      const uploadRes = await groupChatApi.uploadMedia(formData);
      const fileData = uploadRes.data?.data;
      if (!fileData?.fileUrl) {
        throw new Error('Không nhận được đường dẫn ảnh từ máy chủ');
      }

      const res = await groupChatApi.sendGroupMessage(groupId, {
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

  // Mở modal thêm thành viên
  const openAddMemberModal = async () => {
    setSelectedFriends([]);
    setShowAddMemberModal(true);
    setLoadingInvitable(true);
    try {
      const res = await groupChatApi.getInvitableFriends(groupId);
      setInvitableFriends(res.data?.data || []);
    } catch (err) {
      setInvitableFriends([]);
    } finally {
      setLoadingInvitable(false);
    }
  };

  const toggleSelectFriend = (friendId) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleAddMembersSubmit = async () => {
    if (!selectedFriends.length) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 bạn bè để thêm');
      return;
    }
    setAddingMembers(true);
    try {
      await groupChatApi.addMembers(groupId, selectedFriends);
      setShowAddMemberModal(false);
      fetchMessages(false);
      Alert.alert('Thành công', `Đã thêm ${selectedFriends.length} thành viên vào nhóm! 🎉`);
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể thêm thành viên');
    } finally {
      setAddingMembers(false);
    }
  };

  // Rời nhóm
  const handleLeaveGroup = () => {
    Alert.alert(
      'Rời nhóm',
      `Bạn có chắc chắn muốn rời khỏi nhóm "${group.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupChatApi.leaveGroup(groupId);
              Alert.alert('Thông báo', 'Bạn đã rời nhóm thành công');
              router.back();
            } catch (err) {
              Alert.alert('Lỗi', err.message || 'Không thể rời nhóm');
            }
          },
        },
      ]
    );
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageItem = ({ item }) => {
    // 1. Tin nhắn hệ thống
    if (item.type === 'system') {
      return (
        <View style={styles.systemMsgWrap}>
          <View style={styles.systemMsgPill}>
            <Ionicons name="information-circle-outline" size={14} color="#7C3AED" style={{ marginRight: 4 }} />
            <Text style={styles.systemMsgText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    const senderId = (item.sender?._id || item.sender?.id || item.sender)?.toString();
    const isMe = senderId === currentUserId;
    const senderName = item.sender?.fullName || 'Thành viên';
    const senderAvatar = item.sender?.avatar;

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe && (
          <Avatar
            name={senderName}
            uri={senderAvatar}
            size={32}
            style={styles.msgAvatar}
          />
        )}
        <View style={[styles.bubbleWrapper, isMe && { alignItems: 'flex-end' }]}>
          {!isMe && <Text style={styles.senderLabel}>{senderName}</Text>}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            {/* Hình ảnh nếu có */}
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

            {/* Văn bản */}
            {Boolean(item.text) && (
              <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
                {item.text}
              </Text>
            )}

            {/* Thời gian */}
            <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        {/* Group Info click opens members */}
        <TouchableOpacity
          style={styles.headerGroupInfo}
          onPress={() => setShowMembersModal(true)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#7C3AED', '#A855F7']}
            style={styles.groupAvatarWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {group.avatar ? (
              <Image source={{ uri: group.avatar }} style={styles.groupAvatarImg} />
            ) : (
              <Ionicons name="people" size={18} color="#FFFFFF" />
            )}
          </LinearGradient>

          <View style={styles.headerTextWrap}>
            <Text style={styles.groupHeaderName} numberOfLines={1}>
              {group.name}
            </Text>
            <Text style={styles.groupHeaderSub}>
              👥 {group.memberCount || group.members?.length || 1} thành viên
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action icons */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={openAddMemberModal}
            title="Thêm bạn"
          >
            <Ionicons name="person-add-outline" size={20} color="#7C3AED" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleLeaveGroup}
            title="Rời nhóm"
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Danh sách tin nhắn */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingLabel}>Đang tải cuộc trò chuyện nhóm...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id || item.createdAt}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListHeaderComponent={
              <View style={styles.groupIntroBox}>
                <LinearGradient
                  colors={['#EDE9FE', '#DDD6FE']}
                  style={styles.groupIntroIcon}
                >
                  <Ionicons name="people" size={28} color="#7C3AED" />
                </LinearGradient>
                <Text style={styles.groupIntroTitle}>{group.name}</Text>
                <Text style={styles.groupIntroDesc}>
                  Chào mừng bạn đến với nhóm chat! Nơi trao đổi học tập, chia sẻ tài liệu và hẹn bạn cùng cày deadline.
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
              <ActivityIndicator size="small" color="#7C3AED" />
            ) : (
              <Ionicons name="image-outline" size={22} color="#7C3AED" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => setShowEmojiBar((prev) => !prev)}
          >
            <Ionicons
              name={showEmojiBar ? 'happy' : 'happy-outline'}
              size={22}
              color={showEmojiBar ? '#7C3AED' : COLORS.textMuted}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={`Nhắn tin vào ${group.name}...`}
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() || sending ? styles.sendBtnDisabled : styles.sendBtnActive,
            ]}
            onPress={handleSendText}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={17} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* MODAL DANH SÁCH THÀNH VIÊN */}
      <Modal visible={showMembersModal} transparent animationType="fade" onRequestClose={() => setShowMembersModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Thành viên nhóm ({group.members?.length || group.memberCount || 1})
              </Text>
              <TouchableOpacity onPress={() => setShowMembersModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {(group.members || []).map((m) => {
                const mUser = m.user || m;
                const mId = (mUser._id || mUser.id || m.user)?.toString();
                const isAdmin = m.role === 'admin';
                return (
                  <View key={mId} style={styles.memberItem}>
                    <Avatar name={mUser.fullName || 'Bạn'} uri={mUser.avatar} size={42} />
                    <View style={styles.memberInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.memberName}>{mUser.fullName || 'Thành viên'}</Text>
                        {isAdmin && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>}
                        {mId === currentUserId && <Text style={styles.youText}>(Bạn)</Text>}
                      </View>
                      {Boolean(mUser.studentProfile?.university || mUser.university) && (
                        <Text style={styles.memberUni}>
                          {mUser.studentProfile?.university || mUser.university}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.addMemberFullBtn}
                onPress={() => {
                  setShowMembersModal(false);
                  openAddMemberModal();
                }}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.addMemberFullBtnText}>Thêm thành viên mới</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL THÊM THÀNH VIÊN */}
      <Modal visible={showAddMemberModal} transparent animationType="fade" onRequestClose={() => setShowAddMemberModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm bạn bè vào nhóm</Text>
              <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {loadingInvitable ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={{ marginTop: 10, color: COLORS.textMuted, fontSize: 13 }}>Đang tải danh sách bạn bè...</Text>
                </View>
              ) : invitableFriends.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle-outline" size={44} color="#7C3AED" />
                  <Text style={{ marginTop: 10, fontSize: 14, fontWeight: '700', color: COLORS.text }}>Tất cả bạn bè đã ở trong nhóm!</Text>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' }}>
                    Hãy kết bạn thêm tại mục Khám phá để mời họ vào nhóm nhé.
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 300 }}>
                  {invitableFriends.map((f) => {
                    const fId = f.id || f._id;
                    const isSelected = selectedFriends.includes(fId);
                    return (
                      <TouchableOpacity
                        key={fId}
                        style={[styles.friendSelectItem, isSelected && styles.friendSelectItemActive]}
                        onPress={() => toggleSelectFriend(fId)}
                        activeOpacity={0.7}
                      >
                        <Avatar name={f.fullName} uri={f.avatar} size={40} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.friendSelectName, isSelected && { color: '#7C3AED' }]}>
                            {f.fullName}
                          </Text>
                          <Text style={styles.friendSelectUni}>{f.university || 'Sinh viên'}</Text>
                        </View>
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddMemberModal(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!selectedFriends.length || addingMembers) && styles.confirmBtnDisabled]}
                onPress={handleAddMembersSubmit}
                disabled={!selectedFriends.length || addingMembers}
              >
                {addingMembers ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    Thêm {selectedFriends.length > 0 ? `(${selectedFriends.length})` : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerGroupInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  groupAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  groupHeaderName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  groupHeaderSub: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
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
  groupIntroBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  groupIntroIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupIntroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  groupIntroDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  systemMsgWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMsgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  systemMsgText: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '600',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    marginRight: 8,
    marginBottom: 2,
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    marginLeft: 6,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: '#7C3AED',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
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
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#7C3AED',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalBody: {
    padding: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  adminBadge: {
    backgroundColor: '#F5F0FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
  },
  youText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  memberUni: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addMemberFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 14,
  },
  addMemberFullBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  friendSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  friendSelectItemActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F0FF',
  },
  friendSelectName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  friendSelectUni: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  modalFooterRow: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
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
