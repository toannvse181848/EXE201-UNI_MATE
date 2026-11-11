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

Dùng chung cho mọi loại tài khoản. Thu ngân gửi tên đăng nhập trong ô `email` (không phân biệt hoa thường).

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
| `cashier` | Màn quét voucher của chi nhánh (`/cashier/scan`) |

Nếu `data.user.isProfileCompleted` = `false` thì đưa sinh viên vào màn hình hoàn thiện hồ sơ trước.

Thu ngân: `user` có thêm `cashierVenue: { id, name }` (chi nhánh được gắn) và `businessName` (tên quán). `GET /api/auth/me` cũng vậy. Thu ngân bị khoá, chủ quán bị khoá, hoặc chi nhánh không còn thuộc chủ quán thì trả `403`. Thu ngân không dùng được "Quên mật khẩu" (`400`), chủ quán đặt lại mật khẩu.

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
{ "success": true, "message": "Đổi mật khẩu thành công. ...", "data": { "token": "<token mới>" } }
```

Đổi hoặc đặt lại mật khẩu (kể cả chủ quán đặt lại mật khẩu thu ngân) làm mọi token cấp trước đó hết hiệu lực: các máy khác nhận `401` kèm `code: "SESSION_REVOKED"` ở yêu cầu kế tiếp. Máy đang đổi phải lưu `data.token` để dùng tiếp. Web tự xoá phiên và chuyển về trang đăng nhập (`?expired=1`) khi gặp `401` ở API không phải đăng nhập / mật khẩu.

Token trong link đặt lại mật khẩu chỉ lưu bản băm SHA-256 trong database.

Giới hạn tần suất (theo IP): đăng nhập 15 lần **sai** / 15 phút (lần đúng không bị đếm), đăng ký 50 lần / giờ, quên mật khẩu 5 lần / giờ.

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

## 8. Đối soát voucher tại quán (partner, thu ngân)

Mỗi voucher sinh viên lưu vào ví có một mã riêng `qrPayload` dạng `UVM-xxxxxxxxxxxxxxxx`. Mã QR trong ví mã hoá chuỗi này. Partner chỉ thao tác được với voucher của quán mình.

Đúng chi nhánh: voucher chỉ dùng được ở chi nhánh (`venueId`) phát hành nó.
- Thu ngân luôn quét tại chi nhánh được gắn, không cần gửi gì thêm.
- Chủ quán gửi thêm `venueId` (chi nhánh đang đứng quét) trong body `/verify` và `/redeem`. Không gửi thì nhận voucher của mọi chi nhánh (app cũ).
- Sai chi nhánh trả `403` kèm `code: "VOUCHER_OTHER_BRANCH"`, câu báo có tên chi nhánh đúng.

### Kiểm tra trước khi áp dụng (không trừ lượt)

`POST /api/vouchers/verify` — partner/admin/thu ngân

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

Lỗi: `400` voucher đã dùng / hết hạn / tạm ngưng / hết lượt / buổi hẹn đã huỷ · `400 VOUCHER_HOLD_EXPIRED` quá hạn giữ trong ví (lượt đã trả cho quán) · `400 VENUE_SUSPENDED` chi nhánh đang bị admin tạm khoá (`status: "rejected"`; chi nhánh chờ duyệt lại sau khi sửa tên vẫn quét được) · `403 STUDENT_SUSPENDED` tài khoản sinh viên bị khoá · `403` voucher không thuộc quán của bạn · `404` mã không tồn tại

Response có thêm `maxDiscount`, `giftItem`, `meetupReward`, `holdUntil` và `counter: { posLabel, minBillLabel }` cho 1 mã. `/redeem` trả `counter` cho đúng số mã vừa áp dụng, ví dụ `"Giảm 20% trên phần gọi của 2 bạn có mã, mỗi bạn tối đa 30.000đ"`, `"Giảm 20.000đ (2 × 10.000đ)"`, `"Tặng 1 bánh flan cho mỗi bạn (2 bạn)"`. UNI-MATE không trừ tiền: thu ngân giảm trên máy tính tiền của quán theo câu này.

**Luật hoá đơn tối thiểu:** tính trên phần gọi của người dùng mã. Ưu đãi hẹn cafe ghi `"Mỗi bạn gọi từ 50.000đ"`; 2 bạn chung hoá đơn thì `minBillLabel` ghi cả mức `100.000đ`. Hệ thống không biết số tiền hoá đơn, thu ngân tự kiểm tra.

### Áp dụng voucher

`POST /api/vouchers/redeem` — partner/admin/thu ngân, body giống `/verify`. Sinh viên không tự gọi được. Mỗi voucher áp dụng thành công tạo một bản ghi lịch sử check-in.

Ưu đãi hẹn cafe (`/verify` trả `meetup.requiresCompanion: true`): phải có mặt từ 2 bạn trở lên, gửi thêm mã của các bạn đi cùng trong cùng một lần gọi:

```json
{ "qrPayload": "UVM-AAAA", "companions": [{ "qrPayload": "UVM-BBBB" }, { "code": "BT15-002" }] }
```

Mọi voucher cùng được dùng hoặc không voucher nào được dùng. Thiếu `companions` trả `400` kèm `code: "MEETUP_NEEDS_BOTH"`; có mã không phải của bạn đi cùng trong buổi hẹn đó trả `400`. Buổi hẹn nhóm đã được ghi nhận thì bạn đến muộn quét một mình được (`requiresCompanion: false`).

### Lịch sử check-in

`GET /api/vouchers/partner/redemptions?limit=50&venueId=&from=&to=` — partner/thu ngân. Thu ngân chỉ thấy chi nhánh của mình. Chủ quán thấy mọi chi nhánh, hoặc một chi nhánh khi có `venueId`. `from`, `to` là ngày giờ Việt Nam dạng `2026-11-11` (tính cả ngày `to`). Response có thêm `today` (số lượt hôm nay trong cùng phạm vi chi nhánh) và mỗi dòng có `discountLabel` (ưu đãi của đúng mã đó).

`GET /api/vouchers/partner/redemptions/export?venueId=&from=&to=` — chỉ chủ quán: file Excel đối soát (thời gian, chi nhánh, mã, ưu đãi, hoá đơn tối thiểu, tên sinh viên, cách dùng, người xác nhận). Không có MSSV, email. Dùng để so với số đơn có khuyến mãi UNI-MATE trên máy tính tiền của quán.

`GET /api/venues/my/upcoming-meetups` — chỉ chủ quán: buổi hẹn đã chốt (`accepted`) tại các chi nhánh, xếp theo giờ hẹn: `{ id, venueName, scheduledAt, isGroup, people, arrived, reward: { title, code } | null }`. Không có tên hay thông tin sinh viên.

Response `200`: `{ "success": true, "total": 12, "data": [ { "_id", "method", "createdAt", "voucherId": { "code", "title" }, "venueId": { "name" }, "userId": { "fullName", "avatar" } | null, "redeemedBy": { "fullName" } } ] }`. `redeemedBy` là người bấm xác nhận (chủ quán hoặc tên thu ngân).

### Tài khoản thu ngân (chủ quán quản lý)

Thu ngân chỉ gọi được `/api/auth/me`, `/verify`, `/redeem` và lịch sử check-in ở trên, mọi API khác trả `403` (chặn trong `protect`). Không sửa hay xoá voucher, không xem số liệu, không đổi mật khẩu được. Tài khoản thu ngân không tính vào số liệu người dùng OC3.

- `GET /api/cashiers` — `data: [{ "id", "fullName", "username", "venue": { "id", "name" }, "status": "active" | "suspended", "lastActiveAt", "createdAt", "redemptionCount" }]`
- `POST /api/cashiers` — `{ "fullName", "username", "password", "venueId" }`. `username` 3–30 ký tự: chữ thường không dấu, số, `.`, `-`, `_` (không có `@` nên không trùng email). Mật khẩu từ 6 ký tự. Chi nhánh phải của chính chủ quán. Tối đa 20 thu ngân mỗi quán. Trùng tên đăng nhập trả `409`.
- `PATCH /api/cashiers/:id` — `{ "fullName"?, "venueId"?, "password"?, "status"? }`. `status: "suspended"` khoá ngay, kể cả máy đang đăng nhập. Đổi `venueId` thì các lượt quét cũ vẫn giữ chi nhánh cũ.
- `DELETE /api/cashiers/:id` — chỉ xoá được khi chưa quét lượt nào, đã quét thì trả `400` và nên khoá để giữ tên trong lịch sử.

`GET /api/vouchers/partner/my-vouchers` và `GET /api/vouchers/admin/all` trả thêm `claimedCount` (số lượt sinh viên đã lưu vào ví).

Response của `/verify` có thêm `assignedCode` (mã riêng của sinh viên, nếu là voucher mã riêng), `fromMeetup` (`true` = ưu đãi hẹn cafe) và `meetup` (`null` nếu không phải ưu đãi hẹn cafe, hoặc `{ "id", "status", "isGroup", "requiresCompanion", "companions": [{ "id", "fullName", "avatar", "studentId", "university" }] }`, `companions` là những bạn còn voucher chưa dùng). Ưu đãi hẹn cafe, voucher `premiumOnly` và voucher có `coinCost > 0` không nhận mã chung gõ tay, phải dùng `UVM-...` hoặc mã riêng trong ví. `remainingCount` là `null` khi voucher không giới hạn lượt.

Response của `/redeem` có thêm:
- `coinAwarded`: UniCoin sinh viên của mã đầu thực nhận (20 khi dùng voucher, thêm 30 nếu buổi hẹn hoàn tất, vẫn tính trong giới hạn 60/ngày).
- `students`: `[{ "id", "fullName", "coinAwarded", "coinCapped" }]`, từng sinh viên vừa được áp dụng. `coinCapped: true` = bị cắt bớt vì giới hạn ngày. Mảng rỗng khi gõ mã chung.
- `maxDailyEarn`: giới hạn UniCoin kiếm mỗi ngày (60).
- `meetupCompleted`: `true` khi cả hai bạn đã dùng ưu đãi và buổi hẹn được ghi nhận.

Buổi hẹn bị huỷ (huỷ hẹn, huỷ kết bạn, chặn) hoặc không diễn ra (`no_show`) thì voucher chưa dùng bị thu hồi khỏi ví và trả lại lượt / mã cho quán. `POST /api/meetups`, `POST /api/meetups/:id/respond` và các API nhóm bên dưới trả `400` kèm `code: "MEETUP_VENUE_CLASH"` khi người liên quan đang có buổi đã chốt có ưu đãi tại cùng quán.

Luật chống lặp ưu đãi: cùng những người đó đã nhận ưu đãi của một quán thì trong 7 ngày không nhận lại, tính chung hẹn 2 người và hẹn nhóm. Có thêm người mới so với buổi trước thì vẫn nhận. Vẫn hẹn được nhưng không có voucher, thẻ hẹn (`meetup.rewardNote`) ghi rõ lý do. Buổi đã huỷ hoặc không diễn ra không tính. Đổi số ngày bằng biến môi trường `MEETUP_REWARD_REPEAT_DAYS`, đặt `0` để tắt khi cần test lặp lại nhiều lần.

`GET /api/meetups/recent-rewards?matchId=` trả `{ "venueIds": [...], "days": 7 }`: những quán 2 bạn đã nhận ưu đãi trong thời gian trên, để khung chọn quán báo trước.

Giờ hẹn nằm ngoài ngày giờ áp dụng của ưu đãi hoặc sau hạn dùng thì buổi hẹn không nhận ưu đãi đó, hệ thống tìm ưu đãi khác của quán còn dùng được.

### Rủ cả nhóm đi cafe (sinh viên, thành viên nhóm)

- `POST /api/meetups/group` — `{ "groupId", "venueId", "scheduledAt"? }`: tạo lời mời và thẻ `type: "meetup"` trong chat nhóm. Tính vào lượt mời của người rủ.
- `POST /api/meetups/:id/join`: tham gia. Có từ 2 người là chốt hẹn (`accepted`), mỗi người tham gia nhận 1 voucher, tối đa 8 người mỗi buổi.
- `POST /api/meetups/:id/leave`: bạn đã tham gia đổi ý, voucher của người đó bị thu hồi và lượt vừa trả ưu tiên cho bạn đang tham gia mà chưa có voucher. Chỉ còn người rủ thì buổi hẹn quay về `proposed` và voucher của người rủ cũng bị thu hồi. Bạn vừa rời là người mới duy nhất so với buổi trước thì những bạn còn lại cũng bị thu hồi theo luật chống lặp.
- `POST /api/meetups/:id/cancel`: buổi hẹn nhóm chỉ người rủ huỷ được.
- Rời chat nhóm (`DELETE /api/group-chat/:groupId/members/me`): thành viên được tính như rời buổi hẹn, người rủ rời thì buổi hẹn đang mở bị huỷ.

Quán quét từ 2 mã trở lên trong cùng một lần `/redeem` thì buổi hẹn thành `completed`, chỉ người được quét mới được thưởng UniCoin. Bạn đến muộn quét riêng được trong 24 giờ, quá hạn voucher chưa dùng bị thu hồi. Buổi đã chốt mà không còn bạn nào khác có voucher thì `/verify` trả `400` kèm `code: "MEETUP_NEEDS_BOTH"`.

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
| `applyDays` | Ngày trong tuần được dùng, `0` = chủ nhật đến `6` = thứ 7. Rỗng = mọi ngày |
| `applyFrom`, `applyTo` | Khung giờ được dùng, dạng `"14:00"` theo giờ Việt Nam, trong cùng một ngày. `null` = cả ngày |

Ngoài ngày giờ áp dụng thì `/verify` và `/redeem` trả `400` kèm `code: "VOUCHER_OUT_OF_SCHEDULE"`. Nhãn `conditionLabel` có thêm phần này, `scheduleLabel` là riêng phần ngày giờ.

Tạo voucher (`POST /api/vouchers`) gửi thêm các field trên. Mã voucher và mã riêng không được trùng nhau, gồm 3–30 ký tự chữ không dấu, số, gạch ngang hoặc gạch dưới, không bắt đầu bằng `UVM-`. File Excel nhập voucher có thêm cột **Loại mã** (Chung / Riêng), **Giá UniCoin**, và cột Số lượng nhận chữ **Không giới hạn**. Tải lại file mẫu để có cột mới. Khi nhập file, dòng sai mã, sai mức giảm, sai số lượng hoặc hết hạn bị bỏ qua và trả lý do trong `skipped`; voucher mới mặc định `walletOnly: true`; chế độ `update` giữ nguyên loại mã và quán của voucher đang chạy.

Sửa và xoá voucher (partner chủ voucher hoặc admin). Danh sách voucher trả thêm `hasRecipients`: `true` là đã có sinh viên nhận hoặc dùng.
- `PUT /api/vouchers/:id` — không đổi được mã, loại voucher, cách phát mã. Khi `hasRecipients` là `true`, chỉ được sửa tên, ghi chú, gia hạn, tăng số lượng, bật `walletOnly`; đổi các ô khác trả `400`.
- `DELETE /api/vouchers/:id` — chỉ xoá được khi `hasRecipients` là `false`, xoá luôn các mã riêng đã nạp. Đã có người nhận thì trả `400`, dùng tạm dừng để giữ lịch sử.

Voucher mã riêng:
- `POST /api/vouchers/:id/codes` — nạp danh sách mã: JSON `{ "codes": ["BT-001", "BT-002"] }` (hoặc chuỗi mỗi mã một dòng), hoặc form-data `file` là Excel/CSV có mã ở cột đầu tiên. Chỉ nhận voucher loại mã riêng. Mã trùng nằm trong `skippedExisting`, mã sai định dạng nằm trong `skippedInvalid`.
- `GET /api/vouchers/:id/codes` — tình trạng từng mã: `available` / `assigned` / `used`, kèm tên sinh viên.
- **Hạn giữ trong ví:** voucher miễn phí sinh viên tự lưu chỉ giữ được `WALLET_HOLD_DAYS` ngày (mặc định 7, không quá hạn voucher), lưu ở `holdUntil` của item trong ví. Quá hạn chưa dùng thì chuyển `expired` và trả lượt (mã chung) hoặc trả mã (mã riêng) cho quán, chạy trong việc định kỳ 15 phút và ngay khi mở ví / quét. Sinh viên lưu lại được nếu quán còn lượt. Voucher đổi UniCoin và ưu đãi hẹn cafe không có hạn giữ (`holdUntil: null`). Đặt `WALLET_HOLD_DAYS=0` để tắt.
- Sinh viên nhận voucher thì response có `assignedCode`. Trong ví (`/my-wallet`) mỗi item có `displayCode`, là mã cần hiện cho sinh viên đọc ở quầy khi không quét được QR: mã riêng nếu có, không thì `qrPayload` (`UVM-...`). Không hiện mã chung, vì gõ mã chung tại quầy không trừ voucher trong ví.
- Thu ngân gõ mã riêng (VD `BT-001`) vào trang đối soát như gõ mã chung, hệ thống tự tìm đúng voucher của sinh viên.

## 14. Chat đa phương tiện (Ảnh, Video, File tài liệu)

- `POST /api/chat/upload` — sinh viên: form-data với trường `file` (ảnh/video/tài liệu học tập tối đa 50MB).
  - Response `200`:
  ```json
  {
    "success": true,
    "data": {
      "fileUrl": "https://res.cloudinary.com/...",
      "fileName": "de-cuong-on-tap.pdf",
      "fileSize": 1048576,
      "fileMimeType": "application/pdf",
      "mediaType": "file"
    }
  }
  ```
- `POST /api/chat/:matchId/messages` — sinh viên: gửi tin nhắn văn bản hoặc kèm file media.
  - Body:
  ```json
  {
    "text": "Xem qua slide này nhé!",
    "type": "file",
    "fileUrl": "https://res.cloudinary.com/...",
    "fileName": "de-cuong-on-tap.pdf",
    "fileSize": 1048576,
    "fileMimeType": "application/pdf"
  }
  ```
  *(Cho phép `text` rỗng nếu đã có `fileUrl`, `type` gồm `text`, `image`, `video`, `file`)*
- Socket.io event `send_message`: Hỗ trợ payload tương tự kèm `type`, `fileUrl`, `fileName`, `fileSize`, `fileMimeType`.

---

## Ghi chú

- Token có hạn **7 ngày**, hết hạn thì đăng nhập lại (chưa có refresh token).
- Server đang dùng gói free của Render: không có request nào trong 15 phút thì service ngủ, request kế tiếp mất khoảng 30-50 giây để khởi động lại.
- `PATCH /api/users/:id/status` (admin) nhận `active` hoặc `suspended`. `banned` vẫn được chấp nhận và lưu thành `suspended`.

## Dự kiến làm tiếp

- Cập nhật vị trí GPS
- Đăng nhập bằng Google