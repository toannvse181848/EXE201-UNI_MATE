# Số liệu báo cáo OC3: lấy ở đâu, tính thế nào

Tài liệu này giải thích từng con số trong phần phân tích của trang **Tổng quan Admin** (đường dẫn `/admin/dashboard`, trước đây là trang riêng `/admin/oc3`), trong file Excel xuất từ trang đó và trong script `scripts/oc3-stats.js`. Cả ba dùng chung một đoạn code (`src/utils/oc3Metrics.js`) nên luôn ra cùng kết quả.

## 1. Xem số liệu ở đâu

| Cách | Dùng khi | Ghi chú |
|---|---|---|
| Trang admin `/admin/dashboard` | Xem nhanh, chụp ảnh dán vào báo cáo | Tính lại mỗi lần mở trang |
| Nút **Xuất Excel** trên trang đó | Nộp minh chứng "file dữ liệu xuất ra" | 9 sheet (có Giao dịch, Đánh giá), email đã che |
| `node scripts/oc3-stats.js --db unimate_v2 --exclude scripts/oc3-exclude.txt` | Chạy trên máy, xuất CSV | Chỉ đọc database |
| Google Analytics 4 (`G-E201VWBYGY`) | Lượt truy cập, màn hình, nguồn truy cập trên web | Chỉ có dữ liệu web, từ 18/10/2026 |

## 2. Dữ liệu nằm ở đâu trong database

Database production: `unimate_v2` trên cluster `unimate-cluster` (MongoDB Atlas).

| Collection | Chứa gì | Dùng cho chỉ số |
|---|---|---|
| `users` | Tài khoản sinh viên, quán, admin; ngày đăng ký; nguồn biết đến (`acquisition`); lịch sử UniCoin (`studentProfile.coinLog`) | Số đăng ký, kênh, onboarding, check-in quán |
| `matches` | Lượt thả tim và kết bạn giữa 2 sinh viên | Dùng tính năng chính, kích hoạt |
| `messages`, `groupmessages` | Tin nhắn 1-1 và nhóm | Dùng tính năng chính, ngày hoạt động |
| `uservouchers` | Voucher sinh viên đã lưu vào ví, kể cả ưu đãi hẹn cafe nhận qua "Rủ cafe" | Lưu voucher |
| `redemptions` | Lượt quán quét QR áp voucher | Dùng voucher tại quán, ngày sinh viên ra quán |
| `meetups` | Lời "Rủ cafe" giữa 2 sinh viên: chờ trả lời, đã chốt, đã gặp tại quán | (chưa đưa vào trang OC3) |
| `orders` | Đơn mua gói (`pending` / `paid` / `cancelled`), số tiền, ngày thanh toán, mã tham chiếu ngân hàng (`paymentRef`) | Người trả phí, doanh thu, danh sách giao dịch |
| `payments` | Mọi giao dịch tiền vào SePay báo về, kể cả giao dịch không khớp đơn | Mã ngân hàng của giao dịch được admin gán vào đơn |
| `reviews` | Đánh giá của khách: đơn, người mua, 1–5 sao, nhận xét | Đánh giá xác minh (G3.4) |
| `venues` | Quán và trạng thái duyệt | Quán đối tác hoạt động |
| `useractivities` | Mỗi người 1 dòng cho mỗi ngày có mở app, ghi rõ web hay mobile | Tỷ lệ quay lại, người hoạt động mỗi tuần |
| `settings` (key `oc3`) | Lượt tiếp cận, lượt nhấp, chi phí từng kênh do admin nhập | CTR, chi phí cho mỗi khách (CPA) |

`useractivities` được ghi tự động ở backend mỗi khi người dùng đăng nhập hoặc gọi API (mỗi người tối đa 1 lần ghi mỗi ngày, mỗi nền tảng), nên đo được cả app mobile mà không cần cập nhật app.

## 3. Tài khoản bị loại khỏi số liệu

- Tài khoản `admin`.
- 6 tài khoản mẫu do `src/seed.js` tạo.
- Email trong biến môi trường `OC3_EXCLUDE_EMAILS` trên Render (cách nhau bởi dấu phẩy) hoặc trong file `scripts/oc3-exclude.txt` khi chạy script: tài khoản của 6 thành viên nhóm và tài khoản test. File này không đưa lên git vì chứa email thật.

Trang admin hiện cảnh báo vàng nếu chưa đặt `OC3_EXCLUDE_EMAILS`.

## 4. Định nghĩa chỉ số

| Chỉ số | Cách tính |
|---|---|
| Sinh viên đăng ký | Tài khoản sinh viên thật (sau khi loại ở mục 3) |
| **Người dùng hợp lệ** (mục tiêu môn học 20) | Sinh viên đã làm ít nhất 1 hành động của luồng chính: thả tim, nhắn tin, lưu voucher, check-in quán hoặc tạo đơn. Khớp định nghĩa "đã sử dụng ít nhất một lần luồng chính" của môn học |
| Hoàn thành onboarding | `isProfileCompleted = true` |
| **Kích hoạt** (định nghĩa slide OC2) | Hoàn thành onboarding **và** có ít nhất 1 lần kết bạn thành công hoặc lưu 1 voucher |
| **Người trả phí** (mục tiêu môn học 10) | Có ít nhất 1 đơn `paid`, mỗi người tính 1 lần. Đổi Premium bằng UniCoin **không** tính, vì không tạo đơn và không có tiền thật |
| Doanh thu | Tổng `amount` của đơn `paid` |
| Giá trị đơn trung bình | Doanh thu ÷ số đơn đã thanh toán |
| Khách mua lại | Người trả phí có từ 2 đơn `paid` |
| Tỷ lệ chuyển đổi | Sinh viên trả phí ÷ sinh viên đăng ký |
| Doanh thu trừ chi phí | Doanh thu − (chi phí các kênh + chi phí khác nhập trên trang admin) |

### Bảng chấm OC3 "Proof of Real Transactions"

| Tiêu chí | Trên dashboard | Cách tính |
|---|---|---|
| G3.1 Ngưỡng | Khối "Ngưỡng cần đạt" | Người dùng hợp lệ / 20, người trả phí / 10, đánh giá / mục tiêu đánh giá |
| G3.2 Bốn kết quả chính | Khối "Bốn kết quả chính" | Doanh thu, người dùng hợp lệ, giao dịch đã thanh toán, đánh giá xác minh. Tính thẳng từ database, không nhập tay |
| G3.2 Mỗi giao dịch | Khối "Danh sách giao dịch", sheet "Giao dịch" | Mã đơn, ngày, số tiền, mã tham chiếu ngân hàng, phương thức, khách (đã che), kênh |
| G3.2 Không ai quá 20% giao dịch | Ô "Giao dịch đã thanh toán" | Số đơn của khách mua nhiều nhất ÷ tổng đơn đã thanh toán |
| G3.3 Theo kênh | Khối "Theo kênh thu hút", sheet "Theo kênh" | Người dùng, người trả phí, giao dịch, doanh thu, chuyển đổi đăng ký → trả phí, giá trị đơn trung bình của từng kênh |
| G3.4 Đánh giá | Khối "Đánh giá khách hàng", sheet "Đánh giá" | Chỉ tính đánh giá gắn với đơn đã thanh toán của người dùng thật. Mục tiêu = max(10, 50% số khách trả phí). Có điểm trung bình, phân bổ sao, tỷ lệ mua lại |

**Phương thức và mã tham chiếu** (`src/utils/paymentInfo.js`):

| Phương thức | Khi nào | Mã tham chiếu lấy từ |
|---|---|---|
| SePay tự xác nhận | Webhook SePay khớp mã đơn, đủ tiền | `referenceCode` SePay gửi (VD: FT26310668029238) |
| Admin gán giao dịch SePay | Admin gán giao dịch lạc vào đơn | `referenceCode` của giao dịch đó trong `payments` |
| Admin đối chiếu sao kê | Admin bấm "Duyệt đơn" | Ô "Mã giao dịch ngân hàng" lúc duyệt, hoặc nút **Bổ sung** ở trang Quản lý đơn hàng |

Đơn cũ chưa có trường `paymentRef` thì mã được đọc từ ghi chú (`Tự động xác nhận qua SePay #id · FT...`). Đơn nào chưa có mã sẽ hiện "Thiếu, cần bổ sung" trên dashboard.

**Đánh giá**: khách đã trả phí thấy lời nhắc ở trang Khám phá và nút "Đánh giá" ở Lịch sử giao dịch (trang cá nhân). Chỉ chính người mua đơn mới đánh giá được, admin không viết thay được. Mỗi đơn một đánh giá, gửi lại thì sửa. Tài khoản thành viên nhóm vẫn đánh giá được trong app nhưng không được tính.

### Phễu chuyển đổi

Đăng ký → Dùng tính năng chính → Tạo đơn mua gói → Thanh toán. Mỗi bước chỉ đếm người đã qua mọi bước trước, nên bước cuối đúng bằng số sinh viên trả phí. "Bước mất nhiều người nhất" là bước có số người giảm nhiều nhất so với bước ngay trước.

### Tỷ lệ quay lại

Ngày hoạt động của một người là mọi ngày có ít nhất một trong các dấu vết: mở app (`useractivities`), thả tim, nhắn tin, lưu voucher, ra quán, điểm danh / check-in UniCoin, tạo đơn, lần hoạt động gần nhất. Tính theo giờ Việt Nam.

| Chỉ số | Tính trên | Quay lại khi |
|---|---|---|
| Đúng ngày 1 | Sinh viên đăng ký từ 1 ngày trước trở lên | Có hoạt động đúng ngày thứ 1 sau ngày đăng ký |
| Đúng ngày 7 | Sinh viên đăng ký từ 7 ngày trước trở lên | Có hoạt động đúng ngày thứ 7 |
| Trong 7 ngày đầu | Như trên | Có hoạt động bất kỳ ngày nào từ ngày 1 đến ngày 7 |
| Trong 30 ngày đầu | Sinh viên đăng ký từ 30 ngày trước trở lên | Có hoạt động từ ngày 1 đến ngày 30 (mục tiêu OC2: 18 người) |

**Giới hạn cần nói khi báo cáo:** `useractivities` chỉ có từ ngày bật tính năng (trang admin ghi rõ ngày bắt đầu). Trước ngày đó, việc mở app mà không làm gì không được lưu, nên tỷ lệ quay lại giai đoạn đầu là **ước tính thấp hơn thực tế**.

### Theo tuần

Tuần tính từ thứ Hai. Có: sinh viên và quán đăng ký mới, sinh viên hoạt động trong tuần, kết bạn mới, voucher lưu / đổi, đơn tạo / thanh toán, doanh thu, và các cột cộng dồn (tổng sinh viên, người trả phí, doanh thu).

## 5. Kênh của mỗi người dùng

Lấy theo thứ tự ưu tiên, dừng ở nguồn đầu tiên có dữ liệu:

1. **Mã UTM** trên link người đó đã mở trong 30 ngày trước khi đăng ký (`utm_source`).
2. **Trang giới thiệu** (referrer), ví dụ mở từ facebook.com hay tiktok.com.
3. **Câu trả lời "Bạn biết UNI-MATE qua đâu?"** lúc đăng ký (web và app mobile, không bắt buộc).
4. Không có gì: **Chưa rõ**. Mọi tài khoản đăng ký trước khi có tính năng này đều là "Chưa rõ".

Dữ liệu khách quan (UTM, referrer) được ưu tiên hơn câu trả lời tự chọn. Câu tự chọn giúp ghi nhận các kênh không có link, như CLB, sự kiện, bạn bè giới thiệu.

Link có mã theo dõi có dạng `https://uni-mate-web-beta.vercel.app/?utm_source=<kênh>&utm_medium=<loại>&utm_content=<vị trí>&utm_campaign=unimate` (ví dụ `utm_source=facebook&utm_medium=social&utm_content=group`). Dùng đúng link của từng kênh khi đăng bài hoặc in mã QR.

Từ 25/10/2026, ô nhập số liệu kênh và danh sách link theo dõi đã bỏ khỏi trang admin. Từ 24/11/2026, bảng theo kênh quay lại dashboard (khối "Theo kênh thu hút") nhưng chỉ gồm số tính từ database, không có cột nhập tay. Lượt tiếp cận, lượt nhấp, chi phí trong sheet "Theo kênh" vẫn là số đã lưu lần cuối trong `settings` (key `oc3`).

| Chỉ số theo kênh | Cách tính |
|---|---|
| Lượt tiếp cận, lượt nhấp, chi phí | Số đã nhập tay trước đây (API `PUT /api/admin/oc3/settings`), cộng dồn từ đầu chiến dịch |
| CTR | Lượt nhấp ÷ lượt tiếp cận |
| Chi phí / người dùng hợp lệ | Chi phí ÷ người dùng hợp lệ của kênh |
| CPA | Chi phí ÷ người trả phí của kênh. Để trống khi kênh chưa nhập chi phí hoặc chưa có khách trả phí |

## 6. Kế hoạch so với thực tế

Mục tiêu lấy từ `src/config/oc3Targets.js`:

| Nguồn | Chỉ số | Kế hoạch |
|---|---|---|
| Môn học | Người dùng hợp lệ / người trả phí | 20 / 10 |
| Slide OC2 | Lượt tiếp cận → lượt nhấp | 20.000 → 600 (CTR 3%) |
| Slide OC2 | Sinh viên đăng ký → kích hoạt | 300 → 120 (40%) |
| Slide OC2 | Sinh viên đổi voucher tại quán | 36 (30% số kích hoạt) |
| Slide OC2 | Sinh viên quay lại trong 30 ngày | 18 |
| Slide OC2 | Quán đối tác hoạt động (có quán được duyệt) | 10 |

## 7. Google Analytics 4 (chỉ web)

Dùng cho phần "người dùng đi qua những màn hình nào, rời bỏ ở đâu". Sự kiện đang gửi: `page_view` (kèm tên màn hình), `sign_up`, `login`, `onboarding_complete`, `view_item`, `friend_request_send`, `friend_match`, `message_send`, `voucher_claim`, `venue_checkin`, `voucher_redeem`, `begin_checkout`, `purchase` (backend gửi khi đơn được xác nhận).

| Cần cho báo cáo | Trong GA4 |
|---|---|
| Lượt truy cập theo tuần | Báo cáo → Tổng quan, chọn khoảng thời gian, so sánh theo tuần |
| Nguồn truy cập theo kênh | Báo cáo → Thu nạp → Thu nạp lưu lượng truy cập (Traffic acquisition), chọn "Nguồn / phương tiện của phiên" |
| Màn hình được xem nhiều | Báo cáo → Tương tác → Trang và màn hình, cột "Tiêu đề trang và tên màn hình" |
| Phễu | Khám phá → Khám phá phễu (Funnel exploration): `page_view` → `sign_up` → `onboarding_complete` → `begin_checkout` → `purchase` |
| Màn hình rời bỏ nhiều nhất | Khám phá → Khám phá đường dẫn (Path exploration), điểm bắt đầu `session_start` |
| Tỷ lệ quay lại | Báo cáo → Giữ chân (Retention), hoặc Khám phá → Khám phá nhóm thuần tập |

Nên đánh dấu `sign_up`, `begin_checkout`, `purchase` là **sự kiện chính** (Quản trị → Hiển thị dữ liệu → Sự kiện). App mobile chưa gắn GA4: số liệu mobile lấy từ database (mục 4).

## 8. Số liệu cần thu từ Facebook và TikTok

Chụp màn hình có hiện rõ khoảng thời gian, mỗi tuần một lần, và ghi tổng cộng dồn vào báo cáo.

| Kênh | Lấy ở đâu | Số liệu |
|---|---|---|
| Fanpage Facebook | Meta Business Suite → Thông tin chi tiết (Insights) | Lượt tiếp cận, lượt hiển thị, lượt nhấp vào liên kết, lượt tương tác, người theo dõi mới |
| Group Facebook | Thống kê bài đăng hoặc đếm thủ công | Lượt xem / tương tác của từng bài đã đăng |
| Quảng cáo Facebook (nếu có) | Trình quản lý quảng cáo | Chi phí, lượt hiển thị, lượt nhấp, CTR |
| TikTok | TikTok Studio → Phân tích | Lượt xem video, lượt xem hồ sơ, lượt nhấp liên kết ở bio, người theo dõi mới |
| CLB / sự kiện | Biên bản và ảnh sự kiện | Số người tiếp cận, số người để lại thông tin, chi phí in ấn |
