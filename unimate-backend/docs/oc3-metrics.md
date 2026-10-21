# Số liệu báo cáo OC3: lấy ở đâu, tính thế nào

Tài liệu này giải thích từng con số trong trang **Số liệu OC3** (trang admin, đường dẫn `/admin/oc3`), trong file Excel xuất từ trang đó và trong script `scripts/oc3-stats.js`. Cả ba dùng chung một đoạn code (`src/utils/oc3Metrics.js`) nên luôn ra cùng kết quả.

## 1. Xem số liệu ở đâu

| Cách | Dùng khi | Ghi chú |
|---|---|---|
| Trang admin `/admin/oc3` | Xem nhanh, chụp ảnh dán vào báo cáo, nhập chi phí theo kênh | Tính lại mỗi lần mở trang |
| Nút **Xuất Excel** trên trang đó | Nộp minh chứng "file dữ liệu xuất ra" | 7 sheet, email đã che |
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
| `orders` | Đơn mua gói (`pending` / `paid` / `cancelled`), số tiền, ngày thanh toán | Người trả phí, doanh thu |
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

Link có mã theo dõi cho từng kênh nằm cuối trang admin, có nút chép. Dùng đúng link của từng kênh khi đăng bài hoặc in mã QR.

| Chỉ số theo kênh | Cách tính |
|---|---|
| Lượt tiếp cận, lượt nhấp, chi phí | Nhập tay trên trang admin, cộng dồn từ đầu chiến dịch |
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

Chụp màn hình có hiện rõ khoảng thời gian, mỗi tuần một lần, và nhập tổng cộng dồn vào trang admin.

| Kênh | Lấy ở đâu | Số liệu |
|---|---|---|
| Fanpage Facebook | Meta Business Suite → Thông tin chi tiết (Insights) | Lượt tiếp cận, lượt hiển thị, lượt nhấp vào liên kết, lượt tương tác, người theo dõi mới |
| Group Facebook | Thống kê bài đăng hoặc đếm thủ công | Lượt xem / tương tác của từng bài đã đăng |
| Quảng cáo Facebook (nếu có) | Trình quản lý quảng cáo | Chi phí, lượt hiển thị, lượt nhấp, CTR |
| TikTok | TikTok Studio → Phân tích | Lượt xem video, lượt xem hồ sơ, lượt nhấp liên kết ở bio, người theo dõi mới |
| CLB / sự kiện | Biên bản và ảnh sự kiện | Số người tiếp cận, số người để lại thông tin, chi phí in ấn |
