# GIS Clinic ERP

Hệ thống ERP đa tenant dành cho phòng khám/thẩm mỹ viện. Dự án quản lý vận hành từ CRM, lịch hẹn và điều trị đến kho, kế toán, nhân sự, landing page và chăm sóc khách hàng.

Mỗi tenant được nhận diện theo **hostname** và có database nghiệp vụ tách biệt. Một database quản trị trung tâm lưu danh sách tenant và tài khoản quản trị nền tảng.

## Thành phần hệ thống

| Thư mục    | Công nghệ                        | Vai trò                                                                      |
| ------------ | ---------------------------------- | ----------------------------------------------------------------------------- |
| `backend/` | NestJS 11, TypeORM, MySQL, JWT     | REST API, xác thực, phân quyền, nghiệp vụ và kết nối tenant database |
| `cms/`     | React 19, Refine, Ant Design, Vite | CMS nội bộ cho nhân viên và quản trị viên tenant                      |
| `landing/` | Next.js 15                         | Website/landing page công khai, form đăng ký và chatbot                  |
| `tenant/`  | Next.js 15                         | Console nền tảng: tạo, clone, seed và theo dõi tenant                    |
| `docker/`  | Docker, PM2                        | Runtime production chạy bốn ứng dụng trong một container                 |
| `docs/`    | Markdown                           | Phạm vi nghiệp vụ, lịch sử công việc và tài liệu schema             |

```mermaid
flowchart LR
  U[Người dùng] --> CMS[CMS :9999]
  U --> Landing[Landing :9997]
  P[Platform admin] --> Tenant[Tenant console :9996]
  CMS --> API[Backend API :9998/api]
  Landing --> API
  Tenant --> API
  API --> Registry[(Management DB)]
  API --> DB1[(Tenant A DB)]
  API --> DB2[(Tenant B DB)]
```

## Phân hệ chính

- Nền tảng: tài khoản, vai trò động, quyền theo chi nhánh, phòng ban, phòng, thiết bị, danh mục và địa giới hành chính.
- CRM và chăm sóc khách hàng: khách hàng/bệnh nhân, lead, hoạt động lead, Zalo OA, hội thoại/tin nhắn và ảnh khách hàng.
- Chuyên môn: nhân sự/bác sĩ, hồ sơ bệnh án, lịch hẹn, lịch làm việc, tư vấn, chỉ định dịch vụ, điều trị và hoa hồng.
- Kho và mua hàng: nhà cung cấp, sản phẩm/dịch vụ, biến thể, đơn vị, lô tồn kho.
- Tài chính: hóa đơn, chi phí, kỳ kế toán, hệ thống tài khoản, chứng từ và các báo cáo sổ cái/công nợ/dòng tiền.
- Nhân sự: hợp đồng, bảo hiểm, chấm công, nghỉ phép, đào tạo, đánh giá và bảng lương.
- Công việc: dự án, task, thành viên dự án, định nghĩa workflow, phiên chạy và task workflow.
- Cấu hình mở rộng: custom field, custom table, cấu hình màn hình/form, sinh mã, mẫu in HTML/DOCX/PDF và nhật ký audit.
- Kênh công khai: landing page, domain, theme, menu, form/submission, file, Google Drive và chatbot.

## Kiến trúc database

### Mô hình tenant

Hệ thống hoạt động theo một trong hai chế độ:

| Chế độ     | Biến môi trường                                                   | Cách dùng                                                                                               |
| ------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Một database | `DATABASE_URL`                                                      | Phù hợp local/dev hoặc một cơ sở. Mọi request dùng chung database này.                           |
| Multi-tenant  | `MANAGEMENT_DATABASE_URL`, `TENANTS_JSON` hoặc bảng `tenants` | Backend đọc`Host`/`X-Forwarded-Host`, xác định tenant rồi mở database riêng của tenant đó. |

Database quản trị chỉ có hai bảng: `tenants` (domain, connection string, trạng thái) và `platform_admins` (quản trị viên nền tảng). Chúng không được sao chép sang database tenant.

Mỗi database tenant có khoảng 90 entity TypeORM. Hầu hết record nghiệp vụ kế thừa các cột chung: `id` UUID, `createdAt`, `updatedAt`, `isArchived` và dữ liệu mở rộng `customFields`. Các cột như `customerId`, `branchId`, `staffId` là khóa liên kết nghiệp vụ; không phải tất cả đều được khai báo foreign key vật lý.

```mermaid
erDiagram
  branches ||--o{ staff : branchId
  customers ||--o{ appointments : customerId
  customers ||--o{ medical_episodes : customerId
  customers ||--o{ consultations : customerId
  customers ||--o{ service_orders : customerId
  service_orders ||--o{ service_order_items : serviceOrderId
  products ||--o{ product_variants : productId
  products ||--o{ stock_batches : productId
  accounting_vouchers ||--o{ accounting_voucher_lines : voucherId
  projects ||--o{ tasks : projectId
  workflow_definitions ||--o{ workflow_steps : definitionId
  workflow_instances ||--o{ workflow_tasks : instanceId
```

| Nhóm bảng              | Ví dụ bảng                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Nền tảng               | `branches`, `users`, `dynamic_role_definitions`, `branch_permissions`, `departments`, `rooms` |
| CRM                      | `customers`, `leads`, `lead_activities`, `zalo_*`, `customer_images`                            |
| Khám và điều trị    | `staff`, `medical_episodes`, `appointments`, `consultations`, `service_orders`, `treatments`  |
| Kho                      | `suppliers`, `products`, `product_variants`, `stock_batches`                                      |
| Kế toán                | `invoices`, `expenses`, `accounting_*`                                                              |
| Nhân sự                | `attendances`, `leave_*`, `payrolls`, `work_contracts`, `staff_*`                               |
| Cấu hình và nội dung | `custom_*`, `view_settings`, `print_templates`, `landing_*`, `files`                            |
| Vận hành               | `projects`, `tasks`, `workflow_*`, `audit_logs`, `record_drafts`, `admin_chatbot_*`           |

Nguồn chuẩn của schema là [entities.ts](/Users/vienvu/Work/erp-clinic/backend/src/entities/entities.ts). Danh mục đầy đủ từng bảng/entity có trong [docs/DATABASE_SCHEMA.md](/Users/vienvu/Work/erp-clinic/docs/DATABASE_SCHEMA.md).

> `TYPEORM_SYNCHRONIZE=true` tiện cho local hoặc tạo tenant mới, nhưng không nên dùng để thay thế migration có kiểm soát trên production.

## Chạy local bằng Docker

### 1. Chuẩn bị cấu hình

```bash
cp .env.example .env
```

Điền tối thiểu `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `.env`. MySQL có thể chạy ngoài Docker; khi backend chạy trong container và MySQL chạy trên máy host, dùng `host.docker.internal` hoặc IP host phù hợp trong connection string.

### 2. Chạy chế độ development

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

| Dịch vụ      | URL mặc định                                                 |
| -------------- | --------------------------------------------------------------- |
| Tenant console | [http://localhost:9996](http://localhost:9996)                   |
| Landing        | [http://localhost:9997](http://localhost:9997)                   |
| API            | [http://localhost:9998/api](http://localhost:9998/api)           |
| API Swagger    | [http://localhost:9998/api/docs](http://localhost:9998/api/docs) |
| CMS            | [http://localhost:9999](http://localhost:9999)                   |

Source của backend, CMS và landing được mount vào container nên tự reload khi thay đổi. Tenant console hiện chạy từ build image; cần build lại compose nếu sửa mã trong `tenant/`.

### 3. Build/chạy production

`PUBLIC_API_URL` phải là URL API mà trình duyệt của người dùng thực sự truy cập được; không dùng `127.0.0.1` khi truy cập từ máy khác.

```env
PUBLIC_API_URL=https://api.example.com/api
LANDING_PUBLIC_URL=https://www.example.com
```

```bash
docker compose up -d --build
```

Production chạy một container `gis-clinic`; PM2 khởi động API, CMS, landing và tenant console. Upload được lưu mặc định tại `data/uploads`, log lỗi JSONL tại `data/logs` (có thể đổi qua `UPLOADS_DIR` và `LOGS_DIR`).

## Cấu hình multi-tenant

Tạo một database registry riêng, sau đó khai báo tenant qua biến môi trường (hoặc quản lý chúng bằng tenant console):

```env
MANAGEMENT_DATABASE_URL=mysql://registry_user:strong_password@host.docker.internal:3306/clinic_registry
TENANTS_JSON=[{"domain":"clinic-a.example.com","databaseUrl":"mysql://clinic_user:strong_password@host.docker.internal:3306/clinic_a"}]
TENANT_DATABASE_SERVER_URL=mysql://provision_user:strong_password@host.docker.internal:3306/mysql
TYPEORM_SYNCHRONIZE=true
```

`domain` phải khớp hostname request đến API. Vì vậy mỗi tenant cần hostname/API hostname riêng hoặc proxy chuyển tiếp `X-Forwarded-Host` đúng tenant. JWT chứa `tenantId`, nên token của tenant A không dùng được cho tenant B.

## API nổi bật

Mọi route bên dưới có prefix `/api`; phần lớn yêu cầu JWT Bearer token.

| Nhóm            | Endpoint tiêu biểu                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Auth             | `POST /auth/login`, `GET /auth/me`, đổi password/PIN                                               |
| CRUD nghiệp vụ | `GET/POST/PATCH/DELETE /records/:resource`                                                             |
| Cấu hình       | `/settings/custom-fields`, `/settings/views`, `/settings/print-templates`, `/settings/landing-*` |
| Workflow         | `/workflow/definitions`, `/workflow/tasks/my`, approve/reject/cancel instance                        |
| Báo cáo        | `/reports/accounting/general-ledger`, trial balance, cash flow, công nợ, sổ quỹ/ngân hàng        |
| Khách hàng     | `/customer-portal/auth/*`, `/customer-portal/appointments`, invoices                                 |
| Công khai       | `/public/landing-pages/*`, `/public/chatbot/*`                                                       |

Swagger là nguồn tra cứu API chính xác nhất ở `/api/docs` của môi trường đang chạy.

## Kiểm tra và build từng ứng dụng

```bash
cd backend && npm run lint && npm run build
cd cms && npm run lint && npm run build
cd landing && npm run lint && npm run build
cd tenant && npm run lint && npm run build
```

## Tài liệu liên quan

- [Phạm vi nghiệp vụ](/Users/vienvu/Work/erp-clinic/docs/FEATURE_SCOPE.md)
- [Danh mục schema database](/Users/vienvu/Work/erp-clinic/docs/DATABASE_SCHEMA.md)
- [Nhật ký công việc](/Users/vienvu/Work/erp-clinic/docs/WORKLOG.md)

## Lưu ý bảo mật

- Không commit `.env`, connection string, OAuth secret hay mật khẩu thật.
- Thay toàn bộ secret và tài khoản mẫu trước khi deploy.
- Chỉ bật `TYPEORM_SYNCHRONIZE` khi chấp nhận TypeORM tự thay đổi schema; production nên dùng quy trình migration/backup rõ ràng.
- URL API được nhúng vào bundle CMS/Landing lúc build; rebuild image sau khi đổi `PUBLIC_API_URL`.
