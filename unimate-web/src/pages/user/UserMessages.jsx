import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Send,
  Coffee,
  CheckCheck,
  MoreVertical,
  Calendar,
  Sparkles,
  Paperclip,
  Smile,
  Heart,
  Clock,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  ExternalLink,
  ChevronRight,
  MapPin,
  Award,
  ArrowLeft,
  Image as ImageIcon,
  Video,
  FileText,
  Download,
  X,
  Loader2,
  Plus,
  UserPlus,
  LogOut,
  Crown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { chatApi, matchApi, groupChatApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../constants/avatar';

// Helper format thời gian tin nhắn
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

// Helper format dung lượng tệp
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper sửa lỗi encoding tên file tiếng Việt bị hiển thị dạng latin1 / mojibake
const repairMojibake = (str) => {
  if (!str) return 'Tài liệu';
  try {
    if (/(?:[\u00C2\u00C3]|á[º»¼½¾¿])/.test(str)) {
      const bytes = new Uint8Array([...str].map((c) => c.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8').decode(bytes);
      if (decoded && !decoded.includes('\uFFFD')) {
        return decoded;
      }
    }
  } catch (e) {}
  return str;
};

// Danh mục biểu tượng & icon phổ biến cho sinh viên
const EMOJI_CATEGORIES = [
  {
    name: 'Cảm xúc & Biểu cảm',
    emojis: ['😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🥳', '🥺', '😴', '🤯', '😇', '🤩', '🤔', '😋', '🤗'],
  },
  {
    name: 'Học tập & Cafe',
    emojis: ['☕', '🧋', '🍵', '🍰', '🥐', '🍕', '🥤', '📚', '📖', '📝', '💻', '🎓', '🎒', '💡', '🎯', '🚀'],
  },
  {
    name: 'Thả tim & Cử chỉ',
    emojis: ['👍', '👏', '🙌', '🤝', '✌️', '🤞', '👋', '💖', '❤️', '💕', '🔥', '✨', '🎉', '🌸', '🍀', '⭐'],
  },
];

// Helper định dạng trạng thái trực tuyến / ngoại tuyến theo thời gian thực
const getPresenceInfo = (buddy) => {
  if (!buddy) {
    return {
      isOnline: false,
      statusText: 'Không trực tuyến',
      dotColor: '#94A3B8',
      textColor: '#94A3B8',
    };
  }

  let isOnline = Boolean(buddy.isOnline);
  const lastActiveAt = buddy.lastActiveAt;

  if (lastActiveAt) {
    const diffMs = Date.now() - new Date(lastActiveAt).getTime();
    // Coi là trực tuyến nếu hoạt động trong vòng 3 phút
    if (diffMs < 3 * 60 * 1000) {
      isOnline = true;
    }
  }

  if (isOnline) {
    return {
      isOnline: true,
      statusText: 'Đang trực tuyến 🟢',
      dotColor: '#22C55E',
      textColor: '#16A34A',
    };
  }

  if (!lastActiveAt) {
    return {
      isOnline: false,
      statusText: 'Không trực tuyến',
      dotColor: '#94A3B8',
      textColor: '#94A3B8',
    };
  }

  const diffMs = Math.max(0, Date.now() - new Date(lastActiveAt).getTime());
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  let timeText = '';
  if (diffMins < 60) {
    timeText = diffMins <= 0 ? 'Vừa xong' : `${diffMins} phút trước`;
  } else if (diffHours < 24) {
    timeText = `${diffHours} giờ trước`;
  } else if (diffDays === 1) {
    timeText = 'Hôm qua';
  } else if (diffDays < 7) {
    timeText = `${diffDays} ngày trước`;
  } else {
    timeText = new Date(lastActiveAt).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  return {
    isOnline: false,
    statusText: `Không trực tuyến (${timeText})`,
    shortStatus: `Hoạt động ${timeText}`,
    dotColor: '#94A3B8',
    textColor: '#94A3B8',
  };
};


export default function UserMessages() {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  // Tabs: 'conversations' | 'received' | 'sent' | 'groups'
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversations, setConversations] = useState([]);
  const [sentLikes, setSentLikes] = useState([]);
  const [receivedLikes, setReceivedLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active chat (1-1)
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Đa phương tiện & Emoji states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null); // { file, previewUrl, type, name, size }
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaPreviewModal, setMediaPreviewModal] = useState(null);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // ─── GROUP CHAT STATES ───────────────────────────────────────────────────
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loadingGroupMessages, setLoadingGroupMessages] = useState(false);
  const [groupInputText, setGroupInputText] = useState('');
  const [sendingGroup, setSendingGroup] = useState(false);
  const [groupAttachment, setGroupAttachment] = useState(null);
  const [groupEmojiPicker, setGroupEmojiPicker] = useState(false);
  const groupEmojiPickerRef = useRef(null);
  const groupImageInputRef = useRef(null);
  const groupVideoInputRef = useRef(null);
  const groupFileInputRef = useRef(null);
  const groupMessagesEndRef = useRef(null);

  // Modal tạo nhóm
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [createGroupName, setCreateGroupName] = useState('');
  const [createGroupFriends, setCreateGroupFriends] = useState([]);
  const [createGroupSelected, setCreateGroupSelected] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Modal thêm thành viên
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberFriends, setAddMemberFriends] = useState([]);
  const [addMemberSelected, setAddMemberSelected] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);

  // Modal danh sách thành viên nhóm
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);

  // Đóng emoji picker khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleSelectEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  const handleFileSelect = (e, forcedType = null) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const mime = file.type || '';
    let mediaType = forcedType || 'file';
    if (!forcedType) {
      if (mime.startsWith('image/')) mediaType = 'image';
      else if (mime.startsWith('video/')) mediaType = 'video';
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File vượt quá giới hạn 50MB cho phép');
      return;
    }

    const previewUrl = mediaType === 'image' || mediaType === 'video' ? URL.createObjectURL(file) : null;
    setSelectedAttachment({
      file,
      previewUrl,
      type: mediaType,
      name: file.name,
      size: file.size,
    });
  };

  const currentUserId = (user?.id || user?._id)?.toString();

  // 1. Tải toàn bộ dữ liệu (Hội thoại, Đã gửi tim, Nhận được tim)
  const loadAllData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [convRes, sentRes, receivedRes] = await Promise.allSettled([
        chatApi.getConversations(),
        matchApi.getSentLikes(),
        matchApi.getReceivedLikes(),
      ]);

      let realConvs = [];
      if (convRes.status === 'fulfilled' && convRes.value?.data) {
        realConvs = convRes.value.data;
      }
      let realSent = [];
      if (sentRes.status === 'fulfilled' && sentRes.value?.data) {
        realSent = sentRes.value.data;
      }
      let realReceived = [];
      if (receivedRes.status === 'fulfilled' && receivedRes.value?.data) {
        realReceived = receivedRes.value.data;
      }

      setConversations(realConvs);
      setSentLikes(realSent);
      setReceivedLikes(realReceived);
      if (!selectedMatchId && !selectedGroupId && realConvs.length > 0) {
        setSelectedMatchId(realConvs[0].matchId);
      }
    } catch (err) {
      console.log('Lỗi tải dữ liệu chat:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMatchId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 2. Tải tin nhắn của hội thoại đang chọn
  const loadMessages = useCallback(
    async (matchId, isPolling = false) => {
      if (!matchId) return;

      // Bỏ qua matchId không hợp lệ
      if (!matchId || matchId.startsWith('demo_')) return;

      try {
        if (!isPolling) setLoadingMessages(true);
        const res = await chatApi.getMessages(matchId);
        const list = res.data || [];
        setMessages(list);

        // Cập nhật lại trạng thái buddy (lastActiveAt, isOnline) nếu backend trả về
        if (res.buddy) {
          setConversations((prev) =>
            prev.map((c) =>
              c.matchId === matchId
                ? {
                    ...c,
                    buddy: {
                      ...c.buddy,
                      ...res.buddy,
                    },
                  }
                : c
            )
          );
        }
      } catch (err) {
        console.log('Lỗi tải tin nhắn matchId:', matchId, err.message);
      } finally {
        if (!isPolling) setLoadingMessages(false);
      }
    },
    [currentUserId, user?.name]
  );

  useEffect(() => {
    if (selectedMatchId) {
      loadMessages(selectedMatchId);
    }
  }, [selectedMatchId, loadMessages]);

  // 3. Polling tin nhắn mới mỗi 3.5s khi đang mở chat
  useEffect(() => {
    if (!selectedMatchId || selectedMatchId.startsWith('demo_')) return;
    const timer = setInterval(() => {
      loadMessages(selectedMatchId, true);
    }, 3500);
    return () => clearInterval(timer);
  }, [selectedMatchId, loadMessages]);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Tìm kiếm cuộc trò chuyện
  const activeConversation =
    conversations.find((c) => c.matchId === selectedMatchId) ||
    (!selectedGroupId && conversations.length > 0 ? conversations[0] : null);

  const filteredConversations = conversations.filter((c) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      c.buddy?.fullName?.toLowerCase().includes(q) ||
      c.buddy?.university?.toLowerCase().includes(q)
    );
  });

  const filteredSentLikes = sentLikes.filter((item) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      item.buddy?.fullName?.toLowerCase().includes(q) ||
      item.buddy?.university?.toLowerCase().includes(q)
    );
  });

  const filteredReceivedLikes = receivedLikes.filter((item) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      item.buddy?.fullName?.toLowerCase().includes(q) ||
      item.buddy?.university?.toLowerCase().includes(q)
    );
  });

  // 5. Gửi tin nhắn (hỗ trợ văn bản + đa phương tiện ảnh/video/tài liệu)
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    const attachment = selectedAttachment;
    if ((!text && !attachment) || sending || uploadingMedia || !selectedMatchId) return;

    setInputText('');
    setSelectedAttachment(null);
    setShowEmojiPicker(false);
    setSending(true);

    let uploadedFile = null;
    if (attachment?.file) {
      setUploadingMedia(true);
      try {
        const uploadRes = await chatApi.uploadMedia(attachment.file);
        if (uploadRes?.data) {
          uploadedFile = uploadRes.data;
        }
      } catch (uploadErr) {
        console.error('Lỗi upload tệp đính kèm:', uploadErr);
        alert('Không thể tải file lên. Vui lòng thử lại.');
        setSending(false);
        setUploadingMedia(false);
        return;
      } finally {
        setUploadingMedia(false);
      }
    }

    const payload = {
      text: text || '',
      type: uploadedFile ? uploadedFile.mediaType : 'text',
      fileUrl: uploadedFile ? uploadedFile.fileUrl : null,
      fileName: attachment?.name || uploadedFile?.fileName || null,
      fileSize: uploadedFile ? uploadedFile.fileSize : null,
      fileMimeType: uploadedFile ? uploadedFile.fileMimeType : null,
    };

    // Optimistic UI update
    const tempMsg = {
      _id: 'temp_' + Date.now(),
      text: payload.text,
      type: payload.type,
      fileUrl: payload.fileUrl || attachment?.previewUrl || null,
      fileName: payload.fileName || attachment?.name || null,
      fileSize: payload.fileSize || attachment?.size || null,
      sender: {
        _id: currentUserId,
        fullName: user?.name || user?.fullName || 'Tôi',
      },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    // Update conversation snippet in sidebar
    let previewSnippet = payload.text;
    if (!previewSnippet) {
      if (payload.type === 'image') previewSnippet = '📷 [Hình ảnh]';
      else if (payload.type === 'video') previewSnippet = '🎥 [Video]';
      else if (payload.type === 'file') previewSnippet = `📎 [Tệp] ${payload.fileName || ''}`;
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.matchId === selectedMatchId
          ? {
              ...c,
              lastMessage: {
                text: previewSnippet,
                type: payload.type,
                isFromMe: true,
                createdAt: new Date().toISOString(),
              },
            }
          : c
      )
    );

    if (selectedMatchId.startsWith('demo_')) {
      setSending(false);
      return;
    }

    try {
      const res = await chatApi.sendMessage(selectedMatchId, payload);
      const savedMsg = res.data;
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

  // 6. Xử lý khi bấm thích lại người đã thích mình -> Kết bạn thành công!
  const handleAcceptLike = async (item) => {
    const buddyId = item.buddy?.id || item.buddy?._id;
    if (!buddyId) return;

    try {
      setActionLoadingId(item.matchId);
      const res = await matchApi.swipe(buddyId, 'like');
      const isMatch = res?.isMatch ?? true;

      alert(
        `🎉 Kết bạn thành công!\nBạn và ${item.buddy?.fullName} đã thích nhau. Hãy bắt đầu trò chuyện ngay nhé! ☕`
      );

      // Tải lại dữ liệu và chuyển ngay sang tab Hội thoại
      await loadAllData(true);
      setActiveTab('conversations');
      setSelectedMatchId(item.matchId);
    } catch (err) {
      console.error('Lỗi khi chấp nhận thích:', err);
      alert('Không thể hoàn tất kết bạn. Vui lòng thử lại.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Rủ đi cafe nhanh
  const handleQuickCoffeeInvite = () => {
    const inviteText =
      '☕ Chiều mai bạn có rảnh ra quán cafe gần trường ngồi học chung cày deadline không? Mình đang có voucher giảm giá nè!';
    setInputText(inviteText);
  };

  // ─── GROUP CHAT HANDLERS ──────────────────────────────────────────────────

  // Tải danh sách nhóm
  const loadGroups = useCallback(async (silent = false) => {
    try {
      const res = await groupChatApi.getMyGroups();
      setGroups(res.data || []);
    } catch (err) {
      console.log('Lỗi tải nhóm:', err.message);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Tải tin nhắn của nhóm đang chọn
  const loadGroupMessages = useCallback(async (groupId, isPolling = false) => {
    if (!groupId) return;
    try {
      if (!isPolling) setLoadingGroupMessages(true);
      const res = await groupChatApi.getGroupMessages(groupId);
      setGroupMessages(res.data || []);
      if (res.group) setGroupInfo(res.group);
    } catch (err) {
      console.log('Lỗi tải tin nhắn nhóm:', err.message);
    } finally {
      if (!isPolling) setLoadingGroupMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupMessages(selectedGroupId);
    }
  }, [selectedGroupId, loadGroupMessages]);

  // Polling tin nhắn nhóm mỗi 4s
  useEffect(() => {
    if (!selectedGroupId) return;
    const timer = setInterval(() => {
      loadGroupMessages(selectedGroupId, true);
    }, 4000);
    return () => clearInterval(timer);
  }, [selectedGroupId, loadGroupMessages]);

  // Scroll xuống cuối khi có tin nhắn nhóm mới
  useEffect(() => {
    groupMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  // Gửi tin nhắn nhóm
  const handleSendGroupMessage = async (e) => {
    e?.preventDefault();
    const text = groupInputText.trim();
    const attachment = groupAttachment;
    if ((!text && !attachment) || sendingGroup || !selectedGroupId) return;

    setGroupInputText('');
    setGroupAttachment(null);
    setGroupEmojiPicker(false);
    setSendingGroup(true);

    let uploadedFile = null;
    if (attachment?.file) {
      try {
        const uploadRes = await groupChatApi.uploadMedia(attachment.file);
        if (uploadRes?.data) uploadedFile = uploadRes.data;
      } catch (err) {
        alert('Không thể tải file lên. Vui lòng thử lại.');
        setSendingGroup(false);
        return;
      }
    }

    const payload = {
      text: text || '',
      type: uploadedFile ? uploadedFile.mediaType : 'text',
      fileUrl: uploadedFile?.fileUrl || null,
      fileName: attachment?.name || uploadedFile?.fileName || null,
      fileSize: uploadedFile?.fileSize || null,
      fileMimeType: uploadedFile?.fileMimeType || null,
    };

    // Optimistic UI
    const tempMsg = {
      _id: 'temp_' + Date.now(),
      text: payload.text,
      type: payload.type,
      fileUrl: payload.fileUrl || attachment?.previewUrl || null,
      fileName: payload.fileName || null,
      fileSize: payload.fileSize || attachment?.size || null,
      sender: { _id: currentUserId, fullName: user?.fullName || user?.name || 'Tôi' },
      createdAt: new Date().toISOString(),
    };
    setGroupMessages((prev) => [...prev, tempMsg]);

    // Update sidebar preview
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === selectedGroupId
          ? { ...g, lastMessage: { text: payload.text || '📎 Tệp', type: payload.type, createdAt: new Date().toISOString() } }
          : g
      )
    );

    try {
      const res = await groupChatApi.sendGroupMessage(selectedGroupId, payload);
      const savedMsg = res.data;
      if (savedMsg) {
        setGroupMessages((prev) => prev.map((m) => (m._id === tempMsg._id ? savedMsg : m)));
      }
    } catch (err) {
      console.log('Lỗi gửi tin nhắn nhóm:', err.message);
    } finally {
      setSendingGroup(false);
    }
  };

  // Chọn file đính kèm cho nhóm
  const handleGroupFileSelect = (e, forcedType = null) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 50 * 1024 * 1024) { alert('File vượt quá 50MB'); return; }
    const mime = file.type || '';
    let mediaType = forcedType || 'file';
    if (!forcedType) {
      if (mime.startsWith('image/')) mediaType = 'image';
      else if (mime.startsWith('video/')) mediaType = 'video';
    }
    const previewUrl = (mediaType === 'image' || mediaType === 'video') ? URL.createObjectURL(file) : null;
    setGroupAttachment({ file, previewUrl, type: mediaType, name: file.name, size: file.size });
  };

  // Lấy danh sách bạn bè dự phòng từ chính conversations đã load thành công
  const getFallbackFriends = () => {
    return (conversations || [])
      .filter((c) => c.buddy && (c.buddy.id || c.buddy._id))
      .map((c) => ({
        id: c.buddy.id || c.buddy._id,
        _id: c.buddy.id || c.buddy._id,
        fullName: c.buddy.fullName,
        avatar: c.buddy.avatar,
        university: c.buddy.university,
        major: c.buddy.major,
      }));
  };

  // Mở modal tạo nhóm và tải danh sách bạn bè
  const openCreateGroupModal = async () => {
    setCreateGroupName('');
    setCreateGroupSelected([]);
    const fallbackFriends = getFallbackFriends();
    setCreateGroupFriends(fallbackFriends);
    setShowCreateGroupModal(true);
    try {
      const res = await groupChatApi.getMyFriends();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setCreateGroupFriends(res.data);
      } else if (fallbackFriends.length > 0) {
        setCreateGroupFriends(fallbackFriends);
      }
    } catch (err) {
      console.warn('Tải bạn bè qua API gặp lỗi, dùng danh sách bạn từ hội thoại:', err.message);
      if (fallbackFriends.length > 0) {
        setCreateGroupFriends(fallbackFriends);
      }
    }
  };

  // Tạo nhóm mới
  const handleCreateGroup = async () => {
    if (!createGroupName.trim()) { alert('Vui lòng nhập tên nhóm'); return; }
    setCreatingGroup(true);
    try {
      const res = await groupChatApi.createGroup(
        createGroupName.trim(),
        createGroupSelected.map((f) => f.id || f._id)
      );
      const newGroup = res.data;
      setGroups((prev) => [newGroup, ...prev]);
      setShowCreateGroupModal(false);
      const gId = newGroup.groupId || newGroup._id || newGroup.id;
      setSelectedGroupId(gId);
      setSelectedMatchId(null);
      setActiveTab('groups');
    } catch (err) {
      alert('Không thể tạo nhóm. Vui lòng thử lại: ' + err.message);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Toggle chọn bạn khi tạo nhóm
  const toggleFriendSelection = (friend, list, setList) => {
    const id = friend.id || friend._id;
    const exists = list.find((f) => (f.id || f._id) === id);
    if (exists) setList(list.filter((f) => (f.id || f._id) !== id));
    else setList([...list, friend]);
  };

  // Mở modal thêm thành viên
  const openAddMemberModal = async () => {
    setAddMemberSelected([]);
    const existingMemberIds = (groupInfo?.members || activeGroup?.members || []).map((m) =>
      (m.id || m._id || m.user || '').toString()
    );
    const fallbackFriends = getFallbackFriends().filter(
      (f) => !existingMemberIds.includes((f.id || f._id).toString())
    );
    setAddMemberFriends(fallbackFriends);
    setShowAddMemberModal(true);
    try {
      const res = await groupChatApi.getInvitableFriends(selectedGroupId);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setAddMemberFriends(res.data);
      } else if (fallbackFriends.length > 0) {
        setAddMemberFriends(fallbackFriends);
      }
    } catch (err) {
      console.warn('Tải bạn bè mời qua API gặp lỗi, dùng fallback:', err.message);
      if (fallbackFriends.length > 0) {
        setAddMemberFriends(fallbackFriends);
      }
    }
  };

  // Thêm thành viên vào nhóm
  const handleAddMembers = async () => {
    if (!addMemberSelected.length) { alert('Vui lòng chọn ít nhất 1 người'); return; }
    setAddingMembers(true);
    try {
      await groupChatApi.addMembers(
        selectedGroupId,
        addMemberSelected.map((f) => f.id || f._id)
      );
      setShowAddMemberModal(false);
      loadGroupMessages(selectedGroupId);
      loadGroups();
      alert(`✅ Đã thêm ${addMemberSelected.length} thành viên vào nhóm!`);
    } catch (err) {
      alert('Không thể thêm thành viên: ' + err.message);
    } finally {
      setAddingMembers(false);
    }
  };

  // Rời nhóm
  const handleLeaveGroup = async () => {
    if (!selectedGroupId) return;
    const currentGroup = groups.find((g) => g.groupId === selectedGroupId);
    if (!window.confirm(`Bạn có chắc muốn rời nhóm "${currentGroup?.name}"?`)) return;
    try {
      await groupChatApi.leaveGroup(selectedGroupId);
      setGroups((prev) => prev.filter((g) => g.groupId !== selectedGroupId));
      setSelectedGroupId(null);
      setGroupMessages([]);
      setGroupInfo(null);
      alert('Bạn đã rời nhóm thành công');
    } catch (err) {
      alert('Không thể rời nhóm: ' + err.message);
    }
  };

  // Filtered groups
  const filteredGroups = groups.filter((g) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return g.name?.toLowerCase().includes(q);
  });

  const activeGroup =
    groups.find(
      (g) => (g.groupId || g._id || g.id)?.toString() === selectedGroupId?.toString()
    ) || groupInfo;

  return (

    <div
      className="messages-container"
      style={{
        display: 'flex',
        height: 'calc(100vh - 120px)',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      }}
    >
      {/* ================= SIDEBAR TRÁI ================= */}
      <div
        className={`messages-sidebar${activeConversation ? ' hide-mobile' : ''}`}
        style={{
          width: '360px',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FAFAFA',
        }}
      >
        {/* Header sidebar */}
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: '900',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Tin nhắn Kết nối 💬
            </h2>
            <button
              onClick={() => loadAllData(true)}
              title="Làm mới"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: refreshing ? '#FF5722' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '6px',
              }}
            >
              <RefreshCw
                size={16}
                style={{
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </button>
          </div>

          {/* Ô tìm kiếm */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
            }}
          >
            <Search
              size={16}
              color="var(--text-muted)"
              style={{ marginRight: '8px', flexShrink: 0 }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm bạn bè, trường học..."
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '13px',
                backgroundColor: 'transparent',
              }}
            />
          </div>
        </div>

        {/* 3 Tabs Điều hướng */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Tab 1: Hội thoại */}
          <button
            onClick={() => setActiveTab('conversations')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '12.5px',
              fontWeight: activeTab === 'conversations' ? '800' : '600',
              color:
                activeTab === 'conversations'
                  ? '#FF5722'
                  : 'var(--text-secondary)',
              borderBottom:
                activeTab === 'conversations'
                  ? '3px solid #FF5722'
                  : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <span>Hội thoại</span>
            {conversations.length > 0 && (
              <span
                style={{
                  backgroundColor:
                    activeTab === 'conversations' ? '#FF5722' : '#E2E8F0',
                  color:
                    activeTab === 'conversations' ? '#FFFFFF' : '#475569',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {conversations.length}
              </span>
            )}
          </button>

          {/* Tab 2: Nhận được tim */}
          <button
            onClick={() => setActiveTab('received')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '12.5px',
              fontWeight: activeTab === 'received' ? '800' : '600',
              color:
                activeTab === 'received' ? '#E91E63' : 'var(--text-secondary)',
              borderBottom:
                activeTab === 'received'
                  ? '3px solid #E91E63'
                  : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <span>Thích bạn</span>
            {receivedLikes.length > 0 && (
              <span
                style={{
                  backgroundColor: '#E91E63',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {receivedLikes.length}
              </span>
            )}
          </button>

          {/* Tab 3: Đã gửi tim */}
          <button
            onClick={() => setActiveTab('sent')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '12.5px',
              fontWeight: activeTab === 'sent' ? '800' : '600',
              color: activeTab === 'sent' ? '#FF9800' : 'var(--text-secondary)',
              borderBottom:
                activeTab === 'sent'
                  ? '3px solid #FF9800'
                  : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <span>Đã gửi tim</span>
            {sentLikes.length > 0 && (
              <span
                style={{
                  backgroundColor:
                    activeTab === 'sent' ? '#FF9800' : '#E2E8F0',
                  color: activeTab === 'sent' ? '#FFFFFF' : '#475569',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {sentLikes.length}
              </span>
            )}
          </button>

          {/* Tab 4: Nhóm chat */}
          <button
            onClick={() => setActiveTab('groups')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '12.5px',
              fontWeight: activeTab === 'groups' ? '800' : '600',
              color: activeTab === 'groups' ? '#7C3AED' : 'var(--text-secondary)',
              borderBottom:
                activeTab === 'groups'
                  ? '3px solid #7C3AED'
                  : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s',
            }}
          >
            <Users size={13} />
            <span>Nhóm</span>
            {groups.length > 0 && (
              <span
                style={{
                  backgroundColor: activeTab === 'groups' ? '#7C3AED' : '#E2E8F0',
                  color: activeTab === 'groups' ? '#FFFFFF' : '#475569',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '1px 5px',
                  borderRadius: '10px',
                }}
              >
                {groups.length}
              </span>
            )}
          </button>
        </div>

        {/* Nội dung danh sách theo Tab */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* TAB 4: DANH SÁCH NHÓM CHAT */}
          {activeTab === 'groups' && (
            <div>
              {/* Nút tạo nhóm mới */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <button
                  onClick={openCreateGroupModal}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <Plus size={16} />
                  Tạo nhóm mới
                </button>
              </div>

              {/* Danh sách nhóm */}
              {filteredGroups.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Users size={40} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Chưa có nhóm nào
                  </p>
                  <p style={{ fontSize: '12px' }}>Tạo nhóm để học tập và chia sẻ cùng bạn bè!</p>
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const gId = group.groupId || group._id || group.id;
                  const isActive = gId?.toString() === selectedGroupId?.toString();
                  return (
                    <div
                      key={gId}
                      onClick={() => {
                        setSelectedGroupId(gId);
                        setSelectedMatchId(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        backgroundColor: isActive ? '#F5F0FF' : 'transparent',
                        borderLeft: isActive ? '3px solid #7C3AED' : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                        borderBottom: '1px solid var(--border-color)',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#F8F5FF'; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Group avatar */}
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, position: 'relative',
                      }}>
                        {group.avatar
                          ? <img src={group.avatar} alt={group.name} style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }} />
                          : <Users size={20} color="#FFFFFF" />
                        }
                      </div>
                      {/* Group info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: '700', color: isActive ? '#7C3AED' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                            {group.name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {formatTime(group.lastMessage?.createdAt || group.createdAt)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                            {group.lastMessage?.text || `${group.memberCount} thành viên`}
                          </span>
                          {group.unreadCount > 0 && (
                            <span style={{ backgroundColor: '#7C3AED', color: '#FFF', fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '10px', flexShrink: 0 }}>
                              {group.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 1: DANH SÁCH HỘI THOẠI ĐÃ KẾT BẠN */}
          {activeTab === 'conversations' && (
            <div>
              {loading && conversations.length === 0 ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <RefreshCw
                    size={24}
                    style={{
                      animation: 'spin 1s linear infinite',
                      marginBottom: '10px',
                      color: '#FF5722',
                    }}
                  />
                  <p style={{ fontSize: '13px' }}>Đang tải tin nhắn...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div
                  style={{
                    padding: '40px 24px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <MessageCircle
                    size={40}
                    color="#CBD5E1"
                    style={{ margin: '0 auto 12px' }}
                  />
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    Chưa có cuộc trò chuyện nào
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      lineHeight: '1.5',
                      marginBottom: '16px',
                    }}
                  >
                    Hãy vào mục Khám phá để quẹt tìm bạn học hợp gu và bắt đầu
                    trò chuyện nhé!
                  </p>
                  <Link
                    to="/user/discover"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#FF5722',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Khám phá bạn học</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              ) : (
                filteredConversations.map((chat) => {
                  const isSelected = chat.matchId === selectedMatchId;
                  const hasUnread = chat.unreadCount > 0;
                  const lastMsg = chat.lastMessage;

                  return (
                    <div
                      key={chat.matchId}
                      onClick={() => {
                        setSelectedMatchId(chat.matchId);
                        setSelectedGroupId(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: isSelected ? '#FFF3E0' : 'transparent',
                        borderLeft: isSelected
                          ? '4px solid #FF5722'
                          : '4px solid transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={getAvatarUrl(chat.buddy?.avatar)}
                          alt={chat.buddy?.fullName}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1.5px solid #FFCC80',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: getPresenceInfo(chat.buddy).dotColor,
                            border: '2px solid #FFFFFF',
                          }}
                        />
                      </div>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '3px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13.5px',
                                fontWeight: '800',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {chat.buddy?.fullName}
                            </span>
                            {Boolean(chat.buddy?.isVerifiedStudent || chat.buddy?.isPremium) && (
                              <CheckCircle2 size={13} color="#0284C7" />
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {lastMsg
                              ? formatTime(lastMsg.createdAt)
                              : formatTime(chat.matchedAt)}
                          </span>
                        </div>

                        {chat.buddy?.university && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#FF5722',
                              fontWeight: '700',
                              marginBottom: '2px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {chat.buddy.university}
                          </div>
                        )}

                        <div
                          style={{
                            fontSize: '12px',
                            color: hasUnread
                              ? 'var(--text-primary)'
                              : 'var(--text-secondary)',
                            fontWeight: hasUnread ? '700' : '400',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {lastMsg
                            ? (lastMsg.isFromMe ? 'Bạn: ' : '') + lastMsg.text
                            : '🎉 Kết bạn thành công! Bắt đầu trò chuyện'}
                        </div>
                      </div>

                      {hasUnread && (
                        <div
                          style={{
                            minWidth: '20px',
                            height: '20px',
                            borderRadius: '10px',
                            backgroundColor: '#FF5722',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 6px',
                          }}
                        >
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: NHỮNG NGƯỜI ĐÃ THÍCH BẠN */}
          {activeTab === 'received' && (
            <div style={{ padding: '12px' }}>
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                  paddingLeft: '4px',
                }}
              >
                Những bạn học này đã gửi lời thích đến bạn. Hãy bấm thích lại để
                kết nối ngay!
              </div>

              {filteredReceivedLikes.length === 0 ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Heart
                    size={36}
                    color="#F472B6"
                    style={{ margin: '0 auto 10px' }}
                  />
                  <p
                    style={{
                      fontSize: '13.5px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}
                  >
                    Chưa có lời thích mới
                  </p>
                  <p style={{ fontSize: '11.5px' }}>
                    Cập nhật hồ sơ sinh viên hấp dẫn để nhận thêm nhiều lời mời
                    học chung nhé!
                  </p>
                </div>
              ) : (
                filteredReceivedLikes.map((item) => (
                  <div
                    key={item.matchId}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      padding: '14px',
                      marginBottom: '10px',
                      border: '1px solid #FCE4EC',
                      boxShadow: '0 2px 8px rgba(233, 30, 99, 0.06)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '10px',
                      }}
                    >
                      <img
                        src={getAvatarUrl(item.buddy?.avatar)}
                        alt={item.buddy?.fullName}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #E91E63',
                        }}
                      />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {item.buddy?.fullName}
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.buddy?.university || 'Sinh viên'}{' '}
                          {item.buddy?.major ? `• ${item.buddy.major}` : ''}
                        </div>
                        <div
                          style={{
                            fontSize: '10.5px',
                            color: '#E91E63',
                            fontWeight: '600',
                            marginTop: '2px',
                          }}
                        >
                          Đã gửi thích {formatTime(item.createdAt)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptLike(item)}
                      disabled={actionLoadingId === item.matchId}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        backgroundColor: '#E91E63',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor:
                          actionLoadingId === item.matchId
                            ? 'not-allowed'
                            : 'pointer',
                        boxShadow: '0 3px 10px rgba(233, 30, 99, 0.3)',
                      }}
                    >
                      <Heart size={15} fill="#FFFFFF" />
                      <span>
                        {actionLoadingId === item.matchId
                          ? 'Đang kết nối...'
                          : 'Thích lại & Kết bạn 🎉'}
                      </span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: NHỮNG NGƯỜI BẠN ĐÃ GỬI TIM */}
          {activeTab === 'sent' && (
            <div style={{ padding: '12px' }}>
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                  paddingLeft: '4px',
                }}
              >
                Lời thích bạn đã gửi. Khi họ thích lại, bạn sẽ nhận được thông
                báo kết bạn!
              </div>

              {filteredSentLikes.length === 0 ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Clock
                    size={36}
                    color="#FDBA74"
                    style={{ margin: '0 auto 10px' }}
                  />
                  <p
                    style={{
                      fontSize: '13.5px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}
                  >
                    Chưa gửi lời thích nào
                  </p>
                  <p style={{ fontSize: '11.5px' }}>
                    Khám phá bạn học và thả tim người bạn muốn kết nối học chung!
                  </p>
                </div>
              ) : (
                filteredSentLikes.map((item) => (
                  <div
                    key={item.matchId}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      padding: '14px',
                      marginBottom: '10px',
                      border: '1px solid #FFF3E0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <img
                        src={getAvatarUrl(item.buddy?.avatar)}
                        alt={item.buddy?.fullName}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1.5px solid #FFB74D',
                        }}
                      />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {item.buddy?.fullName}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.buddy?.university || 'Sinh viên'}{' '}
                          {item.buddy?.major ? `• ${item.buddy.major}` : ''}
                        </div>
                        <div
                          style={{
                            fontSize: '10.5px',
                            color: '#FF9800',
                            fontWeight: '700',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={11} />
                          <span>Đang chờ bạn ấy phản hồi ⏳</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= KHUNG CHAT CHÍNH (BÊN PHẢI) ================= */}
      {!selectedGroupId && activeConversation ? (
        <div
          className="messages-chat-area"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Nút quay lại trên mobile */}
              <button
                className="messages-back-btn"
                onClick={() => setSelectedMatchId(null)}
                style={{
                  display: 'none',
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                }}
                aria-label="Quay lại danh sách tin nhắn"
              >
                <ArrowLeft size={20} />
              </button>

              <div style={{ position: 'relative' }}>
                <img
                  src={getAvatarUrl(activeConversation.buddy?.avatar)}
                  alt={activeConversation.buddy?.fullName}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid #FFCC80',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '11px',
                    height: '11px',
                    borderRadius: '50%',
                    backgroundColor: getPresenceInfo(activeConversation.buddy).dotColor,
                    border: '2px solid #FFFFFF',
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {activeConversation.buddy?.fullName}
                  </span>
                  {Boolean(activeConversation.buddy?.isVerifiedStudent || activeConversation.buddy?.isPremium) && (
                    <CheckCircle2 size={15} color="#0284C7" />
                  )}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#FF5722',
                    fontWeight: '600',
                  }}
                >
                  {activeConversation.buddy?.university || 'Đại học'}{' '}
                  {activeConversation.buddy?.major
                    ? `• ${activeConversation.buddy.major}`
                    : ''}{' '}
                  •{' '}
                  <span
                    style={{
                      color: getPresenceInfo(activeConversation.buddy).textColor,
                      fontWeight: getPresenceInfo(activeConversation.buddy).isOnline
                        ? '700'
                        : '600',
                    }}
                  >
                    {getPresenceInfo(activeConversation.buddy).statusText}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Nút rủ đi cafe & Xem địa điểm */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleQuickCoffeeInvite}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#FFF3E0',
                  color: '#FF5722',
                  border: '1px solid #FFCC80',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                <Coffee size={16} />
                <span>Rủ đi Cafe ☕</span>
              </button>

              <Link
                to="/user/venues"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  backgroundColor: '#F1F5F9',
                  color: 'var(--text-secondary)',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontWeight: '700',
                  textDecoration: 'none',
                }}
              >
                <MapPin size={14} />
                <span>Chọn quán</span>
              </Link>
            </div>
          </div>

          {/* Dòng chào mừng Match */}
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: '#FFF7ED',
              borderBottom: '1px solid #FFEDD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '12.5px',
              color: '#C2410C',
              fontWeight: '600',
            }}
          >
            <Sparkles size={16} color="#EA580C" />
            <span>
              🎉 Hai bạn đã được kết bạn thành công! Hãy gửi lời chào và hẹn
              cafe học bài cùng nhau nhé!
            </span>
          </div>

          {/* Message Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#F8FAFC',
            }}
          >
            {loadingMessages && messages.length === 0 ? (
              <div
                style={{
                  margin: 'auto',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <RefreshCw
                  size={24}
                  style={{
                    animation: 'spin 1s linear infinite',
                    marginBottom: '8px',
                    color: '#FF5722',
                  }}
                />
                <p style={{ fontSize: '12.5px' }}>Đang tải tin nhắn...</p>
              </div>
            ) : messages.length === 0 ? (
              <div
                style={{
                  margin: 'auto',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <Coffee
                  size={36}
                  color="#FDBA74"
                  style={{ margin: '0 auto 10px' }}
                />
                <p
                  style={{
                    fontSize: '13.5px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                  }}
                >
                  Chưa có tin nhắn nào
                </p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>
                  Hãy là người mở lời trước để bắt đầu cuộc trò chuyện thú vị! ✨
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                // Phân biệt chính xác tin nhắn của mình vs đối phương
                const senderId =
                  msg.sender?._id?.toString() ||
                  msg.sender?.id?.toString() ||
                  msg.sender?.toString();

                const isMe =
                  senderId === currentUserId ||
                  msg.sender === 'me' ||
                  msg.isFromMe === true;

                return (
                  <div
                    key={msg._id || index}
                    style={{
                      display: 'flex',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      alignItems: 'flex-end',
                      gap: '8px',
                    }}
                  >
                    {!isMe && (
                      <img
                        src={getAvatarUrl(msg.sender?.avatar || activeConversation.buddy?.avatar)}
                        alt="Avatar"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          marginBottom: '2px',
                        }}
                      />
                    )}

                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '11px 16px',
                        borderRadius: isMe
                          ? '18px 18px 4px 18px'
                          : '18px 18px 18px 4px',
                        backgroundColor: isMe ? '#FF5722' : '#FFFFFF',
                        color: isMe ? '#FFFFFF' : 'var(--text-primary)',
                        fontSize: '13.5px',
                        lineHeight: '1.5',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        border: isMe ? 'none' : '1px solid #E2E8F0',
                        wordBreak: 'break-word',
                      }}
                    >
                      {/* Media: Image */}
                      {Boolean(msg.fileUrl && (msg.type === 'image' || msg.fileUrl.match(/\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i))) && (
                        <div style={{ marginBottom: msg.text ? '8px' : '0' }}>
                          <img
                            src={msg.fileUrl}
                            alt={msg.fileName || 'Hình ảnh'}
                            onClick={() => setMediaPreviewModal({ isOpen: true, type: 'image', url: msg.fileUrl, name: msg.fileName })}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '260px',
                              borderRadius: '12px',
                              objectFit: 'cover',
                              cursor: 'pointer',
                              display: 'block',
                            }}
                          />
                        </div>
                      )}

                      {/* Media: Video */}
                      {Boolean(msg.fileUrl && (msg.type === 'video' || msg.fileUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i))) && (
                        <div style={{ marginBottom: msg.text ? '8px' : '0' }}>
                          <video
                            controls
                            src={msg.fileUrl}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '240px',
                              borderRadius: '12px',
                              display: 'block',
                              backgroundColor: '#000',
                            }}
                          />
                        </div>
                      )}

                      {/* Media: File / Document */}
                      {Boolean(msg.fileUrl && (msg.type === 'file' || (!msg.type && !msg.fileUrl.match(/\.(jpeg|jpg|png|gif|webp|mp4|webm|mov)(\?.*)?$/i)))) && (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={repairMojibake(msg.fileName || 'tai-lieu')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            backgroundColor: isMe ? 'rgba(255, 255, 255, 0.2)' : '#F8FAFC',
                            color: isMe ? '#FFFFFF' : '#0F172A',
                            textDecoration: 'none',
                            marginBottom: msg.text ? '8px' : '0',
                            border: isMe ? '1px solid rgba(255,255,255,0.35)' : '1px solid #E2E8F0',
                          }}
                        >
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: isMe ? '#FFFFFF' : '#FF5722',
                              color: isMe ? '#FF5722' : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={20} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {repairMojibake(msg.fileName || 'Tài liệu đính kèm')}
                            </div>
                            <div style={{ fontSize: '11px', opacity: 0.85 }}>
                              {msg.fileSize ? formatFileSize(msg.fileSize) : 'Tài liệu'}
                            </div>
                          </div>
                          <Download size={16} style={{ flexShrink: 0, opacity: 0.9 }} />
                        </a>
                      )}

                      {/* Text caption / body */}
                      {msg.text && <div>{msg.text}</div>}

                      <div
                        style={{
                          fontSize: '10px',
                          marginTop: '4px',
                          textAlign: 'right',
                          color: isMe
                            ? 'rgba(255,255,255,0.75)'
                            : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px',
                        }}
                      >
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMe && <CheckCheck size={13} />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Nhập Tin Nhắn & Đa Phương Tiện */}
          <div style={{ position: 'relative' }}>
            {/* Attachment preview bar */}
            {selectedAttachment && (
              <div
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FFF7ED',
                  borderTop: '1px solid #FED7AA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  {selectedAttachment.previewUrl && selectedAttachment.type === 'image' ? (
                    <img
                      src={selectedAttachment.previewUrl}
                      alt="Preview"
                      style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        backgroundColor: '#FFEDE5',
                        color: '#FF5722',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {selectedAttachment.type === 'video' ? <Video size={20} /> : <FileText size={20} />}
                    </div>
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#C2410C',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '260px',
                      }}
                    >
                      {selectedAttachment.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9A3412' }}>
                      {formatFileSize(selectedAttachment.size)} • {selectedAttachment.type === 'image' ? 'Hình ảnh' : selectedAttachment.type === 'video' ? 'Video' : 'Tài liệu'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAttachment(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#C2410C',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '50%',
                  }}
                  title="Hủy tệp đính kèm"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                style={{
                  position: 'absolute',
                  bottom: '72px',
                  left: '16px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                  border: '1px solid var(--border-color)',
                  width: '320px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  padding: '12px',
                  zIndex: 100,
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>Chọn Biểu Tượng / Icon</span>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={15} />
                  </button>
                </div>
                {EMOJI_CATEGORIES.map((cat) => (
                  <div key={cat.name} style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>{cat.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                      {cat.emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleSelectEmoji(emoji)}
                          style={{
                            fontSize: '20px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '8px',
                            transition: 'transform 0.1s, background-color 0.1s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e, 'image')}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e, 'video')}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e, 'file')}
            />

            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
              }}
            >
              {/* Media Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  title="Gửi hình ảnh"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: '#FFFFFF',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FF5722'; e.currentTarget.style.borderColor = '#FF5722'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  <ImageIcon size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  title="Gửi video"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: '#FFFFFF',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FF5722'; e.currentTarget.style.borderColor = '#FF5722'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  <Video size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Gửi tài liệu (PDF, Word, Excel...)"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: '#FFFFFF',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FF5722'; e.currentTarget.style.borderColor = '#FF5722'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  <Paperclip size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  title="Chọn biểu tượng / icon"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: showEmojiPicker ? '#FFF3E0' : '#FFFFFF',
                    color: showEmojiPicker ? '#FF5722' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FF5722'; }}
                  onMouseLeave={(e) => { if (!showEmojiPicker) e.currentTarget.style.color = '#64748B'; }}
                >
                  <Smile size={18} />
                </button>
              </div>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={selectedAttachment ? "Thêm chú thích cho file..." : "Nhập tin nhắn trò chuyện với bạn học..."}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--border-color)',
                  fontSize: '13.5px',
                  outline: 'none',
                  backgroundColor: '#F8FAFC',
                }}
              />

              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedAttachment) || sending || uploadingMedia}
                style={{
                  padding: '11px 20px',
                  borderRadius: '12px',
                  backgroundColor:
                    (!inputText.trim() && !selectedAttachment) || sending || uploadingMedia
                      ? '#CBD5E1'
                      : '#FF5722',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor:
                    (!inputText.trim() && !selectedAttachment) || sending || uploadingMedia
                      ? 'not-allowed'
                      : 'pointer',
                  boxShadow:
                    (!inputText.trim() && !selectedAttachment) || sending || uploadingMedia
                      ? 'none'
                      : '0 4px 12px rgba(255, 87, 34, 0.35)',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              >
                {uploadingMedia ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Tải file...</span>
                  </>
                ) : sending ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Gửi...</span>
                  </>
                ) : (
                  <>
                    <span>Gửi</span>
                    <Send size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : selectedGroupId && activeGroup ? (
        /* ====== GROUP CHAT PANEL ====== */
        <div
          className="messages-chat-area"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', position: 'relative' }}
        >
          {/* Group Chat Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => { setSelectedGroupId(null); setGroupMessages([]); setGroupInfo(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}
              >
                <ArrowLeft size={20} color="var(--text-secondary)" />
              </button>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #7C3AED, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {activeGroup.avatar
                  ? <img src={activeGroup.avatar} alt={activeGroup.name} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                  : <Users size={18} color="#FFFFFF" />}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeGroup.name}</div>
                <div style={{ fontSize: '12px', color: '#7C3AED', fontWeight: '600' }}>{activeGroup.memberCount} thành viên</div>
              </div>
            </div>
            {/* Group action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowGroupMembersModal(true)}
                title="Xem thành viên"
                style={{ background: '#F5F0FF', border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#7C3AED', fontSize: '12px', fontWeight: '700' }}
              >
                <Users size={15} /> Thành viên
              </button>
              <button
                onClick={openAddMemberModal}
                title="Thêm thành viên"
                style={{ background: '#F5F0FF', border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#7C3AED', fontSize: '12px', fontWeight: '700' }}
              >
                <UserPlus size={15} /> Thêm
              </button>
              <button
                onClick={handleLeaveGroup}
                title="Rời nhóm"
                style={{ background: '#FFF1F2', border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontSize: '12px', fontWeight: '700' }}
              >
                <LogOut size={15} /> Rời
              </button>
            </div>
          </div>

          {/* Group Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loadingGroupMessages ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#7C3AED' }} />
                <p style={{ marginTop: '10px', fontSize: '13px' }}>Đang tải tin nhắn nhóm...</p>
              </div>
            ) : groupMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
                <Users size={48} color="#DDD6FE" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Chưa có tin nhắn nào</p>
                <p style={{ fontSize: '12px' }}>Hãy bắt đầu cuộc trò chuyện trong nhóm!</p>
              </div>
            ) : (
              groupMessages.map((msg) => {
                const isSystem = msg.type === 'system';
                const isMe = msg.sender?._id?.toString() === currentUserId;

                if (isSystem) {
                  return (
                    <div key={msg._id} style={{ textAlign: 'center', margin: '8px 0' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: '#F1F5F9', padding: '4px 12px', borderRadius: '20px' }}>
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg._id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px', marginBottom: '2px' }}>
                    {!isMe && (
                      <img
                        src={getAvatarUrl(msg.sender?.avatar)}
                        alt={msg.sender?.fullName}
                        style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #E9D5FF' }}
                      />
                    )}
                    <div style={{ maxWidth: '65%' }}>
                      {!isMe && (
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#7C3AED', marginBottom: '3px', paddingLeft: '4px' }}>
                          {msg.sender?.fullName}
                        </div>
                      )}
                      <div
                        style={{
                          padding: msg.fileUrl && !msg.text ? '8px' : '10px 14px',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: isMe ? 'linear-gradient(135deg, #7C3AED, #A855F7)' : '#F3F4F6',
                          color: isMe ? '#FFFFFF' : '#1F2937',
                          fontSize: '13.5px',
                          lineHeight: '1.5',
                          wordBreak: 'break-word',
                        }}
                      >
                        {/* Image */}
                        {msg.fileUrl && (msg.type === 'image' || msg.fileUrl.match(/\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i)) && (
                          <div style={{ marginBottom: msg.text ? '8px' : '0' }}>
                            <img src={msg.fileUrl} alt={msg.fileName || 'Hình ảnh'} onClick={() => setMediaPreviewModal({ isOpen: true, type: 'image', url: msg.fileUrl, name: msg.fileName })} style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', display: 'block' }} />
                          </div>
                        )}
                        {/* Video */}
                        {msg.fileUrl && (msg.type === 'video' || msg.fileUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i)) && (
                          <div style={{ marginBottom: msg.text ? '8px' : '0' }}>
                            <video controls src={msg.fileUrl} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '10px', display: 'block', backgroundColor: '#000' }} />
                          </div>
                        )}
                        {/* File */}
                        {msg.fileUrl && msg.type === 'file' && (
                          <a href={getDownloadUrl(msg.fileUrl, msg.fileName)} target="_blank" rel="noopener noreferrer" download={repairMojibake(msg.fileName || 'tai-lieu')} onClick={(e) => handleDownloadFile(e, msg.fileUrl, msg.fileName)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : '#F8FAFC', color: isMe ? '#FFF' : '#0F172A', textDecoration: 'none', border: isMe ? '1px solid rgba(255,255,255,0.3)' : '1px solid #E2E8F0', marginBottom: msg.text ? '8px' : '0' }}>
                            <FileText size={18} />
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '700', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repairMojibake(msg.fileName || 'Tài liệu')}</div>
                              {msg.fileSize && <div style={{ fontSize: '10px', opacity: 0.75 }}>{formatFileSize(msg.fileSize)}</div>}
                            </div>
                            <Download size={14} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                          </a>
                        )}
                        {/* Text */}
                        {msg.text && <span>{msg.text}</span>}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px', textAlign: isMe ? 'right' : 'left', paddingLeft: '4px', paddingRight: '4px' }}>
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={groupMessagesEndRef} />
          </div>

          {/* Group attachment preview */}
          {groupAttachment && (
            <div style={{ padding: '10px 18px', backgroundColor: '#FFF7ED', borderTop: '1px solid #FDBA74', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                {groupAttachment.type === 'image' && groupAttachment.previewUrl ? (
                  <img src={groupAttachment.previewUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', backgroundColor: '#7C3AED', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {groupAttachment.type === 'video' ? <Video size={20} /> : <FileText size={20} />}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#C2410C', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{groupAttachment.name}</div>
                  <div style={{ fontSize: '11px', color: '#9A3412' }}>{formatFileSize(groupAttachment.size)}</div>
                </div>
              </div>
              <button onClick={() => setGroupAttachment(null)} style={{ background: 'none', border: 'none', color: '#C2410C', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
          )}

          {/* Group Emoji Picker */}
          {groupEmojiPicker && (
            <div ref={groupEmojiPickerRef} style={{ position: 'absolute', bottom: '72px', left: '16px', backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', border: '1px solid var(--border-color)', width: '300px', maxHeight: '250px', overflowY: 'auto', padding: '12px', zIndex: 100 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800' }}>Biểu tượng</span>
                <button onClick={() => setGroupEmojiPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
              </div>
              {EMOJI_CATEGORIES.map((cat) => (
                <div key={cat.name} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{cat.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '3px' }}>
                    {cat.emojis.map((emoji) => (
                      <button key={emoji} onClick={() => setGroupInputText((p) => p + emoji)} style={{ fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer', padding: '3px', borderRadius: '6px' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>{emoji}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hidden file inputs for group */}
          <input ref={groupImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleGroupFileSelect(e, 'image')} />
          <input ref={groupVideoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleGroupFileSelect(e, 'video')} />
          <input ref={groupFileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" style={{ display: 'none' }} onChange={(e) => handleGroupFileSelect(e, 'file')} />

          {/* Group message input */}
          <form onSubmit={handleSendGroupMessage} style={{ padding: '12px 18px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button type="button" onClick={() => groupImageInputRef.current?.click()} title="Gửi hình ảnh" style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#FFFFFF', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ImageIcon size={16} />
              </button>
              <button type="button" onClick={() => groupVideoInputRef.current?.click()} title="Gửi video" style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#FFFFFF', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Video size={16} />
              </button>
              <button type="button" onClick={() => groupFileInputRef.current?.click()} title="Gửi tài liệu" style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#FFFFFF', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Paperclip size={16} />
              </button>
              <button type="button" onClick={() => setGroupEmojiPicker((p) => !p)} title="Emoji" style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border-color)', background: groupEmojiPicker ? '#F5F0FF' : '#FFFFFF', color: groupEmojiPicker ? '#7C3AED' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Smile size={16} />
              </button>
            </div>
            <input
              type="text"
              value={groupInputText}
              onChange={(e) => setGroupInputText(e.target.value)}
              placeholder={`Nhắn tin vào nhóm ${activeGroup.name}...`}
              style={{ flex: 1, padding: '10px 16px', borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '13.5px', outline: 'none', backgroundColor: '#F8FAFC' }}
            />
            <button
              type="submit"
              disabled={(!groupInputText.trim() && !groupAttachment) || sendingGroup}
              style={{ padding: '10px 16px', borderRadius: '12px', backgroundColor: (!groupInputText.trim() && !groupAttachment) || sendingGroup ? '#CBD5E1' : '#7C3AED', color: '#FFFFFF', fontWeight: '700', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: (!groupInputText.trim() && !groupAttachment) || sendingGroup ? 'not-allowed' : 'pointer', flexShrink: 0, boxShadow: (!groupInputText.trim() && !groupAttachment) || sendingGroup ? 'none' : '0 4px 12px rgba(124,58,237,0.35)' }}
            >
              {sendingGroup ? <Loader2 size={15} className="spinner" /> : <><span>Gửi</span><Send size={15} /></>}
            </button>
          </form>
        </div>
      ) : (
        /* Empty placeholder khi không có chat nào */
        <div
          className="messages-empty-state"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundColor: '#F8FAFC',
            color: 'var(--text-muted)',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <MessageCircle
            size={56}
            color="#CBD5E1"
            style={{ marginBottom: '16px' }}
          />
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '800',
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}
          >
            Chọn một cuộc hội thoại
          </h3>
          <p style={{ fontSize: '13px', maxWidth: '340px', lineHeight: '1.5' }}>
            Bắt đầu trò chuyện, chia sẻ tài liệu và hẹn bạn học đi cafe cày
            deadline cùng UNI-MATE.
          </p>
        </div>
      )}

      {/* Lightbox Preview Modal cho ảnh phóng to */}
      {mediaPreviewModal?.isOpen && (
        <div
          onClick={() => setMediaPreviewModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => setMediaPreviewModal(null)}
              style={{
                position: 'absolute',
                top: '-45px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
            >
              <X size={22} />
            </button>
            <img
              src={mediaPreviewModal.url}
              alt={mediaPreviewModal.name || 'Ảnh chi tiết'}
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                borderRadius: '16px',
                objectFit: 'contain',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            />
            {mediaPreviewModal.name && (
              <div
                style={{
                  marginTop: '12px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '600',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                {repairMojibake(mediaPreviewModal.name)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== MODAL TẠO NHÓM ====== */}
      {showCreateGroupModal && (
        <div
          onClick={() => setShowCreateGroupModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.15s ease-out' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '460px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="#7C3AED" /> Tạo nhóm mới
              </h3>
              <button onClick={() => setShowCreateGroupModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {/* Group name input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Tên nhóm *</label>
                <input
                  type="text"
                  value={createGroupName}
                  onChange={(e) => setCreateGroupName(e.target.value)}
                  placeholder="VD: Nhóm học Toán, Cafe chill deadline..."
                  maxLength={100}
                  style={{ width: '100%', padding: '11px 16px', borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={(e) => (e.target.style.borderColor = '#7C3AED')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
                />
              </div>

              {/* Friend selection */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Thêm thành viên từ bạn bè {createGroupSelected.length > 0 && <span style={{ color: '#7C3AED' }}>({createGroupSelected.length} đã chọn)</span>}
                </label>
                {createGroupFriends.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
                    <p style={{ fontSize: '13px' }}>Chưa có bạn bè để mời. Hãy kết bạn với ai đó trước!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                    {createGroupFriends.map((friend) => {
                      const fId = friend.id || friend._id;
                      const isSelected = createGroupSelected.some((f) => (f.id || f._id) === fId);
                      return (
                        <div
                          key={fId}
                          onClick={() => toggleFriendSelection(friend, createGroupSelected, setCreateGroupSelected)}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '12px', border: `2px solid ${isSelected ? '#7C3AED' : 'var(--border-color)'}`, backgroundColor: isSelected ? '#F5F0FF' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                          <img src={getAvatarUrl(friend.avatar)} alt={friend.fullName} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E9D5FF' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: isSelected ? '#7C3AED' : 'var(--text-primary)' }}>{friend.fullName}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{friend.university || ''}{friend.major ? ` • ${friend.major}` : ''}</div>
                          </div>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: isSelected ? '#7C3AED' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isSelected && <span style={{ color: '#FFF', fontSize: '13px', fontWeight: '800' }}>✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid var(--border-color)', background: '#FFFFFF', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!createGroupName.trim() || creatingGroup}
                style={{ flex: 2, padding: '11px', borderRadius: '12px', border: 'none', background: !createGroupName.trim() || creatingGroup ? '#CBD5E1' : 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#FFFFFF', fontSize: '14px', fontWeight: '800', cursor: !createGroupName.trim() || creatingGroup ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {creatingGroup ? <><Loader2 size={15} className="spinner" />Đang tạo...</> : <><Plus size={15} />Tạo nhóm ({createGroupSelected.length + 1} người)</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL THÊM THÀNH VIÊN ====== */}
      {showAddMemberModal && (
        <div
          onClick={() => setShowAddMemberModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.15s ease-out' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '440px', maxHeight: '75vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="#7C3AED" /> Thêm thành viên
              </h3>
              <button onClick={() => setShowAddMemberModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {addMemberFriends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '13px' }}>Tất cả bạn bè của bạn đã có trong nhóm!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {addMemberFriends.map((friend) => {
                    const fId = friend.id || friend._id;
                    const isSelected = addMemberSelected.some((f) => (f.id || f._id) === fId);
                    return (
                      <div
                        key={fId}
                        onClick={() => toggleFriendSelection(friend, addMemberSelected, setAddMemberSelected)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '12px', border: `2px solid ${isSelected ? '#7C3AED' : 'var(--border-color)'}`, backgroundColor: isSelected ? '#F5F0FF' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s' }}
                      >
                        <img src={getAvatarUrl(friend.avatar)} alt={friend.fullName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: isSelected ? '#7C3AED' : 'var(--text-primary)' }}>{friend.fullName}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{friend.university || 'Sinh viên'}</div>
                        </div>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: isSelected ? '#7C3AED' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isSelected && <span style={{ color: '#FFF', fontSize: '13px', fontWeight: '800' }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddMemberModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid var(--border-color)', background: '#FFF', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Hủy</button>
              <button
                onClick={handleAddMembers}
                disabled={!addMemberSelected.length || addingMembers}
                style={{ flex: 2, padding: '11px', borderRadius: '12px', border: 'none', background: !addMemberSelected.length || addingMembers ? '#CBD5E1' : 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#FFF', fontSize: '14px', fontWeight: '800', cursor: !addMemberSelected.length || addingMembers ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {addingMembers ? <Loader2 size={15} className="spinner" /> : <UserPlus size={15} />}
                {addingMembers ? 'Đang thêm...' : 'Thêm thành viên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DANH SACH THANH VIEN */}
      {showGroupMembersModal && activeGroup && (
        <div
          onClick={() => setShowGroupMembersModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '400px', maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-primary)' }}>
                Thành viên nhóm ({activeGroup.memberCount})
              </h3>
              <button onClick={() => setShowGroupMembersModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {(groupInfo?.members || activeGroup.members || []).map((member) => {
                const memberId = member.id || member._id || member.user;
                const isAdmin = member.role === 'admin';
                return (
                  <div key={memberId?.toString()} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <img src={getAvatarUrl(member.avatar)} alt={member.fullName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: isAdmin ? '2px solid #7C3AED' : '2px solid #E2E8F0' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {member.fullName}
                        {isAdmin && <span style={{ fontSize: '10px', backgroundColor: '#F5F0FF', color: '#7C3AED', padding: '2px 7px', borderRadius: '10px', fontWeight: '800' }}>Admin</span>}
                        {memberId?.toString() === currentUserId && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>(Bạn)</span>}
                      </div>
                      {member.university && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{member.university}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => { setShowGroupMembersModal(false); openAddMemberModal(); }} style={{ width: '100%', padding: '11px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#FFF', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <UserPlus size={16} /> Thêm thành viên mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
