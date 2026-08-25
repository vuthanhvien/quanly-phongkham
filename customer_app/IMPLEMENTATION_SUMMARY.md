# Customer App — hiện trạng triển khai

> Rà soát ngày 12/08/2026. Phạm vi: `customer_app/`.

## Cập nhật UI hiện tại

Đã chuyển hướng trải nghiệm sang customer clinic hiện đại:

- Bottom menu gồm **Home · Lịch hẹn · Đặt lịch · Tin nhắn · Hồ sơ**; nút Đặt lịch nằm giữa, nổi bật và mở trực tiếp flow đặt lịch.
- Home có clinic hero, lịch gần nhất, danh sách dịch vụ, đội ngũ bác sĩ, bài viết/tin mới và khối thông tin phòng khám.
- Đặt lịch là wizard 4 bước: dịch vụ + chi nhánh → bác sĩ → ngày giờ → xác nhận + ghi chú.
- Thêm màn hình Chat UI để kết nối CSKH/bác sĩ.
- Profile có thẻ hạng thành viên/điểm tích lũy và các mục hành trình sức khỏe: liệu trình, chẩn đoán, lịch khám/lịch chờ, hóa đơn/đơn hàng.

Nội dung bài viết, đội ngũ, dịch vụ, thông tin phòng khám, chat và dữ liệu hành trình sức khỏe hiện là dữ liệu trình diễn trong `lib/data/demo/clinic_content.dart`; các luồng OTP, lịch hẹn, hóa đơn và cập nhật hồ sơ vẫn dùng API thật.

## Tổng quan

`customer_app` là ứng dụng Flutter đa nền tảng (Android, iOS, web, macOS, Windows, Linux) cho khách hàng phòng khám. App đã có khung UI hoàn chỉnh theo luồng cơ bản và kết nối API qua `Dio`; dữ liệu hiển thị đến từ backend, không phải dữ liệu mẫu cứng.

- State/routing: GetX.
- Lưu phiên: GetStorage (access token và hồ sơ khách hàng).
- API mặc định: `http://localhost:9998/api`; có thể đổi khi build/chạy bằng `--dart-define=API_BASE_URL=...`.
- Giao diện: Material 3, font Plus Jakarta Sans, bộ màu hồng đồng bộ CMS; có loading, empty state, pull-to-refresh và nhãn trạng thái.

## UI và luồng đã có

| Khu vực | Đã triển khai | Trạng thái |
|---|---|---|
| Đăng nhập OTP | Nhập/sơ bộ kiểm tra số điện thoại, gửi OTP, nhập OTP 6 chữ số, gửi lại OTP, hiển thị lỗi/loading. `devCode` từ API được tự điền để thuận tiện cho môi trường dev. | Có UI + API |
| Phiên đăng nhập | Tự vào app nếu còn token + profile local; tự xóa phiên và về màn hình đăng nhập khi API trả 401; đăng xuất có hộp xác nhận. | Có |
| Khung chính | Bottom navigation 4 tab: Trang chủ, Lịch hẹn, Hóa đơn, Hồ sơ. Dùng `IndexedStack` để giữ state giữa các tab. | Có |
| Trang chủ | Lời chào theo tên khách; thẻ lịch hẹn gần nhất; quick actions đặt lịch, hóa đơn, hồ sơ; pull-to-refresh. | Có UI + API lịch hẹn |
| Danh sách lịch hẹn | Tab “Sắp tới” / “Lịch sử”, thẻ lịch hẹn, empty state, pull-to-refresh và nút FAB tạo lịch mới. | Có UI + API |
| Chi tiết/hủy lịch | Xem loại lịch, trạng thái, thời gian, ghi chú; chỉ hiện hủy khi lịch còn đủ điều kiện; xác nhận trước khi hủy. | Có UI + API |
| Tạo lịch hẹn | Chọn chi nhánh, loại (tư vấn/dịch vụ/tái khám), bác sĩ tùy chọn, ngày, giờ, ghi chú; kiểm tra thời điểm phải ở tương lai; gửi lịch 30 phút. | Có UI + API lookup/create |
| Danh sách hóa đơn | Danh sách thẻ mã hóa đơn, tổng tiền và trạng thái; pull-to-refresh, empty state. | Có UI + API |
| Chi tiết hóa đơn | Tổng tiền, đã thanh toán, còn lại, ngày lập và trạng thái. | Có UI + API |
| Hồ sơ | Thông tin cơ bản, hạng thành viên, số điện thoại/email/địa chỉ; chỉnh email, giới tính, địa chỉ. | Có UI + API cập nhật |

## Dữ liệu và API đang được dùng

| Nghiệp vụ | Endpoint | Thao tác trong app |
|---|---|---|
| Xác thực | `POST /customer-portal/auth/otp/request`, `POST /customer-portal/auth/otp/verify` | Gửi và xác nhận OTP; nhận `accessToken` + customer |
| Hồ sơ | `GET/PATCH /customer-portal/me` | Model `Customer`; hiện tại UI chỉ sửa email, giới tính, địa chỉ |
| Lịch hẹn | `GET/POST /customer-portal/appointments`, `GET /customer-portal/appointments/:id`, `PATCH /customer-portal/appointments/:id/cancel` | Model `Appointment`; xem, tạo, chi tiết, hủy |
| Hóa đơn | `GET /customer-portal/invoices`, `GET /customer-portal/invoices/:id` | Model `Invoice`; danh sách/chi tiết |
| Danh mục đặt lịch | `GET /customer-portal/branches`, `GET /customer-portal/doctors` | Model `Branch`, `Doctor`; dùng trong form đặt lịch |

Tất cả request sau đăng nhập tự thêm `Authorization: Bearer <token>`. Các repository giả định response dạng `{ data: ... }`, trừ hai API OTP dùng payload ở cấp gốc.

## Cấu trúc chính

```text
lib/
├── core/        # API client, config môi trường, session/local storage, theme, formatters
├── data/        # models: Customer, Appointment, Invoice, Branch, Doctor; repositories API
├── modules/     # auth, shell, home, bookings, booking_create, invoices, profile
├── routes/      # 7 named routes GetX
└── widgets/     # loading, empty state, status badge tái sử dụng
```

## Những phần chưa có hoặc cần hoàn thiện

- Chưa có lịch khả dụng theo chi nhánh/bác sĩ, slot giờ, phòng, hay kiểm tra trùng lịch từ UI. Người dùng đang chọn bất kỳ ngày/giờ nào (trong 180 ngày); thời lượng được cố định 30 phút.
- Form bác sĩ không lọc theo chi nhánh đã chọn. Avatar URL có trong model nhưng chưa được render ở UI.
- Chi tiết lịch hẹn chưa hiển thị tên chi nhánh, bác sĩ hay phòng: model hiện chủ yếu giữ các ID liên quan.
- Danh sách “Sắp tới” hiện phân theo trạng thái (không `CANCELLED`/`COMPLETED`), chưa loại lịch `SCHEDULED` đã qua thời gian. Trong khi trang chủ đã chọn đúng lịch tương lai bằng `isUpcoming`.
- Sau khi hủy lịch trong trang chi tiết, danh sách/trang chủ không tự refresh cho đến khi người dùng quay lại hoặc kéo để làm mới.
- Khi tải danh sách lịch hẹn/hóa đơn lỗi, UI đang hiển thị empty state thay vì thông báo lỗi và nút thử lại; lỗi ở Home được chủ động ẩn.
- Hồ sơ chưa gọi lại `GET /me` để làm mới dữ liệu; không có cập nhật tên, avatar, số điện thoại, giấy tờ, hay hiển thị tổng chi tiêu/trạng thái tài khoản.
- Hóa đơn chỉ có phần tổng hợp; chưa có line items/dịch vụ, phương thức thanh toán trên UI, tải/in hóa đơn hoặc thanh toán online.
- Chưa có quên/sửa số điện thoại, điều khoản/chính sách, notification, deep link, analytics, kiểm thử API/e2e hay cấu hình release/branding thật (package Android vẫn là `com.example.customer_app`, README còn template Flutter).

## Kiểm tra hiện tại

- `flutter test`: **pass** — có 1 widget test, kiểm tra trạng thái chưa đăng nhập mở màn hình đăng nhập.
- `flutter analyze`: không có error/warning chặn build; có 4 lint mức `info` tại `appointment_repository.dart` về cú pháp collection `if` có thể dùng null-aware element.

## Kết luận mức độ hoàn thiện

App đã đạt phần lõi của MVP customer portal: khách có thể xác thực bằng OTP, quản lý lịch hẹn, đặt/hủy lịch, xem hóa đơn và cập nhật một phần hồ sơ trên dữ liệu API. Phần cần ưu tiên tiếp theo là trải nghiệm đặt lịch theo slot thực tế, dữ liệu quan hệ hiển thị bằng tên thay vì ID, xử lý lỗi/retry rõ ràng và hoàn thiện luồng hóa đơn/thông báo để sẵn sàng phát hành.
