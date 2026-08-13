# Customer App — Product Backlog

> Rà soát: 13/08/2026. Backlog này thay thế việc tìm marker `TODO` rải rác
> trong source (hiện không có marker nào). Các hạng mục được ưu tiên theo tác
> động với khách hàng và mức độ phụ thuộc backend.

## P0 — Độ tin cậy của các luồng đang phát hành

- [ ] **Đang làm — Hiển thị lỗi tải dữ liệu và nút thử lại.** Danh sách lịch
  hẹn, hóa đơn và các trang chi tiết phải phân biệt "không có dữ liệu" với
  "không tải được dữ liệu"; vẫn giữ pull-to-refresh khi lỗi mạng.
- [ ] **Đang làm — Đồng bộ lịch hẹn sau khi tạo/hủy.** Sau khi khách tạo hoặc
  hủy, tab Lịch hẹn và thẻ lịch gần nhất ở Trang chủ phải phản ánh ngay, không
  yêu cầu quay lại/kéo để làm mới.
- [ ] **Đang làm — Phân loại lịch theo thời gian thực.** Lịch `SCHEDULED` đã
  qua thời điểm bắt đầu không được nằm ở "Sắp tới". Quy tắc hiển thị phải dùng
  chung với thẻ lịch gần nhất và điều kiện hủy.
- [ ] **Đang làm — Làm mới hồ sơ từ server.** Có thao tác tải lại hồ sơ để
  tránh dùng mãi dữ liệu GetStorage cũ và để phản ánh thay đổi từ CMS.
- [ ] Xử lý token hết hạn nhất quán: interceptor phải cập nhật SessionController
  trước khi điều hướng, tránh UI còn profile cũ trong một frame.
- [ ] Thêm test widget cho empty/error/retry, hủy lịch và phân loại lịch cũ.

## P1 — Luồng đặt lịch đúng dữ liệu vận hành

- [ ] Backend cung cấp slot trống theo chi nhánh, bác sĩ, dịch vụ và thời lượng;
  app chỉ cho chọn slot có thể đặt.
- [ ] Backend kiểm tra giờ mở cửa, chi nhánh hoạt động và sự tồn tại của bác sĩ/
  phòng trước khi tạo lịch; trả lỗi theo mã để app hiển thị đúng ngữ cảnh.
- [ ] Lọc bác sĩ theo chi nhánh/chuyên môn, hiển thị avatar thật với fallback
  chữ cái tên, và cho phép phòng khám tự phân bác sĩ.
- [ ] API lịch hẹn trả branch/doctor/room đã resolve (id + tên) để chi tiết
  không hiển thị ID kỹ thuật.
- [ ] Cho khách dời lịch khi còn trong thời hạn chính sách, nêu rõ cutoff hủy/
  dời và trạng thái chờ xác nhận nếu có.
- [ ] Tôn trọng timezone của chi nhánh xuyên suốt date picker, request ISO và
  định dạng hiển thị.

## P1 — Hồ sơ, hóa đơn và hành trình sức khỏe

- [ ] Thay toàn bộ chỉ số/lịch sử demo trong Profile bằng API thật hoặc ẩn cho
  tới khi API sẵn sàng; không hiển thị "1,240 điểm" cố định cho mọi khách.
- [ ] Thêm màn hình quyền lợi thành viên và chính sách quyền riêng tư có nội
  dung thật, version và link pháp lý.
- [ ] API hóa đơn trả line item, chiết khấu, thuế, phương thức/thời điểm thanh
  toán và thông tin chi nhánh; app hiển thị biên nhận đầy đủ.
- [ ] Cân nhắc thanh toán trực tuyến chỉ sau khi có payment intent, callback
  xác thực server-side và trạng thái giao dịch idempotent.
- [ ] Bổ sung tài liệu khám, kết quả chẩn đoán và liệu trình sau khi xác định
  mô hình phân quyền/đồng ý chia sẻ dữ liệu y tế.

## P2 — Trải nghiệm và nội dung

- [ ] Chuyển dịch vụ, bác sĩ, bài viết, chat và thông tin phòng khám từ
  `data/demo/clinic_content.dart` sang CMS/API; nếu chưa có API phải gắn nhãn
  nội dung giới thiệu thay vì dữ liệu cá nhân hóa.
- [ ] Biến các CTA "Khám phá", "Xem tất cả", "Xem thêm" thành tuyến chức năng
  hoặc bỏ chúng để không tạo dead-end.
- [ ] Chat cần hội thoại thật, trạng thái đọc/gửi lại, upload an toàn, chính
  sách phản hồi và cảnh báo không dùng cho cấp cứu.
- [ ] Notifications: permission rationale, preferences, deep link đến lịch/hóa
  đơn và xử lý khi app bị kill.
- [ ] Cải thiện accessibility: semantic labels, minimum touch target, contrast,
  text scale lớn và keyboard navigation trên web/desktop.
- [ ] Localize chuẩn vi-VN/en, currency/date/timezone và bản sao lỗi nhất quán.

## P3 — Phát hành, bảo mật và vận hành

- [ ] Đổi applicationId/bundle identifier/hiển thị tên app từ template
  `com.example.customer_app`; cung cấp icon, splash, signing và build flavors.
- [ ] Tách base URL theo dev/staging/prod, chỉ bật request logging an toàn ở
  debug và không ghi OTP/token/PII vào log.
- [ ] Thiết lập error reporting có lọc PII, analytics consent-first và dashboard
  chỉ số funnel OTP → đặt lịch → hoàn tất.
- [ ] Thêm unit test repository/model, widget test các đường chính, integration
  test với backend fixture và CI cho analyze/test/build.
- [ ] Rà App Store/Play policy: privacy policy, data safety, account deletion,
  quyền notification/camera/photos và nội dung sức khỏe.
- [ ] Viết README vận hành: prerequisites, chạy simulator/device, dart-define,
  test, build, môi trường API và quy ước release.

## Quy ước hoàn thành

Một hạng mục chỉ được tick khi có test phù hợp, trạng thái loading/error/empty
được kiểm tra, và API contract được ghi rõ nếu có thay đổi giữa app và backend.
