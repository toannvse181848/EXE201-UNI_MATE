# UNI-MATE API Contract

Base URL:
- Production: `https://unimate-api.onrender.com`
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

## 6. Cập nhật hồ sơ của mình

`PUT /api/users/me` — cần đăng nhập

Chỉ gửi những trường muốn đổi. Sinh viên được đổi `fullName`, `phone`, `studentId`, `university`, `major`, `year`, `gender`, `bio`, `interests`, `objectives` (gửi phẳng hoặc lồng trong `studentProfile` đều được). Partner đổi được `fullName`, `phone`, `businessName`. Các trường khác như `role`, `status` bị bỏ qua.

Request:
```json
{ "bio": "Thích học nhóm buổi tối", "major": "Trí tuệ nhân tạo", "year": "Sinh viên năm 4" }
```

Response `200`:
```json
{ "success": true, "message": "Cập nhật hồ sơ thành công", "data": { "user": { "...": "giống /api/auth/me" } } }
```

Lỗi: `400` — `"Họ tên không được để trống"`

---

## 7. Upload ảnh

Ảnh được đẩy lên Cloudinary khi server có đủ 3 biến `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Thiếu biến thì ảnh lưu tạm trên ổ đĩa server (Render free sẽ xoá khi restart). Mỗi ảnh tối đa 10MB, chỉ nhận file ảnh.

### Ảnh đại diện

`PUT /api/users/me/avatar` — `multipart/form-data`, field `avatar` (1 file)

Response `200`:
```json
{ "success": true, "data": { "avatar": "https://res.cloudinary.com/...", "user": { "...": "..." } } }
```

### Ảnh quán

`POST /api/venues/images` — partner/admin, `multipart/form-data`, field `images` (tối đa 10 file)

Response `201`:
```json
{ "success": true, "data": { "urls": ["https://res.cloudinary.com/...", "..."] } }
```

Sau đó gửi danh sách URL này trong `images` của `POST /api/venues` hoặc `PUT /api/venues/:id`. Không gửi ảnh base64 trong JSON.

`POST /api/venues` và `PUT /api/venues/:id` bỏ qua `status`, `rejectionReason`, `rating`, `partnerId` trong body. Trạng thái duyệt chỉ admin đổi qua `PATCH /api/venues/:id/status`.

---

## 8. Đối soát voucher tại quán (partner)

Mỗi voucher sinh viên lưu vào ví có một mã riêng `qrPayload` dạng `UVM-xxxxxxxxxxxxxxxx`. Mã QR trong ví mã hoá chuỗi này. Partner chỉ thao tác được với voucher của quán mình.

### Kiểm tra trước khi áp dụng (không trừ lượt)

`POST /api/vouchers/verify` — partner/admin

Request: `{ "qrPayload": "UVM-..." }` hoặc `{ "code": "MAVOUCHER" }`. Gửi `UVM-...` trong `code` cũng được.

Response `200`:
```json
{
  "success": true,
  "data": {
    "method": "qr",
    "code": "TCH20",
    "title": "Giảm 20%",
    "venueName": "The Coffee House",
    "remainingCount": 98,
    "student": { "fullName": "Nguyen Van A", "avatar": "...", "studentId": "SE1", "university": "FPT" }
  }
}
```

Lỗi: `400` voucher đã dùng / hết hạn / tạm ngưng / hết lượt · `403` voucher không thuộc quán của bạn · `404` mã không tồn tại

### Áp dụng voucher

`POST /api/vouchers/redeem` — partner/admin, body giống `/verify`. Sinh viên không tự gọi được. Mỗi lần thành công tạo một bản ghi lịch sử check-in.

### Lịch sử check-in

`GET /api/vouchers/partner/redemptions?limit=50` — partner

Response `200`: `{ "success": true, "total": 12, "data": [ { "_id", "method", "createdAt", "voucherId": { "code", "title" }, "userId": { "fullName", "avatar" } | null, "redeemedBy": { "fullName" } } ] }`

`GET /api/vouchers/partner/my-vouchers` và `GET /api/vouchers/admin/all` trả thêm `claimedCount` (số lượt sinh viên đã lưu vào ví).

---

## 9. Thống kê admin

`GET /api/admin/stats` — admin

Response `200`:
```json
{
  "success": true,
  "data": {
    "partners": { "total": 20, "pending": 3 },
    "venues": { "total": 25, "approved": 18, "pending": 5, "rejected": 2, "newThisMonth": 4 },
    "students": { "total": 400, "activeLast30Days": 250, "newThisMonth": 60 },
    "matches": { "total": 120, "thisMonth": 30 },
    "vouchers": { "total": 30, "active": 22, "claimed": 300, "redeemed": 140, "redeemedThisMonth": 45 },
    "reports": { "pending": 3 }
  }
}
```

---

## Ghi chú

- Token có hạn **7 ngày**, hết hạn thì đăng nhập lại (chưa có refresh token).
- Server đang dùng gói free của Render: không có request nào trong 15 phút thì service ngủ, request kế tiếp mất khoảng 30-50 giây để khởi động lại.
- `PATCH /api/users/:id/status` (admin) nhận `active` hoặc `suspended`. `banned` vẫn được chấp nhận và lưu thành `suspended`.

## Dự kiến làm tiếp

- Cập nhật vị trí GPS
- Đăng nhập bằng Google