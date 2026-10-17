// Sự kiện trang tin nhắn phát ra khi số tin chưa đọc thay đổi (vd: vừa mở một hội thoại),
// để UserLayout cập nhật badge sidebar + tiêu đề tab ngay thay vì chờ lần polling kế tiếp.
export const UNREAD_CHANGED_EVENT = 'unimate:unread-changed';
