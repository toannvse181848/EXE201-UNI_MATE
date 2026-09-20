# UNI-MATE API Contract

Base URL:
- Production: `https://unimate-backend-re5y.onrender.com`
- Local: `http://localhost:5000`

## Quy ước chung

Mọi response đều theo một trong hai dạng:

```json
{ "success": true, "data": { ... } }
```
```json
{ "success": false, "message": "Mô tả lỗi bằng tiếng Việt" }
```

Endpoint cần đăng nhập phải gửi kèm header:
```
Authorization: Bearer <token>
```

Mã lỗi dùng chung:

| Mã | Ý nghĩa |
|---|---|
| 400 | Dữ liệu gửi lên thiếu hoặc sai định dạng |
| 401 | Chưa đăng nhập hoặc token hết hạn |
| 403 | Đã đăng nhập nhưng không đủ quyền |
| 404 | Không tìm thấy |
| 409 | Dữ liệu bị trùng (email đã tồn tại) |

---

## 1. Đăng ký sinh viên

`POST /api/auth/register/student`

Request:
```json
{
  "email": "student01@fpt.edu.vn",
  "password": "123456",
  "fullName": "Nguyen Van A",
  "university": "FPT University",
  "major": "Software Engineering",
  "year": 3
}
```

Response `201`:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "6aa658b41a3d653dc83dd2df",
      "email": "student01@fpt.edu.vn",
      "fullName": "Nguyen Van A",
      "role": "student",
      "avatar": null,
      "status": "active",
      "isProfileCompleted": false,
      "studentProfile": {
        "university": "FPT University",
        "major": "Software Engineering",
        "year": 3,
        "interests": [],
        "objectives": [],
        "location": {}
      }
    }
  }
}
```

Lỗi:
- `400` — `"Vui lòng nhập đầy đủ thông tin"`
- `409` — `"Email đã được sử dụng"`

Bắt buộc: `email`, `password`, `fullName`. Các field còn lại có thể bổ sung sau ở màn hình hoàn thiện hồ sơ.

---

## 2. Đăng ký chủ quán

`POST /api/auth/register/partner`

Request:
```json
{
  "email": "partner01@gmail.com",
  "password": "123456",
  "fullName": "Tran Van B",
  "phone": "0901234567",
  "businessName": "Cafe Highlands Q9"
}
```

Response `201`: cấu trúc giống trên, nhưng:
- `role` = `"partner"`
- `status` = `"pending"` (chờ admin duyệt)
- có `partnerProfile` thay vì `studentProfile`

Lỗi:
- `400` — `"Vui lòng nhập đầy đủ thông tin"`
- `409` — `"Email đã được sử dụng"`

Bắt buộc: `email`, `password`, `fullName`, `businessName`.

---

## 3. Đăng nhập

`POST /api/auth/login`

Dùng chung cho cả 3 loại tài khoản.

Request:
```json
{
  "email": "student01@fpt.edu.vn",
  "password": "123456"
}
```

Response `200`: giống response đăng ký (có `token` + `user`).

Lỗi:
- `400` — `"Vui lòng nhập email và mật khẩu"`
- `401` — `"Email hoặc mật khẩu không đúng"`
- `403` — `"Tài khoản đang chờ phê duyệt"` (partner chưa được duyệt)
- `403` — `"Tài khoản đã bị khoá"`

Điều hướng sau khi login dựa vào `data.user.role`:

| role | Điều hướng tới |
|---|---|
| `student` | App sinh viên |
| `partner` | Partner Portal |
| `admin` | Admin Portal |

Nếu `data.user.isProfileCompleted` = `false` thì đưa sinh viên vào màn hình hoàn thiện hồ sơ trước.

---

## 4. Lấy thông tin user hiện tại

`GET /api/auth/me`

Cần token. Gọi mỗi lần mở app để kiểm tra token còn hiệu lực.

Response `200`:
```json
{
  "success": true,
  "data": { "user": { ... } }
}
```

Lỗi:
- `401` — `"Vui lòng đăng nhập"` (không có token)
- `401` — `"Phiên đăng nhập đã hết hạn"` (token quá 7 ngày)

Gặp `401` thì xoá token trong localStorage và đưa về màn hình đăng nhập.

---

## 5. Đổi mật khẩu

`POST /api/auth/change-password`

Cần token.

Request:
```json
{
  "currentPassword": "123456",
  "newPassword": "654321"
}
```

Response `200`:
```json
{ "success": true, "message": "Đổi mật khẩu thành công" }
```

Lỗi:
- `400` — `"Mật khẩu mới phải từ 6 ký tự"`
- `401` — `"Mật khẩu hiện tại không đúng"`

---

## Ghi chú

- Token có hạn **7 ngày**, hết hạn thì đăng nhập lại (chưa có refresh token).
- Server đang dùng gói free của Render: không có request nào trong 15 phút thì service ngủ, request kế tiếp mất khoảng 30-50 giây để khởi động lại.

## Dự kiến làm tiếp

- Cập nhật hồ sơ sinh viên (thông tin, sở thích, mục tiêu kết nối)
- Upload ảnh đại diện
- Cập nhật vị trí GPS
- Đăng nhập bằng Google