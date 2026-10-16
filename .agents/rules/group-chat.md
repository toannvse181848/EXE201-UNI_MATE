# Quy định Hệ thống Nhóm Chat (UNI-MATE Group Chat Guidelines)

## 1. Yêu cầu Tính năng Nhóm Chat
Hệ thống Chat của UNI-MATE hỗ trợ cả trò chuyện 1-1 và Nhóm chat (Group Chat) giữa các sinh viên:
- **Tạo nhóm chat**:
  - Người dùng có thể tạo nhóm chat mới bằng cách đặt tên nhóm và chọn các thành viên ban đầu từ danh sách bạn bè đã ghép đôi/kết bạn (`matched`).
- **Cơ chế thêm thành viên linh hoạt**:
  - Bất kỳ thành viên nào hiện đang có mặt trong nhóm chat đều có quyền thêm thành viên mới vào nhóm từ danh sách bạn bè của họ.
  - Tránh thêm trùng lặp các thành viên đã có trong nhóm.
- **Quản lý & Tương tác nhóm**:
  - Xem danh sách thành viên trong nhóm kèm trường đại học và trạng thái trực tuyến.
  - Thành viên có thể chủ động rời nhóm.
  - Hỗ trợ đầy đủ tin nhắn văn bản và tin nhắn đa phương tiện (hình ảnh, video, tài liệu học tập, icon/emoji) trong nhóm chat.

## 2. Kiến trúc & API
- **Model `GroupChat`**: Lưu trữ `name`, `avatar`, `creator`, `members` (danh sách `user`, `joinedAt`, `addedBy`), `lastMessageAt`.
- **Model `Message`**: Hỗ trợ `groupId` khi là tin nhắn nhóm, `receiver` để trống hoặc null cho tin nhắn nhóm.
- **Endpoints**:
  - `POST /api/chat/groups`: Tạo nhóm mới.
  - `GET /api/chat/groups/:groupId`: Lấy thông tin nhóm và thành viên.
  - `POST /api/chat/groups/:groupId/members`: Thêm thành viên vào nhóm.
  - `POST /api/chat/groups/:groupId/leave`: Rời khỏi nhóm.
  - `GET /api/chat/groups/:groupId/messages`: Lịch sử tin nhắn nhóm.
  - `POST /api/chat/groups/:groupId/messages`: Gửi tin nhắn vào nhóm.
