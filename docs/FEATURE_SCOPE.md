# Phạm Vi Feature Từ Hồ Sơ Nghiệp Vụ

## Nguồn Yêu Cầu

Tài liệu đọc trực tiếp: `26.0505-GIS.BRD.TCB Ho so nghiep vu THIEN CHANH BEAUTY SALON.pdf`, 20 trang, bản cập nhật phát hành ngày `2026.05.08`. Phạm vi dưới đây chỉ lấy yêu cầu chức năng, bỏ qua hình ảnh/gợi ý UI.

## Các Phân Hệ Trong PDF

| Phân hệ | Nghiệp vụ chính |
| --- | --- |
| Khách hàng | Hồ sơ cá nhân, trạng thái, phân hạng/chiết khấu, chống mất dữ liệu điện thoại, lịch sử điều trị, ghi chú |
| Hồ sơ bệnh án | Bệnh sử, dị ứng cảnh báo, chỉ định dịch vụ, diễn tiến, hậu phẫu, ảnh before/after theo mốc |
| Nhà cung cấp | Hồ sơ, giấy phép/chứng chỉ, mặt hàng nhập, hạn nợ/tuổi nợ, thanh toán |
| Hàng hóa / kho / vật tư | Phân nhóm, giá, quy đổi đơn vị, barcode, nhập/xuất/chuyển kho, tồn/hạn dùng, kit và cấp phát dụng cụ |
| Bán hàng | Bán dịch vụ trực tiếp và gói điều trị theo quy trình |
| Lịch hẹn | Điều phối bác sĩ/phòng/máy, chống chồng chéo, trạng thái vận hành, tỷ lệ không đến |
| Liệu trình | Phác đồ, số buổi, khoảng cách buổi, nhắc lịch, vật tư theo buổi |
| Thu chi | Phiếu thu, phiếu chi, danh mục định khoản |
| Hoa hồng | Tỷ lệ nhân viên/đối tác theo tiền thực thu |
| CSKH | Phân loại khách, thành viên, khuyến mãi, hoạt động chăm sóc |
| Nhân viên / quyền | Hồ sơ, chi nhánh, role và quyền truy cập |
| Báo cáo | Kinh doanh, kho, thu chi, công nợ, tổng hợp quản trị |
| Tích hợp | AI tư vấn và chăm sóc khách hàng |

## Kiến Trúc Chọn Cho Ứng Dụng

- Mỗi dữ liệu nghiệp vụ lõi có bảng PostgreSQL riêng để dễ truy vấn, báo cáo và kiểm soát ràng buộc.
- Mỗi model hỗ trợ cột JSONB `customFields`, kết hợp bảng `custom_field_definitions` để người quản trị tự thêm trường mà không migration database.
- `view_settings` lưu danh sách cột bảng và field form theo model; CMS đọc setting khi render.
- `print_templates` lưu HTML có biến động, dùng cả field chuẩn và custom field khi render phiếu in.
- `audit_logs` lưu thao tác dữ liệu nhạy cảm và thay đổi bản ghi.

## Phạm Vi MVP Đã Triển Khai

- Nền tảng CMS/API/DB container hóa.
- CRUD quản trị cho 11 model vận hành cốt lõi.
- Custom fields, table setting, form setting, print templates.
- Auth admin JWT, audit CRUD và audit reveal số điện thoại.
- Mask số điện thoại, phân hạng khách hàng, kiểm tra trùng lịch cơ bản.
- Bảo vệ cập nhật hồ sơ: số điện thoại đang bị che không ghi đè lên giá trị thật khi lưu form.

## Ngoài MVP, Cần Làm Tiếp

- RBAC chi tiết theo role/chi nhánh và lọc dữ liệu theo chi nhánh.
- Hồ sơ y khoa đầy đủ: sinh hiệu, hậu phẫu, upload tài liệu/ảnh private, chữ ký điện tử.
- Luồng kho giao dịch: đơn mua, nhập/xuất/chuyển, FIFO theo hạn dùng, kit, barcode và ảnh tem lô.
- POS/bán hàng, thanh toán nhiều lần, công nợ và engine tính hoa hồng từ thực thu.
- Lịch điều phối dạng live board, nhắc lịch, SMS/Zalo, đặt lịch public.
- Báo cáo, export được kiểm soát, chương trình CSKH và AI agent.
