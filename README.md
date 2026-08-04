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

### Chạy development với tự reload

```bash
docker compose -f docker-compose.dev.yml up --build
```

Mã nguồn của Backend, CMS và Landing được mount vào container. Các lệnh dev có
watch/polling nên thay đổi file sẽ tự reload; truy cập Landing tại cổng `9997`,
API tại `9998` và CMS tại `9999`.

- Landing: [http://localhost:9997](http://localhost:9997)
- API: [http://localhost:9998/api](http://localhost:9998/api)
- CMS: [http://localhost:9999](http://localhost:9999)

Production compose dùng một service/container `gis-clinic`; PM2 chạy ba source code độc lập trong container này: Landing (9997), API (9998), và CMS (9999). Không có gateway/proxy nội bộ.

Đặt `PUBLIC_API_URL` là URL API mà trình duyệt truy cập được trước khi build. Không dùng `127.0.0.1` nếu người dùng truy cập từ máy khác:

```env
PUBLIC_API_URL=http://YOUR_SERVER_IP:9998/api
LANDING_PUBLIC_URL=http://YOUR_SERVER_IP:9997
```

URL này được nhúng vào bundle của Landing và CMS; chạy lại `docker compose up -d --build` sau khi đổi nó.

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

## Cấu hình database

Cấu hình `DATABASE_URL` trỏ đến MySQL trước khi chạy. Ví dụ:

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
docker-compose.yml       Single-container production stack (`gis-clinic`)
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

Chay deploy tu may local:

```bash
./deploy.sh
```

Mac dinh script chi build/push image va chay `docker compose pull && docker compose up -d` tren server. File `.env` va `docker-compose.yml` hien co tren server se duoc giu nguyen.

Chi khi can cap nhat ro rang cac file cau hinh, truyen mot hoac ca hai tham so sau:

```bash
./deploy.sh --upload-env
./deploy.sh --upload-compose
./deploy.sh --upload-env --upload-compose
```

Luu thong tin dang nhap server o trinh quan ly bi mat, khong ghi vao README.

docker compose -f docker-compose.dev.yml up --build -d
