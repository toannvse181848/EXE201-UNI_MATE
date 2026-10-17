import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const NEAR_BOTTOM_PX = 120; // cách đáy < 120px thì coi như đang xem tin mới nhất
const SHOW_JUMP_PX = 300; // cách đáy > 300px thì hiện nút "Về tin nhắn mới nhất"
const LOAD_OLDER_PX = 80; // cách đỉnh < 80px thì tải thêm tin cũ

const getSenderId = (msg) => (msg?.sender?._id || msg?.sender?.id || msg?.sender)?.toString();

/**
 * Quản lý cuộn của khung chat:
 * - Chỉ tự cuộn xuống khi có tin mới VÀ đang ở gần cuối (hoặc chính mình vừa gửi).
 *   Polling tải lại mà không có tin mới thì giữ nguyên chỗ đang xem.
 * - Kéo lên gần đỉnh thì gọi onReachTop (tải tin cũ); sau khi chèn tin cũ vẫn giữ nguyên đoạn đang xem.
 * - Trả về trạng thái để hiện nút "Về tin nhắn mới nhất" / "N tin nhắn mới".
 *
 * resetKey: id hội thoại/nhóm đang mở — đổi thì coi như mở mới và cuộn xuống cuối.
 */
export default function useChatScroll({ messages, resetKey, currentUserId, onReachTop }) {
  const containerRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const nearBottomRef = useRef(true);
  const prependSnapshotRef = useRef(null);
  const onReachTopRef = useRef(onReachTop);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    onReachTopRef.current = onReachTop;
  });

  // Ảnh/video tải xong làm khung cao thêm → nếu đang ở cuối thì bám theo đáy
  const handleMediaLoad = useCallback(() => {
    const el = containerRef.current;
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, []);

  // Callback ref: gắn/gỡ listener khi khung chat được mount/unmount
  const setContainer = useCallback(
    (el) => {
      containerRef.current?.removeEventListener('load', handleMediaLoad, true);
      containerRef.current = el;
      el?.addEventListener('load', handleMediaLoad, true);
    },
    [handleMediaLoad]
  );

  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setUnseenCount(0);
  }, []);

  // Đổi hội thoại → lần nhận tin kế tiếp coi như mở mới
  useEffect(() => {
    lastMessageIdRef.current = null;
    nearBottomRef.current = true;
    prependSnapshotRef.current = null;
    setIsScrolledUp(false);
    setUnseenCount(0);
  }, [resetKey]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Vừa chèn tin cũ lên đầu → bù chiều cao để giữ nguyên đoạn đang xem
    const snapshot = prependSnapshotRef.current;
    if (snapshot && messages[0]?._id !== snapshot.firstMessageId) {
      el.scrollTop = el.scrollHeight - snapshot.scrollHeight + snapshot.scrollTop;
      prependSnapshotRef.current = null;
      return;
    }

    const last = messages[messages.length - 1];
    if (!last || last._id === lastMessageIdRef.current) return; // không có tin mới → không cuộn
    const prevLastId = lastMessageIdRef.current;
    lastMessageIdRef.current = last._id;

    if (prevLastId === null) {
      el.scrollTop = el.scrollHeight; // vừa mở hội thoại
      return;
    }
    if (nearBottomRef.current || getSenderId(last) === currentUserId) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      return;
    }
    // Đang kéo lên xem tin cũ → không kéo xuống, chỉ báo có tin mới
    const prevIndex = messages.findIndex((m) => m._id === prevLastId);
    setUnseenCount((n) => n + (prevIndex >= 0 ? messages.length - 1 - prevIndex : 1));
  }, [messages, currentUserId]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;
    setIsScrolledUp(distanceFromBottom > SHOW_JUMP_PX);
    if (nearBottomRef.current) setUnseenCount(0);
    if (el.scrollTop < LOAD_OLDER_PX) onReachTopRef.current?.();
  }, []);

  // Gọi ngay trước khi chèn tin cũ lên đầu danh sách
  const markPrepend = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    prependSnapshotRef.current = {
      scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop,
      firstMessageId: messages[0]?._id,
    };
  }, [messages]);

  return {
    containerRef: setContainer,
    handleScroll,
    scrollToBottom,
    markPrepend,
    showJumpButton: isScrolledUp || unseenCount > 0,
    unseenCount,
  };
}

// Polling chỉ lấy trang tin mới nhất → giữ lại các tin cũ đã tải thêm khi kéo lên
export const mergeLatestMessages = (prev, latest) => {
  if (latest.length === 0) return latest;
  const oldestLatestTime = new Date(latest[0].createdAt).getTime();
  const olderLoaded = prev.filter(
    (m) => !String(m._id).startsWith('temp_') && new Date(m.createdAt).getTime() < oldestLatestTime
  );
  return olderLoaded.length > 0 ? [...olderLoaded, ...latest] : latest;
};

// Chèn tin cũ vừa tải lên đầu, bỏ tin trùng
export const prependOlderMessages = (prev, older) => {
  const existingIds = new Set(prev.map((m) => m._id));
  return [...older.filter((m) => !existingIds.has(m._id)), ...prev];
};
