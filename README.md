# CMS Quản Lý Phòng Khám Thiện Chánh

Ứng dụng quản trị được dựng từ hồ sơ nghiệp vụ `26.0505-GIS.BRD.TCB` (phiên bản trong PDF ngày 08/05/2026), tập trung vào feature và không sao chép hình UI tham khảo.

## Stack

- CMS: React + Refine + Ant Design + Vite
- Backend: NestJS + TypeORM + JWT
- Database: PostgreSQL
- Runtime: Docker Compose

## Chạy Bằng Docker

```bash
cp .env.example .env
docker compose up --build
```

- CMS: <http://localhost:5173>
- API: <http://localhost:3000/api>
- PostgreSQL: `localhost:5432`

Tài khoản khởi tạo:

```text
Email: admin@thienchanh.local
Password: Admin@123
```

Thay `JWT_SECRET` và mật khẩu admin trong `.env` trước khi sử dụng ngoài môi trường phát triển.

## Chức Năng MVP

- CRUD các phân hệ: chi nhánh, khách hàng, hồ sơ bệnh án, lịch hẹn, nhà cung cấp, hàng hóa/vật tư, lô tồn kho, liệu trình, phiếu thu/hóa đơn, phiếu chi và hoa hồng.
- Khách hàng tự phân hạng theo tổng chi; số điện thoại bị che trên danh sách/API thông thường.
- Lịch hẹn kiểm tra trùng bác sĩ hoặc phòng trong cùng khung giờ.
- Audit log cho thao tác tạo/sửa/xóa và API xem số điện thoại.
- Cấu hình động theo từng model:
  - Thêm `custom field` và lưu giá trị vào `customFields` JSONB.
  - Chọn field hiển thị trên bảng dữ liệu.
  - Chọn field xuất hiện trên form nhập liệu.
  - Tạo mẫu in HTML với placeholder `{{field_key}}`, in từ bản ghi.

## Cấu Trúc

```text
backend/                 NestJS REST API
cms/                     Refine CMS
docs/FEATURE_SCOPE.md    Phạm vi rút từ PDF
docs/WORKLOG.md          Đã làm / cần làm tiếp
docker-compose.yml       PostgreSQL + API + CMS
```

## API Chính

```text
POST   /api/auth/login
GET    /api/records/:resource
POST   /api/records/:resource
PATCH  /api/records/:resource/:id
DELETE /api/records/:resource/:id
POST   /api/records/customers/:id/reveal-phone
GET    /api/settings/custom-fields
GET    /api/settings/views
GET    /api/settings/print-templates
GET    /api/settings/print-templates/:id/render/:recordId
GET    /api/audit-logs
```

## Phát Triển Local

Khởi động riêng PostgreSQL trước, sau đó:

```bash
cd backend && npm install && DATABASE_URL=postgresql://clinic:clinic_password@localhost:5432/clinic npm run start:dev
cd cms && npm install && npm run dev
```

