# CMS Quản Lý Phòng Khám Thiện Chánh

Ứng dụng quản trị được dựng từ hồ sơ nghiệp vụ `26.0505-GIS.BRD.TCB` (phiên bản trong PDF ngày 08/05/2026), tập trung vào feature và không sao chép hình UI tham khảo.

## Stack

- CMS: React + Refine + Ant Design + Vite
- Backend: NestJS + TypeORM + JWT
- Database: MySQL server ben ngoai Docker
- Runtime: Docker Compose

## Chạy Bằng Docker

```bash
cp .env.example .env
docker compose up --build
```

- Landing: [http://localhost](http://localhost)
- CMS: [http://localhost/admin](http://localhost/admin)
- API: [http://localhost/api](http://localhost/api)

Production compose đã gom `backend`, `cms`, `landing` vào 1 image duy nhất với service `app`.

### Gateway

Gateway dùng một domain và một port ngoài: `/` → Landing, `/admin/` → CMS, `/api/` và `/uploads/` → API. Trỏ reverse proxy/domain vào port `APP_PORT` (dev: `9999`, production: `80`); không trỏ trực tiếp đến các port nội bộ `3001`, `3002`, hoặc `3003`.

### Nhiều domain, mỗi domain một database

Backend hỗ trợ chế độ multi-tenant theo hostname. Tạo một database quản trị riêng, sau đó khai báo tenant ở `.env`; mỗi `domain` được ánh xạ đến đúng một `databaseUrl`:

```env
MANAGEMENT_DATABASE_URL=mysql://registry_user:registry_password@host.docker.internal:3306/clinic_registry
TENANTS_JSON=[{"domain":"clinic-a.example.com","databaseUrl":"mysql://clinic_a_user:clinic_a_password@host.docker.internal:3306/clinic_a"},{"domain":"clinic-b.example.com","databaseUrl":"mysql://clinic_b_user:clinic_b_password@host.docker.internal:3306/clinic_b"}]

# Dự án hiện dùng TypeORM synchronize để tạo schema tenant mới.
# Chỉ đặt false khi database đã được provision schema bằng quy trình migration của bạn.
TYPEORM_SYNCHRONIZE=true
```

Khi `TYPEORM_SYNCHRONIZE=true`, lần khởi động đầu tiên sẽ tạo bảng `tenants` trong registry, nhập các dòng từ `TENANTS_JSON`, và tạo schema cho từng database tenant. Backend đọc `Host`/`X-Forwarded-Host` cho mỗi request, chỉ mở database của tenant tương ứng. Token đăng nhập cũng mang `tenantId`, nên token của domain A không thể dùng trên domain B. Khi đã vận hành, có thể quản lý trực tiếp bảng `tenants`; khởi động lại service sau khi đổi `databaseUrl` của tenant để làm mới connection cache.

`domain` phải là hostname mà request API thực sự đến (ví dụ dùng `/api` cùng domain `clinic-a.example.com`, hoặc dùng một API subdomain riêng cho từng tenant). Một API hostname chung cho mọi tenant sẽ không có thông tin để chọn database.

Nếu `MANAGEMENT_DATABASE_URL` để trống, hệ thống giữ chế độ cũ: một `DATABASE_URL` dùng cho tất cả domain.

## Docker Dev

Compose mac dinh la production-like runtime, khong hot reload. Neu muon code va thay doi ngay lap tuc, dung compose dev 1 container Node:

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d 
```

Dev stack se chay trong 1 service `app`, ben trong gom:

- Gateway: [http://localhost:9999](http://localhost:9999)
- CMS: [http://localhost:9999/admin](http://localhost:9999/admin)
- API: [http://localhost:9999/api](http://localhost:9999/api)
- Backend watch mode noi bo: `3001`
- Vite dev server noi bo: `3003`
- Next dev server noi bo: `3002`

Luu y:

- Source code duoc mount truc tiep vao container.
- `backend`, `cms`, `landing` deu chay watch/dev mode trong cung 1 container Node.
- Neu dang chay production compose tren cung port `9999`, hay dung `docker compose down` truoc.

Can cau hinh `DATABASE_URL` tro den MySQL cua server truoc khi `docker compose up`.
Vi du:

```env
DATABASE_URL=mysql://clinic_user:strong_password@127.0.0.1:3306/clinic
```

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
docker/                  Gateway + PM2 config cho single-container runtime
docs/FEATURE_SCOPE.md    Phạm vi rút từ PDF
docs/WORKLOG.md          Đã làm / cần làm tiếp
docker-compose.yml       Single-container production stack
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
cd backend && npm install && DATABASE_URL=mysql://clinic_user:strong_password@127.0.0.1:3306/clinic npm run start:dev
cd cms && npm install && npm run dev
```

## Deploy voi MySQL cua Server

1. Tao database va user MySQL tren server.
2. Cap quyen cho user do vao database ung dung.
3. Sua file `.env` tren server:

```env
DATABASE_URL=mysql://clinic_user:strong_password@127.0.0.1:3306/clinic
JWT_SECRET=mot-secret-rat-dai
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=mot-mat-khau-manh
```

4. Pull image va restart app:

```bash
docker compose pull
docker compose up -d
```

Neu MySQL chay tren may host cung server Docker, `127.0.0.1` se dung khi app chay native.
Neu backend chay trong Docker va MySQL chay tren host, hay dung IP that cua host hoac `host.docker.internal` neu server ho tro ten nay.

sh build-push.sh

Ssh root@161.97.181.63
con server này
Root/QG5oZjRSn1OH793Q0x53H

cd phongkham && docker compose pull && docker compose up -d


////


ssh root@103.1.238.70

cd clinic && docker compose pull && docker compose up -d
