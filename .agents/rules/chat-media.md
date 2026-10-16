# Quy định Hệ thống Chat Đa Phương Tiện (UNI-MATE Chat Guidelines)

## 1. Yêu cầu Tính năng Chat
Khung chat giữa các sinh viên trong nền tảng UNI-MATE bắt buộc hỗ trợ đa phương tiện đầy đủ:
- **Tin nhắn văn bản (Text)**: Có thể gửi độc lập hoặc kèm theo caption cho media.
- **Biểu tượng cảm xúc & Icon (Emojis/Icons)**: Cho phép chọn nhanh các emoji phổ biến (cảm xúc, học tập, cafe, thả tim, v.v.) và chèn vào nội dung tin nhắn.
- **Gửi hình ảnh (Images)**: Hỗ trợ định dạng `jpg, jpeg, png, webp, gif`. Hiển thị ảnh xem trước bo góc, click để phóng to (lightbox).
- **Gửi video (Videos)**: Hỗ trợ định dạng `mp4, webm, mov`. Hiển thị trình phát video với điều khiển phát/tạm dừng.
- **Gửi file tài liệu (Documents/Files)**: Hỗ trợ các file học tập như `pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip`. Hiển thị tên file, định dạng, dung lượng và nút tải về trực tiếp.

## 2. Kiến trúc & Lưu trữ
- **Backend**:
  - Model `Message` lưu trữ: `text`, `type` (`text` | `image` | `video` | `file`), `fileUrl`, `fileName`, `fileSize`, `fileMimeType`.
  - Endpoint upload: `POST /api/chat/upload` hỗ trợ upload đa định dạng lên Cloudinary hoặc lưu cục bộ khi chưa cấu hình key.
  - Hỗ trợ real-time thông qua Socket.IO và Polling fallback.
- **Frontend**:
  - Tích hợp thanh công cụ đính kèm (Ảnh, Video, Tệp đính kèm) và bảng Emoji Picker tiện lợi.
  - Xử lý trạng thái tải lên mượt mà (uploading indicator, preview trước khi gửi).
