# UNI-MATE Development Guidelines & Rules

## 1. Chat System Guidelines
- Hệ thống Chat của UNI-MATE hỗ trợ đầy đủ tin nhắn đa phương tiện:
  - **Hình ảnh (Images)**: `jpg, jpeg, png, webp, gif` với giao diện hiển thị hình ảnh bo góc và popup phóng to.
  - **Video (Videos)**: `mp4, webm, mov` với trình phát video tích hợp.
  - **File tài liệu (Documents)**: `pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip` với thông tin dung lượng và tải về.
  - **Biểu tượng & Icon (Emojis)**: Popup bảng chọn icon/emoji hỗ trợ chèn nhanh vào tin nhắn.
- Đảm bảo tính nhất quán giữa Socket.io event và REST API fallback (`/api/chat`).
- Lưu trữ media linh hoạt: hỗ trợ Cloudinary và fallback lưu trữ an toàn khi chưa có biến môi trường.
