# Kế hoạch E2E CMS

## Mục tiêu và nguyên tắc

E2E kiểm tra CMS từ trình duyệt như người dùng thật và chạy trên **tenant/database tách riêng** (`e2e.clinic.test`). Không chạy vào production, không tái dùng dữ liệu thật và không commit mật khẩu.

Phạm vi đầu tiên là đăng nhập, điều hướng, RBAC, CRUD trọng yếu và các luồng liên phân hệ. API permission phải được kiểm tra cùng UI: menu bị ẩn hoặc redirect không đủ để chứng minh dữ liệu đã được bảo vệ.

## Role matrix

| Role | Nguồn | Smoke UI bắt buộc | API/RBAC bắt buộc |
| --- | --- | --- | --- |
| ADMIN | role hệ thống | dashboard, cấu hình, role, audit | toàn quyền theo tenant |
| STAFF | role hệ thống | CRM, lịch, tác vụ được cấp | không vào cấu hình/audit; scope chi nhánh |
| DOCTOR | role hệ thống | lịch hẹn, hồ sơ bệnh án, điều trị | chỉ hồ sơ/chi nhánh được cấp |
| STAFF_SALES | role động → STAFF | lead → customer, CRM | chỉ module/action đã cấp |
| STAFF_CS | role động → STAFF | khách hàng, lịch hẹn, chăm sóc | không xem dữ liệu ngoài scope |
| DOCTOR_LEAD | role động → DOCTOR | lịch, hồ sơ, treatment | không vào hệ thống/cấu hình |

Role động phải có `branch-role-assignments` thực tế; khi đăng nhập, `activeRole` trong JWT phải là key role động và `roleMain` là role kế thừa.

## Đã khởi tạo

- Playwright trong `cms/`, cấu hình tại `cms/playwright.config.ts`.
- Test authentication và smoke ADMIN.
- Ma trận URL/RBAC cho tất cả role hiện có, tự bật khi khai báo credentials.
- Luồng API CRM/khám: lead → customer, customer → hồ sơ bệnh án/lịch hẹn và hóa đơn. Mọi record sinh ra có tiền tố `E2E-` và được archive sau từng test.
- Kiểm thử API cấu hình: ADMIN đọc role/role assignment; các role còn lại bị từ chối với HTTP 403.
- Artifact khi lỗi: screenshot, video và trace; CI retry tối đa 2 lần.

## Suite đang có

| File | Kịch bản |
| --- | --- |
| `cms/e2e/auth.spec.ts` | đăng nhập sai; ADMIN đăng nhập và vào dashboard |
| `cms/e2e/rbac.spec.ts` | route allow/deny và JWT contract cho đủ 6 role |
| `cms/e2e/crm-clinical.spec.ts` | lead→customer; customer→medical episode/appointment; invoice PAID |
| `cms/e2e/settings.spec.ts` | role configuration API allow cho ADMIN, deny cho các role khác |

## Chuẩn bị môi trường E2E

1. Khởi động stack local: `docker compose -f docker-compose.dev.yml up --build`.
2. Dùng database/tenant riêng, seed tối thiểu: chi nhánh, mỗi role một tài khoản, customer, lead, lịch hẹn, staff/doctor, product/service. Tạo role động `STAFF_SALES`, `STAFF_CS`, `DOCTOR_LEAD` rồi gán role theo chi nhánh.
3. Thiết lập secrets trong CI hoặc shell (không ghi vào `.env.example`):

```bash
export E2E_CMS_URL=http://localhost:9999
export E2E_ADMIN_IDENTIFIER=admin@clinic.test
export E2E_ADMIN_PASSWORD='...'
export E2E_STAFF_IDENTIFIER='...'
export E2E_STAFF_PASSWORD='...'
# Lặp lại cho DOCTOR, STAFF_SALES, STAFF_CS, DOCTOR_LEAD.
```

4. Cài browser một lần: `cd cms && npx playwright install chromium`.
5. Chạy: `npm run test:e2e`; xem báo cáo: `npm run test:e2e:report`.

Các role chưa có credentials được Playwright đánh dấu `skipped`, không phải `passed`. CI release phải khai báo đủ sáu cặp credentials.

## Lộ trình triển khai

| Pha | Nội dung | Tiêu chí hoàn tất |
| --- | --- | --- |
| 0. Foundation | Hoàn tất role fixtures, test tenant độc lập, dữ liệu deterministic, cleanup qua API | chạy lặp lại không phụ thuộc DB dev |
| 1. Critical smoke | login/logout, dashboard, route guard, CRUD customer/lead/appointment, upload | PR nào cũng chạy < 10 phút |
| 2. RBAC & branch scope | ma trận module/action/screen, direct API 401/403, đổi chi nhánh, role động | mỗi role có allow + deny case |
| 3. Core workflows | lead→customer→appointment→consultation→service order→invoice; kho; leave/payroll; workflow approve/reject | dữ liệu và trạng thái cuối đúng |
| 4. CMS publishing | landing page/form/domain/theme, file, chatbot, preview public | publish/unpublish có kiểm tra landing |
| 5. Hardening | mobile Chromium, accessibility smoke, visual baseline cho login/dashboard/form, parallel/sharding | nightly suite ổn định, trace triage được |

Ưu tiên đầu tiên: Pha 0–2. Chỉ thêm test UI vào luồng nghiệp vụ sau khi có selector ổn định (`data-testid`) ở các nút và form trọng yếu; không dựa vào CSS class hoặc thứ tự cột bảng.
