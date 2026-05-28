# Theo Dõi Công Việc

## Đã Làm

- [x] Đọc đủ PDF nghiệp vụ và tách phạm vi feature khỏi phần minh họa UI.
- [x] Chọn kiến trúc `Refine CMS + NestJS API + PostgreSQL + Docker Compose`.
- [x] Tạo backend NestJS, kết nối PostgreSQL qua TypeORM và seed tài khoản admin/chi nhánh mẫu.
- [x] Tạo API CRUD chung cho chi nhánh, khách hàng, bệnh án, lịch hẹn, NCC, hàng hóa, kho, liệu trình, thu, chi và hoa hồng.
- [x] Tạo hệ thống `custom field` theo model, có kiểu dữ liệu, bắt buộc và lựa chọn.
- [x] Tạo setting bố cục table/form và setting mẫu in HTML theo model.
- [x] Tạo CMS Refine đọc cấu hình động để render danh sách và form.
- [x] Làm lại giao diện CMS theo dark beauty theme: nền đen, sắc hồng nhẹ, font Plus Jakarta Sans, sidebar/header/card hiện đại hơn.
- [x] Thêm icon menu theo từng phân hệ và nâng dashboard nhiều màu với KPI, revenue card, pipeline tiến độ và lịch ưu tiên.
- [x] Gom menu sidebar theo nhóm role/nghiệp vụ: Lễ tân & CRM, Chuyên môn điều trị, Kho & mua hàng, Tài chính & lương, Quản trị hệ thống và Công cụ hệ thống.
- [x] Thêm quản lý phòng ban, nhân viên, tài khoản đăng nhập và phân quyền chức năng theo từng chi nhánh.
- [x] Backend kiểm tra RBAC theo `resource:action` và `branchId`; cùng một nhân viên có thể có quyền khác nhau ở các chi nhánh khác nhau.
- [x] Chuyển tạo mới trên CMS sang quick add drawer bên phải, không điều hướng sang route tạo mới.
- [x] Thêm trang detail chung cho tất cả phân hệ; khách hàng và nhân viên có thêm khu tổng quan và bảng dữ liệu liên quan.
- [x] Ẩn UUID khỏi trải nghiệm CMS: các field quan hệ dùng select search, bảng/detail hiển thị dạng `code - name` hoặc nhãn dễ đọc.
- [x] Thêm mask điện thoại, endpoint reveal có audit, phân hạng khách theo chi tiêu và kiểm tra trùng lịch.
- [x] Thêm Dockerfile/Compose và tài liệu khởi chạy.

## Đã Kiểm Tra

- [x] Cài dependencies; `npm run build` thành công cho backend và CMS; `npm audit --audit-level=high` không còn vulnerability.
- [x] Khởi chạy toàn bộ stack bằng Docker Compose; PostgreSQL healthy, NestJS và nginx chạy trên port cấu hình.
- [x] Rebuild CMS Docker sau khi đổi theme; `http://localhost:5173` trả asset UI mới.
- [x] Kiểm tra API end-to-end: login, tạo khách, thêm custom field, cấu hình table/form, render mẫu in, mask/reveal điện thoại và audit log.
- [x] Kiểm tra cập nhật form cục bộ: vẫn giữ số điện thoại thật phía backend, dữ liệu hiển thị đã mask và hạng khách được tính đúng.
- [x] Kiểm tra RBAC: tạo nhân viên/tài khoản/quyền chi nhánh, đăng nhập bằng tài khoản STAFF, cho phép `customers:view` và chặn `customers:create` bằng 403.
- [x] Build CMS sau khi thêm drawer/detail; rebuild Docker CMS và kiểm tra route SPA detail trả asset mới.
- [x] Build/rebuild CMS sau khi đổi relation select; kiểm tra API có dữ liệu `code - name` cho chi nhánh và khách hàng.
- [ ] Kiểm tra tương tác hình ảnh UI bằng trình duyệt tự động: công cụ Browser local không được cung cấp trong phiên xác minh này.

## Sẽ Làm - Giai Đoạn Tiếp Theo

| Ưu tiên | Hạng mục | Kết quả cần có |
| --- | --- | --- |
| P0 | RBAC + multi-branch | Quyền ADMIN/BOD/ACC/BS/CS/REP; mọi truy vấn giới hạn chi nhánh phù hợp |
| P0 | Medical record chi tiết | Sinh hiệu, hậu phẫu, ảnh before/after, upload hồ sơ, consent/signature |
| P0 | Kho giao dịch | Nhập/xuất/chuyển, FIFO lô/hạn dùng, kit dịch vụ, dụng cụ tái sử dụng, barcode |
| P1 | Bán hàng và tài chính | Dòng hóa đơn, nhiều lần thanh toán, công nợ, tính hoa hồng từ thực thu |
| P1 | Vận hành lịch hẹn | Điều phối trực quan, no-show, public booking, SMS/Zalo reminder |
| P1 | Báo cáo | Dashboard doanh thu/kho/thu chi/công nợ; export có phân quyền và audit |
| P2 | CSKH và tích hợp AI | Campaign, lịch sử chăm sóc, AI tư vấn có kiểm soát dữ liệu |
