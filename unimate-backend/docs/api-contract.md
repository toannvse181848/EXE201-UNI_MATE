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

Response của `/verify` có thêm `assignedCode` (mã riêng của sinh viên, nếu là voucher mã riêng). `remainingCount` là `null` khi voucher không giới hạn lượt. Response của `/redeem` có thêm `coinAwarded`: số UniCoin sinh viên được thưởng (20, vẫn tính trong giới hạn 60/ngày).

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

## 10. Thu phí (đơn hàng + chuyển khoản VietQR)

Luồng: chọn gói → tạo đơn → hiện mã QR → người mua chuyển khoản → admin xác nhận → gói được kích hoạt. Giá các gói nằm ở `src/config/plans.js`.

| Mã gói | Ai mua | Giá | Thời hạn |
|---|---|---|---|
| `premium_monthly` (hoặc `monthly`) | Sinh viên | 49.000đ | 30 ngày |
| `premium_yearly` (hoặc `yearly`) | Sinh viên | 399.000đ | 365 ngày |
| `partner_monthly` | Quán | 99.000đ | 30 ngày |

`GET /api/orders/plans` — công khai, trả danh sách gói ở trên.

`POST /api/orders` — đăng nhập. Request `{ "plan": "monthly" }`. Đang có đơn chờ cùng gói trong 24 giờ thì trả lại đơn đó.

Response `201`:
```json
{
  "success": true,
  "data": {
    "order": { "code": "UM000001", "planName": "UniMate Premium 1 tháng", "amount": 49000, "status": "pending", "statusLabel": "Chờ thanh toán" },
    "payment": {
      "configured": true,
      "bankId": "MB",
      "accountNo": "0123456789",
      "accountName": "TRAN MINH QUAN",
      "amount": 49000,
      "transferContent": "UM000001",
      "qrImageUrl": "https://img.vietqr.io/image/MB-0123456789-compact2.png?amount=49000&addInfo=UM000001&accountName=..."
    }
  }
}
```
Frontend hiện ảnh `qrImageUrl` bằng thẻ `<img>`. `configured: false` nghĩa là server chưa có biến môi trường `BANK_ID`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`.

`GET /api/orders/:code` — người mua hoặc admin. Gọi lại mỗi 5–10 giây trên trang thanh toán, `status` chuyển `paid` thì báo thành công và gọi `/api/auth/me` để lấy `isPremium` mới.

`GET /api/orders/my` — đơn của tôi. `POST /api/orders/:code/cancel` — huỷ đơn đang chờ.

Admin:
- `GET /api/orders/admin/all?status=pending` — danh sách đơn kèm `stats` (số đơn, tổng tiền theo trạng thái)
- `PATCH /api/orders/admin/:code/confirm` — body `{ "note": "mã giao dịch ngân hàng" }`, xác nhận đã nhận tiền và kích hoạt gói
- `PATCH /api/orders/admin/:code/cancel` — huỷ đơn không nhận được tiền

`POST /api/users/premium/buy` giờ **chỉ dùng để đổi UniCoin** (`paymentMethod: "coin"`). Gửi giá trị khác sẽ bị lỗi `400`, mua bằng tiền phải đi qua `/api/orders`.

## 11. Xuất Excel minh chứng (admin)

Cả hai trả về file `.xlsx`, họ tên, email, SĐT đã được che bớt. Frontend tải bằng axios với `responseType: 'blob'` (vì cần header đăng nhập), rồi tạo link tải.

- `GET /api/users/admin/export?role=student` — danh sách người dùng (`role` không bắt buộc: `student` / `partner`)
- `GET /api/orders/admin/export?status=paid` — danh sách đơn hàng, mặc định chỉ đơn đã thanh toán, `status=all` để lấy tất cả

## 12. Check-in bằng mã QR dán tại quán

Mỗi quán có một mã QR cố định, nội dung dạng `UNIMATE-CHECKIN:<venueId>:<secret>`.

- `GET /api/venues/:id/checkin-qr` — partner chủ quán hoặc admin. Trả `{ qrContent, qrImageUrl }`, mở `qrImageUrl` để in dán tại quán
- `POST /api/venues/:id/checkin-qr/regenerate` — tạo mã mới khi ảnh QR bị lộ, mã cũ hết hiệu lực ngay

`POST /api/coins/venue-checkin` — sinh viên quét QR. Request:
```json
{ "qrContent": "UNIMATE-CHECKIN:...", "lat": 10.8451, "lng": 106.7881 }
```
- Quán đã nhập toạ độ thật (`location.coordinates` khác mặc định) thì bắt buộc gửi `lat`, `lng` và phải cách quán dưới 300m.
- Quán chưa có toạ độ thì không kiểm tra vị trí, response trả `locationVerified: false`.
- Vẫn giữ giới hạn 1 lần/quán/ngày, 2 quán/ngày, 60 coin/ngày.

## 13. Voucher mã chung và mã riêng

Field mới của voucher:

| Field | Ý nghĩa |
|---|---|
| `codeType` | `shared` (mặc định): 1 mã chung dùng nhiều lượt · `unique`: danh sách mã riêng, mỗi sinh viên nhận 1 mã dùng 1 lần |
| `isUnlimited` | Mã chung không giới hạn lượt dùng |
| `coinCost` | Số UniCoin bị trừ khi sinh viên nhận voucher (0 = miễn phí) |

Tạo voucher (`POST /api/vouchers`) gửi thêm các field trên. File Excel nhập voucher có thêm cột **Loại mã** (Chung / Riêng), **Giá UniCoin**, và cột Số lượng nhận chữ **Không giới hạn**. Tải lại file mẫu để có cột mới.

Voucher mã riêng:
- `POST /api/vouchers/:id/codes` — nạp danh sách mã: JSON `{ "codes": ["BT-001", "BT-002"] }` (hoặc chuỗi mỗi mã một dòng), hoặc form-data `file` là Excel/CSV có mã ở cột đầu tiên. Mã trùng sẽ bị bỏ qua.
- `GET /api/vouchers/:id/codes` — tình trạng từng mã: `available` / `assigned` / `used`, kèm tên sinh viên.
- Sinh viên nhận voucher thì response có `assignedCode`. Trong ví (`/my-wallet`) mỗi item có `displayCode`, là mã cần hiện cho sinh viên đọc ở quầy.
- Thu ngân gõ mã riêng (VD `BT-001`) vào trang đối soát như gõ mã chung, hệ thống tự tìm đúng voucher của sinh viên.

---

## Ghi chú

- Token có hạn **7 ngày**, hết hạn thì đăng nhập lại (chưa có refresh token).
- Server đang dùng gói free của Render: không có request nào trong 15 phút thì service ngủ, request kế tiếp mất khoảng 30-50 giây để khởi động lại.
- `PATCH /api/users/:id/status` (admin) nhận `active` hoặc `suspended`. `banned` vẫn được chấp nhận và lưu thành `suspended`.

## Dự kiến làm tiếp

- Cập nhật vị trí GPS
- Đăng nhập bằng Google