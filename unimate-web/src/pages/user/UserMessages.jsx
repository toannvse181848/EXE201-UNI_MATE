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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { chatApi, matchApi } from '../../services/api';
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

  // Tabs: 'conversations' | 'received' | 'sent'
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversations, setConversations] = useState([]);
  const [sentLikes, setSentLikes] = useState([]);
  const [receivedLikes, setReceivedLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active chat
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
      if (!selectedMatchId && realConvs.length > 0) {
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
    conversations[0];

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
      fileName: uploadedFile ? uploadedFile.fileName : null,
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

  // 6. Xử lý khi bấm thích lại người đã thích mình -> Ghép đôi thành công!
  const handleAcceptLike = async (item) => {
    const buddyId = item.buddy?.id || item.buddy?._id;
    if (!buddyId) return;

    try {
      setActionLoadingId(item.matchId);
      const res = await matchApi.swipe(buddyId, 'like');
      const isMatch = res?.isMatch ?? true;

      alert(
        `🎉 Ghép đôi thành công!\nBạn và ${item.buddy?.fullName} đã thích nhau. Hãy bắt đầu trò chuyện ngay nhé! ☕`
      );

      // Tải lại dữ liệu và chuyển ngay sang tab Hội thoại
      await loadAllData(true);
      setActiveTab('conversations');
      setSelectedMatchId(item.matchId);
    } catch (err) {
      console.error('Lỗi khi chấp nhận thích:', err);
      alert('Không thể hoàn tất ghép đôi. Vui lòng thử lại.');
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
        </div>

        {/* Nội dung danh sách theo Tab */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* TAB 1: DANH SÁCH HỘI THOẠI ĐÃ GHÉP ĐÔI */}
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
                      onClick={() => setSelectedMatchId(chat.matchId)}
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
                            : '🎉 Ghép đôi thành công! Bắt đầu trò chuyện'}
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
                          : 'Thích lại & Ghép đôi 🎉'}
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
                báo ghép đôi!
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
      {activeConversation ? (
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
              🎉 Hai bạn đã được ghép đôi thành công! Hãy gửi lời chào và hẹn
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
                          download={msg.fileName || 'tai-lieu'}
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
                              {msg.fileName || 'Tài liệu đính kèm'}
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
                  padding: '11px 18px',
                  borderRadius: '12px',
                  backgroundColor:
                    (!inputText.trim() && !selectedAttachment) || sending || uploadingMedia ? '#CBD5E1' : '#FF5722',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor:
                    (!inputText.trim() && !selectedAttachment) || sending || uploadingMedia ? 'not-allowed' : 'pointer',
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
                {mediaPreviewModal.name}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

