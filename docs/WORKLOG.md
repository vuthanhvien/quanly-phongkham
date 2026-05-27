# Theo Dõi Công Việc

## Đã Làm

- [x] Đọc đủ PDF nghiệp vụ và tách phạm vi feature khỏi phần minh họa UI.
- [x] Chọn kiến trúc `Refine CMS + NestJS API + PostgreSQL + Docker Compose`.
- [x] Tạo backend NestJS, kết nối PostgreSQL qua TypeORM và seed tài khoản admin/chi nhánh mẫu.
- [x] Tạo API CRUD chung cho chi nhánh, khách hàng, bệnh án, lịch hẹn, NCC, hàng hóa, kho, liệu trình, thu, chi và hoa hồng.
- [x] Tạo hệ thống `custom field` theo model, có kiểu dữ liệu, bắt buộc và lựa chọn.
- [x] Tạo setting bố cục table/form và setting mẫu in HTML theo model.
- [x] Tạo CMS Refine đọc cấu hình động để render danh sách và form.
- [x] Thêm mask điện thoại, endpoint reveal có audit, phân hạng khách theo chi tiêu và kiểm tra trùng lịch.
- [x] Thêm Dockerfile/Compose và tài liệu khởi chạy.

## Đã Kiểm Tra

- [x] Cài dependencies; `npm run build` thành công cho backend và CMS; `npm audit --audit-level=high` không còn vulnerability.
- [x] Khởi chạy toàn bộ stack bằng Docker Compose; PostgreSQL healthy, NestJS và nginx chạy trên port cấu hình.
- [x] Kiểm tra API end-to-end: login, tạo khách, thêm custom field, cấu hình table/form, render mẫu in, mask/reveal điện thoại và audit log.
- [x] Kiểm tra cập nhật form cục bộ: vẫn giữ số điện thoại thật phía backend, dữ liệu hiển thị đã mask và hạng khách được tính đúng.
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
