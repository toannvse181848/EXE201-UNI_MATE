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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { chatApi, matchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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

// Fallback demo conversations nếu chưa có dữ liệu thật từ backend
const DEMO_CONVERSATIONS = [
  {
    matchId: 'demo_m1',
    matchedAt: new Date(Date.now() - 3600000).toISOString(),
    buddy: {
      id: 'demo_u1',
      fullName: 'Lê Minh Thảo',
      university: 'Đại học FPT TP.HCM',
      major: 'Truyền thông Đa phương tiện',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
    },
    lastMessage: {
      text: 'Okie bạn nè, hẹn 2h chiều mai ở The Coffee House Sư Vạn Hạnh nhé! ☕',
      isFromMe: false,
      createdAt: new Date(Date.now() - 900000).toISOString(),
      isRead: false,
    },
    unreadCount: 1,
  },
  {
    matchId: 'demo_m2',
    matchedAt: new Date(Date.now() - 86400000).toISOString(),
    buddy: {
      id: 'demo_u2',
      fullName: 'Trần Quốc Bảo',
      university: 'ĐH Bách Khoa TP.HCM',
      major: 'Khoa học Máy tính',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
    },
    lastMessage: {
      text: 'Tối nay bạn có cày LeetCode ở Cheese Coffee không?',
      isFromMe: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      isRead: true,
    },
    unreadCount: 0,
  },
];

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

      // Nếu có dữ liệu thật thì dùng dữ liệu thật, nếu rỗng và chưa có token thì dự phòng demo
      if (realConvs.length > 0 || realSent.length > 0 || realReceived.length > 0) {
        setConversations(realConvs);
        setSentLikes(realSent);
        setReceivedLikes(realReceived);

        // Tự động chọn hội thoại đầu tiên nếu chưa chọn
        if (!selectedMatchId && realConvs.length > 0) {
          setSelectedMatchId(realConvs[0].matchId);
        }
      } else {
        // Fallback demo để giao diện luôn trực quan
        setConversations(DEMO_CONVERSATIONS);
        if (!selectedMatchId) {
          setSelectedMatchId(DEMO_CONVERSATIONS[0].matchId);
        }
      }
    } catch (err) {
      console.log('Lỗi tải dữ liệu chat:', err.message);
      setConversations(DEMO_CONVERSATIONS);
      if (!selectedMatchId) setSelectedMatchId(DEMO_CONVERSATIONS[0].matchId);
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

      // Xử lý demo conversation
      if (matchId.startsWith('demo_')) {
        const demoChat = DEMO_CONVERSATIONS.find((c) => c.matchId === matchId);
        if (demoChat) {
          setMessages([
            {
              _id: 'd1',
              sender: { _id: demoChat.buddy.id, fullName: demoChat.buddy.fullName },
              text: `Chào bạn! Mình là ${demoChat.buddy.fullName}, rất vui được kết nối cùng bạn nhé! ✨`,
              createdAt: demoChat.matchedAt,
            },
            {
              _id: 'd2',
              sender: { _id: currentUserId || 'me', fullName: user?.name || 'Tôi' },
              text: 'Chào bạn! Mình cũng rất vui được kết nối.',
              createdAt: new Date(Date.now() - 1200000).toISOString(),
            },
            {
              _id: 'd3',
              sender: { _id: demoChat.buddy.id, fullName: demoChat.buddy.fullName },
              text: demoChat.lastMessage.text,
              createdAt: demoChat.lastMessage.createdAt,
            },
          ]);
        }
        return;
      }

      try {
        if (!isPolling) setLoadingMessages(true);
        const res = await chatApi.getMessages(matchId);
        const list = res.data || [];
        setMessages(list);
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

  // 5. Gửi tin nhắn
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || sending || !selectedMatchId) return;

    setInputText('');
    setSending(true);

    // Optimistic UI update
    const tempMsg = {
      _id: 'temp_' + Date.now(),
      text,
      sender: {
        _id: currentUserId,
        fullName: user?.name || user?.fullName || 'Tôi',
      },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    // Update conversation snippet in sidebar
    setConversations((prev) =>
      prev.map((c) =>
        c.matchId === selectedMatchId
          ? {
              ...c,
              lastMessage: {
                text,
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
      const res = await chatApi.sendMessage(selectedMatchId, text);
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
                          src={
                            chat.buddy?.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                          }
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
                            backgroundColor: '#22C55E',
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
                            <CheckCircle2 size={13} color="#0284C7" />
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
                        src={
                          item.buddy?.avatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                        }
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
                        src={
                          item.buddy?.avatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                        }
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
              padding: '14px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={
                    activeConversation.buddy?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                  }
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
                    backgroundColor: '#22C55E',
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
                  <CheckCircle2 size={15} color="#0284C7" />
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
                  • <span style={{ color: '#16A34A' }}>Đang trực tuyến 🟢</span>
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
                        src={
                          msg.sender?.avatar ||
                          activeConversation.buddy?.avatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                        }
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
                        maxWidth: '65%',
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
                      <div>{msg.text}</div>
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

          {/* Form Nhập Tin Nhắn */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập tin nhắn trò chuyện với bạn học..."
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '12px',
                border: '1.5px solid var(--border-color)',
                fontSize: '13.5px',
                outline: 'none',
                backgroundColor: '#F8FAFC',
              }}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor:
                  !inputText.trim() || sending ? '#CBD5E1' : '#FF5722',
                color: '#FFFFFF',
                fontWeight: '700',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor:
                  !inputText.trim() || sending ? 'not-allowed' : 'pointer',
                boxShadow:
                  !inputText.trim() || sending
                    ? 'none'
                    : '0 4px 12px rgba(255, 87, 34, 0.35)',
                transition: 'all 0.15s',
              }}
            >
              <span>{sending ? 'Đang gửi...' : 'Gửi'}</span>
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        /* Empty placeholder khi không có chat nào */
        <div
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
    </div>
  );
}

