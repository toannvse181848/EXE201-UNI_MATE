import React, { useState } from 'react';
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
} from 'lucide-react';

const INITIAL_CONVERSATIONS = [
  {
    id: 'c1',
    name: 'Lê Minh Thảo',
    university: 'Đại học FPT TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
    lastMessage: 'Okie bạn nè, hẹn 2h chiều mai ở The Coffee House Sư Vạn Hạnh nhé! ☕',
    time: '14:25',
    unread: 1,
    online: true,
    messages: [
      { id: 1, sender: 'them', text: 'Chào Toàn nhé! Mình thấy bạn cũng đang làm đồ án React à?', time: '14:10' },
      { id: 2, sender: 'me', text: 'Chào Thảo! Đúng rồi nè, mình đang cày deadline môn EXE201.', time: '14:15' },
      { id: 3, sender: 'them', text: 'Hay quá, chiều mai bạn có rảnh ra quán cafe gần trường ngồi chung không? Mình đang có voucher giảm 25% nè.', time: '14:20' },
      { id: 4, sender: 'me', text: 'Tuyệt vời, vậy hẹn 2h chiều mai ở The Coffee House Sư Vạn Hạnh nhé!', time: '14:22' },
      { id: 5, sender: 'them', text: 'Okie bạn nè, hẹn 2h chiều mai ở The Coffee House Sư Vạn Hạnh nhé! ☕', time: '14:25' },
    ],
  },
  {
    id: 'c2',
    name: 'Trần Quốc Bảo',
    university: 'ĐH Bách Khoa TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
    lastMessage: 'Tối nay bạn có cày LeetCode ở Cheese Coffee không?',
    time: 'Hôm qua',
    unread: 0,
    online: false,
    messages: [
      { id: 1, sender: 'them', text: 'Tối nay bạn có cày LeetCode ở Cheese Coffee không?', time: '20:15' },
    ],
  },
  {
    id: 'c3',
    name: 'Nguyễn Hà My',
    university: 'ĐH Kinh Tế (UEH)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    lastMessage: 'Cảm ơn bạn đã share list quán cafe yên tĩnh cho mình nha!',
    time: '18/09',
    unread: 0,
    online: true,
    messages: [
      { id: 1, sender: 'them', text: 'Cảm ơn bạn đã share list quán cafe yên tĩnh cho mình nha!', time: '15:30' },
    ],
  },
];

export default function UserMessages() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedChatId, setSelectedChatId] = useState('c1');
  const [inputText, setInputText] = useState('');

  const activeChat = conversations.find((c) => c.id === selectedChatId) || conversations[0];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      text: inputText,
      time: 'Bây giờ',
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            lastMessage: inputText,
            time: 'Bây giờ',
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      })
    );
    setInputText('');
  };

  const handleQuickCoffeeInvite = () => {
    const inviteText = '☕ Mình vừa gửi bạn lời mời đi cafe học bài kèm voucher giảm giá. Xem trong tab Ví Voucher nhé!';
    setInputText(inviteText);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 128px)',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      {/* Sidebar: Match / Conversations list */}
      <div
        style={{
          width: '320px',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FAFAFA',
        }}
      >
        <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Tin nhắn Kết nối 💬
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
            }}
          >
            <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Tìm bạn bè, trường học..."
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '12.5px' }}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.map((chat) => {
            const isSelected = chat.id === selectedChatId;
            return (
              <div
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderBottom: '1px solid #F1F5F9',
                  backgroundColor: isSelected ? '#F0FDFA' : 'transparent',
                  borderLeft: isSelected ? '4px solid #0D9488' : '4px solid transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  {chat.online && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        border: '2px solid #FFFFFF',
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {chat.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {chat.time}
                    </span>
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#0D9488', fontWeight: '600', marginBottom: '2px' }}>
                    {chat.university.split(' ')[0]}
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: chat.unread ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: chat.unread ? '700' : '400',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {chat.lastMessage}
                  </div>
                </div>

                {chat.unread > 0 && (
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#0D9488',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {chat.unread}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main: Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
        {/* Chat header */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={activeChat.avatar}
              alt={activeChat.name}
              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {activeChat.name}
              </div>
              <div style={{ fontSize: '12px', color: '#0D9488', fontWeight: '600' }}>
                {activeChat.university} • {activeChat.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleQuickCoffeeInvite}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                backgroundColor: '#F0FDFA',
                color: '#0D9488',
                border: '1px solid #99F6E4',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <Coffee size={15} />
              <span>Hẹn đi Cafe</span>
            </button>
          </div>
        </div>

        {/* Message bubble stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {activeChat.messages.map((msg) => {
            const isMe = msg.sender === 'me';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '65%',
                    padding: '12px 16px',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: isMe ? '#0D9488' : '#F1F5F9',
                    color: isMe ? '#FFFFFF' : 'var(--text-primary)',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  <div>{msg.text}</div>
                  <div
                    style={{
                      fontSize: '10px',
                      marginTop: '4px',
                      textAlign: 'right',
                      color: isMe ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px',
                    }}
                  >
                    <span>{msg.time}</span>
                    {isMe && <CheckCheck size={12} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input Box */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#FAFAFA',
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhập tin nhắn trò chuyện với bạn học..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1.5px solid var(--border-color)',
              fontSize: '13.5px',
              outline: 'none',
              backgroundColor: '#FFFFFF',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              backgroundColor: '#0D9488',
              color: '#FFFFFF',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)',
            }}
          >
            <span>Gửi</span>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
