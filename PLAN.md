# PHẦN MỀM QUẢN LÝ PHÒNG KHÁM THẨM MỸ
## Kế hoạch tổng thể (Master Plan)

---

## 1. TỔNG QUAN HỆ THỐNG

### Mục tiêu
Xây dựng phần mềm quản lý phòng khám thẩm mỹ toàn diện, vận hành trên nền Web App, phục vụ quy mô lớn (>5 bác sĩ, >30 nhân viên, **nhiều cơ sở — hỗ trợ từ Phase 1**).

### Các quyết định đã chốt
| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Đa cơ sở | **CÓ** — Tích hợp từ Phase 1, mọi dữ liệu gắn `branchId` |
| 2 | Tích hợp kế toán (MISA/Fast) | Chưa cần |
| 3 | Form đặt lịch online cho khách | **CÓ** — Public booking page, khách tự đặt qua website |
| 4 | Kết nối máy xét nghiệm (LIS) | Chưa cần |
| 5 | Backup/Disaster Recovery nâng cao | Chưa cần, backup Supabase mặc định là đủ |

### Tech Stack
| Layer | Công nghệ |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI Library | shadcn/ui + Tailwind CSS |
| Backend | Next.js API Routes + Prisma ORM |
| Database | PostgreSQL |
| Auth | NextAuth.js (JWT + Session) |
| File Storage | Supabase Storage hoặc AWS S3 (ảnh before/after, tài liệu) |
| Real-time | Pusher hoặc Supabase Realtime (dashboard lịch hẹn live) |
| Email/SMS | Resend (email) + VIETGUYS/ESMS (SMS nhắc lịch) |
| Barcode | react-barcode + ZXing (quét mã vạch bằng camera) |
| PDF | react-pdf (xuất phiếu, hợp đồng) |
| Chữ ký điện tử | Signature Pad (ký trên iPad) |
| Deploy | Vercel (frontend) + Supabase/Neon (PostgreSQL) |
| Audit Log | Custom middleware ghi mọi thao tác |

---

## 2. KIẾN TRÚC HỆ THỐNG

```
┌─────────────────────────────────────────────────────────┐
│                      NEXT.JS APP                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Frontend   │  │  API Routes  │  │  Middleware   │  │
│  │  (React UI)  │  │  (REST API)  │  │ (Auth+Audit)  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
           │                    │
    ┌──────┴──────┐    ┌────────┴────────┐
    │  PostgreSQL │    │  File Storage   │
    │  (Prisma)   │    │  (S3/Supabase)  │
    └─────────────┘    └─────────────────┘

Public-facing (không cần login):
    /booking/[branch-slug]  →  Form đặt lịch online cho khách
```

### Kiến trúc đa cơ sở (Multi-Branch)
- Mỗi `Branch` có slug riêng (VD: `co-so-quan-1`, `co-so-binh-thanh`)
- **Tất cả bảng dữ liệu nghiệp vụ đều có `branchId`:** Khách hàng, Lịch hẹn, Hóa đơn, Kho, Chi phí
- `SUPER_ADMIN` thấy toàn bộ dữ liệu tất cả cơ sở
- `ADMIN` chỉ thấy dữ liệu cơ sở mình phụ trách (lọc tự động qua middleware)
- Tồn kho **độc lập theo từng cơ sở** (không chia sẻ kho)
- Báo cáo có thể xem **theo từng cơ sở** hoặc **tổng hợp toàn hệ thống**

### Phân quyền (RBAC)
| Role | Mô tả |
|---|---|
| `SUPER_ADMIN` | Toàn quyền, xem audit log, quản lý tài khoản |
| `ADMIN` | Quản lý vận hành, xem báo cáo tổng |
| `DOCTOR` | Xem/ghi hồ sơ bệnh án, kê vật tư, chỉ định dịch vụ |
| `NURSE` | Hậu phẫu, xuất vật tư kit, ghi diễn tiến |
| `RECEPTIONIST` | Lịch hẹn, tiếp nhận khách, thu tiền |
| `SALE` | Tư vấn khách, xem hoa hồng của mình |
| `WAREHOUSE` | Nhập/xuất kho, kiểm kê |
| `ACCOUNTANT` | Thu chi, hoa hồng, báo cáo tài chính |

---

## 3. CÁC MODULE CHI TIẾT

---

### MODULE 1: QUẢN LÝ KHÁCH HÀNG

#### 1.1 Hồ sơ khách hàng
- **Thông tin cá nhân:** Họ tên, ngày sinh, giới tính, CCCD, địa chỉ, email
- **Số điện thoại:** Hiển thị ẩn 3 số cuối (0901***456) với role thường. Chỉ `ADMIN`, `RECEPTIONIST` xem đủ. Click để reveal (có log lại). Xuất Excel hàng loạt → số điện thoại bị ẩn hoàn toàn.
- **Trạng thái khách hàng:**
  - `CONSULTING` – Đang tư vấn
  - `WAITING_SURGERY` – Chờ phẫu thuật
  - `IN_TREATMENT` – Đang điều trị
  - `COMPLETED` – Đã hoàn thành
  - `INACTIVE` – Khách cũ lâu ngày (tự chuyển sau X tháng không tương tác)
- **Phân hạng tự động theo tổng chi tiêu:**
  - Bronze < 10tr | Silver 10–50tr | Gold 50–200tr | Diamond > 200tr
  - Chiết khấu tự động nhảy theo hạng
- **Ghi chú nhanh:** Mục riêng ghi phát sinh (VD: "Khách than phiền hậu phẫu ngày 3" → xử lý gì)
- **Chống trùng lặp:** Kiểm tra số điện thoại + CCCD khi tạo mới. Gợi ý merge nếu nghi ngờ trùng.

#### 1.2 Hồ sơ bệnh án (Medical Record)
Mỗi **dịch vụ/lần điều trị** là 1 episode riêng, bao gồm:

```
Episode (1 dịch vụ)
├── Bệnh sử (Chief Complaint)
├── Tiền sử
│   ├── Bệnh nền (cảnh báo đỏ nếu có)
│   └── Dị ứng (cảnh báo đỏ, hiện banner khi mở hồ sơ)
├── Bác sĩ chỉ định
│   ├── Tên dịch vụ/phẫu thuật
│   └── Gắn template vật tư (Kit phẫu thuật)
├── Xét nghiệm & hình ảnh (scan/upload)
├── Diễn tiến cuộc mổ
│   ├── Sinh hiệu (mạch, huyết áp, SpO2, nhiệt độ)
│   ├── Ghi chú bác sĩ
│   └── Vật tư đã xuất (tự động hoặc thêm phát sinh)
├── Hậu phẫu (theo từng ngày)
└── Trạng thái: Đang điều trị / Hoàn thành
```

#### 1.3 Kho ảnh Before/After
- Upload ảnh theo từng mốc: **Trước**, **7 ngày**, **1 tháng**, **3 tháng**, **6 tháng**, **1 năm**
- Gắn với episode (dịch vụ cụ thể)
- Lưu trên S3/Supabase Storage, có URL riêng tư (signed URL)
- Tích hợp trực tiếp trong phần mềm (không dùng file riêng)

#### 1.4 Form nhập liệu & Chữ ký điện tử
- **Phiếu tư vấn / Giấy cam kết phẫu thuật:** Xuất PDF, ký trên iPad (Signature Pad)
- Chữ ký điện tử lưu dạng hình ảnh PNG gắn vào PDF, có timestamp, IP, tên người ký
- Tuân thủ Nghị định 130/2018/NĐ-CP về chữ ký điện tử

#### 1.5 Bộ lọc & Tìm kiếm
- Lọc theo: trạng thái, hạng KH, dịch vụ đã dùng, bác sĩ phụ trách, khoảng thời gian

---

### MODULE 2: QUẢN LÝ LỊCH HẸN & ĐIỀU PHỐI

#### 2.1 Đặt lịch hẹn
- Loại hẹn: Tư vấn / Phẫu thuật / Tái khám / Liệu trình
- Gắn với: Bác sĩ + Phòng mổ/Phòng khám + Thiết bị (nếu cần)
- **Cảnh báo chồng chéo:** Không cho đặt nếu BS/phòng/máy đã có lịch trong khung giờ đó

#### 2.2 Dashboard tổng thể phòng khám (Live View)
**Giao diện bảng màu trực quan:**

```
┌─────────┬─────────┬─────────┬─────────┬──────────────┐
│ CHỜ ĐỢI │ TƯ VẤN  │ PHÒNG MỔ│ HẬU PHẪU│   RA VỀ    │
│  🟡 3   │  🟢 2   │  🔴 1   │  🔵 4   │    ✅ 8     │
├─────────┴─────────┴─────────┴─────────┴──────────────┤
│ Danh sách khách theo từng khu vực (click để xem chi tiết)│
└──────────────────────────────────────────────────────┘
```

- Màu sắc: Chờ (vàng), Tư vấn (xanh lá), Đang mổ (đỏ), Hậu phẫu (xanh dương), Quá giờ chưa đến (cam)
- Cập nhật real-time
- Thống kê: Tỷ lệ no-show (đặt hẹn nhưng không đến)

#### 2.3 Quản lý nguồn lực
- Danh sách bác sĩ + lịch trực
- Danh sách phòng mổ, phòng khám
- Danh sách máy móc/thiết bị (có thể gắn vào lịch hẹn)
- Tất cả nguồn lực gắn với `branchId` (không chia sẻ giữa cơ sở)

#### 2.4 Form đặt lịch online (Public Booking)
- URL public: `phongkham.vn/booking/[branch-slug]`
- Khách điền: Họ tên, SĐT, dịch vụ muốn tư vấn, khung giờ mong muốn
- Hệ thống tạo appointment với status `PENDING_CONFIRMATION`
- Nhân viên lễ tân nhận thông báo → xác nhận/điều chỉnh → SMS xác nhận gửi về khách
- Chỉ hiển thị các khung giờ còn trống của bác sĩ/phòng (không cho đặt trùng)
- **Không yêu cầu đăng nhập** — khách điền form đơn giản

---

### MODULE 3: QUẢN LÝ KHO & VẬT TƯ

#### 3.1 Cấu trúc hàng hóa
```
Hàng hóa
├── Ngành → Nhóm → Loại (phân cấp 3 tầng)
├── Loại sản phẩm:
│   ├── VẬT TƯ TIÊU HAO (dùng 1 lần, xuất 1 chiều)
│   ├── DỤNG CỤ TÁI SỬ DỤNG (xuất – trả lại kho sau mổ)
│   └── SẢN PHẨM BÁN LẺ (tách biệt doanh số)
├── Đơn vị nhập: Thùng/Hộp/Chai
└── Đơn vị xuất: Cái/Ống/Chiếc/ml (quy đổi tự động)
```

#### 3.2 Nhập kho
- Nhập theo Thùng/Hộp → Hệ thống tự quy đổi ra đơn vị nhỏ
- Gắn: Mã lô hàng, Hạn sử dụng, Nhà cung cấp, Giá nhập
- Quét mã vạch để nhập nhanh (camera điện thoại hoặc máy quét)

#### 3.3 Xuất kho theo Kit phẫu thuật
```
KIT NÂNG MŨI
├── Vật tư tiêu hao:
│   ├── Chỉ khâu  x2
│   ├── Gạc vô trùng x5
│   ├── Thuốc tê x1 ống
│   └── Dao mổ x1
└── Dụng cụ tái sử dụng:
    ├── Panh  x1 (xuất → trả lại sau mổ)
    └── Kéo phẫu thuật x1 (xuất → trả lại sau mổ)
```
- Luồng xuất: Nhấp tên KH → Chọn dịch vụ hôm nay → Load Kit mặc định → Thêm/bớt phát sinh → Xác nhận xuất kho
- Gắn **mã số lô hàng** với từng bệnh nhân → Truy xuất nguồn gốc dễ dàng

#### 3.4 Cảnh báo & Kiểm soát
- **Hạn sử dụng:** Cảnh báo 30/15/7 ngày trước hết hạn. FIFO tự động (ưu tiên xuất lô gần hết hạn trước)
- **Tồn kho tối thiểu:** Cảnh báo khi dưới ngưỡng. Tự tạo đề xuất đặt hàng → Gửi email cho nhà cung cấp
- **Kiểm kê:** Đếm thực tế vs hệ thống, ghi chênh lệch

---

### MODULE 4: QUẢN LÝ LIỆU TRÌNH

#### 4.1 Phác đồ điều trị
- Bác sĩ tạo phác đồ: Số buổi, thông số kỹ thuật từng buổi
- Cấu hình khoảng cách giữa các buổi (VD: Buổi 2 cách buổi 1 là 21 ngày)
- Hệ thống **tự đẩy lịch** các buổi tiếp theo sau khi hoàn thành buổi trước

#### 4.2 Theo dõi thực hiện
- Trạng thái từng buổi: Chờ / Đã thực hiện / Trễ hẹn / Bỏ
- Khi khách trễ buổi: Ghi nhận, hỏi lý do, rebook lịch mới (không xóa lịch cũ)
- Vật tư tiêu hao theo buổi: Gắn định mức vật tư cho từng loại liệu trình, thêm/bớt được

#### 4.3 Nhắc lịch tự động
- SMS/Zalo OA nhắc trước 24h và 2h
- Nếu KH confirm → cập nhật trạng thái

---

### MODULE 5: QUẢN LÝ THU CHI

#### 5.1 Thu tiền
- Gắn với dịch vụ/hóa đơn của KH
- Phương thức: Tiền mặt / Chuyển khoản / Thẻ / Quẹt thẻ
- Trả nhiều lần (trả trước đặt cọc, trả sau khi mổ)
- Xuất hóa đơn/phiếu thu PDF

#### 5.2 Chi phí vận hành
- Ghi nhận: Tiền điện, nước, lương NV, thuê mặt bằng, mua sắm
- Phân loại chi phí theo danh mục

#### 5.3 Công nợ nhà cung cấp
- Theo dõi hạn nợ, tuổi nợ
- Cảnh báo khi đến hạn thanh toán

---

### MODULE 6: QUẢN LÝ HOA HỒNG

#### 6.1 Cấu hình tự động
- **Bác sĩ:** Tiền công theo từng loại phẫu thuật (cố định hoặc % doanh thu)
- **Sale:** % trên doanh thu dịch vụ mà sale tư vấn thành công
- **Điều dưỡng:** Thưởng theo buổi phụ mổ hoặc liệu trình

#### 6.2 Tính toán & Báo cáo
- Tự động tính sau khi KH thanh toán xong
- Bảng hoa hồng theo tháng cho từng nhân viên
- Xuất bảng lương hoa hồng

---

### MODULE 7: QUẢN LÝ NHÀ CUNG CẤP

- Thông tin NCC: Tên, địa chỉ, người liên hệ, email, số điện thoại
- Lưu trữ: Chứng chỉ, giấy phép kinh doanh, giấy phép lưu hành sản phẩm (có cảnh báo hết hạn)
- Lịch sử nhập hàng, công nợ
- Gắn với sản phẩm: Mỗi sản phẩm biết nhập từ NCC nào, giá nào
- Tạo và gửi đề nghị đặt hàng qua email trực tiếp từ hệ thống
- **Lưu ý:** Dù số lượng NCC nhỏ (~10), vẫn nên tích hợp vào hệ thống (không dùng file riêng) để liên kết với kho, thu chi tự động.

---

### MODULE 8: QUẢN LÝ HÀNG HÓA & MÃ VẠCH

- Danh mục sản phẩm phân cấp: Ngành → Nhóm → Loại
- Giá theo nhóm khách hàng (Bronze/Silver/Gold/Diamond)
- Quét mã vạch: Dùng camera điện thoại (ZXing) hoặc máy quét USB
- Thiết bị đề xuất: 1-2 máy quét USB để bàn tại kho + dùng smartphone cho kiểm kê di động

---

### MODULE 9: QUẢN LÝ BÁN HÀNG LẺ

- Tách biệt với dịch vụ thẩm mỹ (doanh số riêng)
- POS đơn giản: Tìm sản phẩm → Quét mã vạch → Thanh toán
- Liên kết trừ kho tự động

---

### MODULE 10: CHĂM SÓC KHÁCH HÀNG

- Lịch sử tương tác (gọi điện, nhắn tin, đến khám)
- Nhắc lịch tự động (liệu trình, tái khám định kỳ)
- Phân loại KH lâu ngày chưa quay lại → Danh sách cần chăm sóc lại
- Template SMS/Email chăm sóc

---

### MODULE 11: QUẢN LÝ NHÂN VIÊN

- Thông tin NV: Hồ sơ, chức vụ, phân quyền, lịch trực
- Lịch làm việc của bác sĩ (gắn với lịch hẹn)
- Bảng công, theo dõi KPI

---

### MODULE 12: BÁO CÁO

| Báo cáo | Mô tả |
|---|---|
| Doanh thu | Theo ngày/tuần/tháng, theo dịch vụ, theo bác sĩ |
| Khách hàng | Mới/quay lại, theo hạng, no-show rate |
| Kho | Nhập/xuất/tồn, sắp hết hạn, dưới tồn tối thiểu |
| Hoa hồng | Theo nhân viên, theo tháng |
| Chi phí | Vận hành vs doanh thu (P&L đơn giản) |
| Công nợ | Khách nợ, NCC nợ |

---

### MODULE 13: BẢO MẬT & KIỂM SOÁT DỮ LIỆU

#### 13.1 Audit Log (Ghi nhận mọi thao tác)
Mọi hành động đều được log:
```
{timestamp} [USER: nguyenvana] [ACTION: EXPORT_CUSTOMER_LIST] [IP: 192.168.1.x]
{timestamp} [USER: tranthibinh] [ACTION: VIEW_PHONE] [CUSTOMER: KH-001] [IP: ...]
{timestamp} [USER: admin] [ACTION: EDIT_RECORD] [OLD: ...] [NEW: ...] [IP: ...]
```
- Admin xem audit log theo user, theo thời gian, theo loại hành động
- Không ai có thể xóa audit log

#### 13.2 Bảo vệ dữ liệu khách hàng
- Số điện thoại: Ẩn 3 số cuối, click reveal → log lại ai đã xem
- Xuất Excel hàng loạt: Cần quyền đặc biệt + log lại. Số điện thoại trong file xuất bị ẩn.
- Không cho phép chụp màn hình trong app (mobile PWA mode)

---

## 4. DATABASE SCHEMA (Tổng quan)

```
customers                    -- Khách hàng
medical_episodes             -- 1 đợt điều trị/dịch vụ
medical_records              -- Chi tiết hồ sơ bệnh án
vital_signs                  -- Sinh hiệu trong mổ
patient_photos               -- Ảnh before/after
appointments                 -- Lịch hẹn
appointment_resources        -- BS/Phòng/Máy gắn với lịch hẹn
treatment_plans              -- Phác đồ liệu trình
treatment_sessions           -- Từng buổi liệu trình

products                     -- Sản phẩm/vật tư
product_categories           -- Phân loại sản phẩm
surgery_kits                 -- Template kit phẫu thuật
surgery_kit_items            -- Thành phần của kit
suppliers                    -- Nhà cung cấp
supplier_documents           -- Giấy tờ NCC

stock_batches                -- Lô hàng nhập kho
stock_movements              -- Mọi nhập/xuất kho
stock_dispensing             -- Xuất vật tư cho bệnh nhân (gắn episode)

invoices                     -- Hóa đơn
invoice_items                -- Dòng hóa đơn
payments                     -- Thanh toán
expenses                     -- Chi phí vận hành

commissions                  -- Hoa hồng tính toán
commission_rules             -- Cấu hình % hoa hồng

users                        -- Tài khoản nhân viên
roles                        -- Phân quyền
audit_logs                   -- Log mọi thao tác
```

---

## 5. LỘ TRÌNH PHÁT TRIỂN

### PHASE 1 – MVP Core (10-12 tuần)
**Mục tiêu:** Phòng khám có thể vận hành cơ bản — ĐA CƠ SỞ từ đầu

| Sprint | Tính năng |
|---|---|
| Sprint 1 (2 tuần) | Setup dự án, **cấu trúc đa cơ sở (Branch)**, Auth + RBAC, Quản lý tài khoản |
| Sprint 2 (2 tuần) | Quản lý Khách hàng (hồ sơ, tìm kiếm, trạng thái, ẩn SĐT, lọc theo chi nhánh) |
| Sprint 3 (2 tuần) | Hồ sơ bệnh án (episode, bệnh sử, tiền sử, cảnh báo dị ứng) |
| Sprint 4 (2 tuần) | Quản lý Lịch hẹn nội bộ (đặt lịch, cảnh báo chồng chéo, dashboard màu live) |
| Sprint 5 (2 tuần) | **Form đặt lịch online** (public booking page per branch, SMS xác nhận) |
| Sprint 6 (2 tuần) | Audit Log, bảo mật dữ liệu, báo cáo đa cơ sở, kiểm thử Phase 1 |

### PHASE 2 – Kho & Tài chính (6-8 tuần)
| Sprint | Tính năng |
|---|---|
| Sprint 7 (2 tuần) | Quản lý hàng hóa, nhà cung cấp, mã vạch (per branch) |
| Sprint 8 (2 tuần) | Nhập/xuất kho, Kit phẫu thuật, cảnh báo hạn/tồn kho |
| Sprint 9 (2 tuần) | Thu chi, hóa đơn, hoa hồng tự động |
| Sprint 10 (2 tuần) | Liệu trình, nhắc lịch SMS, báo cáo cơ bản (per branch + tổng hợp) |

### PHASE 3 – Nâng cao (4-6 tuần)
| Sprint | Tính năng |
|---|---|
| Sprint 11 (2 tuần) | Kho ảnh Before/After, chữ ký điện tử trên iPad |
| Sprint 12 (2 tuần) | Báo cáo nâng cao, dashboard BI tổng hợp toàn hệ thống, xuất PDF |
| Sprint 13 (2 tuần) | Chăm sóc KH, tích hợp Zalo OA, chăm sóc sau điều trị |

---

## 6. CÁC QUYẾT ĐỊNH KỸ THUẬT QUAN TRỌNG

### Về số điện thoại
- Lưu DB dạng nguyên vẹn (có mã hóa field-level nếu cần)
- Hiển thị: Mask 3 số cuối theo default
- API `/api/customers/[id]/reveal-phone` → chỉ ADMIN/RECEPTIONIST gọi được → log lại
- Export Excel: Strip số cuối → không bao giờ export đủ qua bulk action

### Về Kit phẫu thuật
- Kit là template có thể tùy chỉnh per-episode
- Khi bác sĩ chỉ định dịch vụ → Load kit mặc định → Nurse có thể thêm/bớt phát sinh → Xác nhận → Trừ kho
- Dụng cụ tái sử dụng: Xuất kho → Trả lại → Nhập kho (movement type: LOAN/RETURN)

### Về đơn vị tính
- Mỗi sản phẩm có `purchase_unit` (Thùng) và `usage_unit` (Cái) + `conversion_factor` (1 Thùng = 100 Cái)
- Nhập kho tính theo `purchase_unit`, xuất kho tính theo `usage_unit`
- Tồn kho lưu theo `usage_unit`

### Về chữ ký điện tử
- Dùng Signature Pad (canvas-based) trên iPad
- Lưu PNG của chữ ký + metadata: timestamp, IP, tên người ký, loại tài liệu
- Nhúng vào PDF bằng `pdf-lib` hoặc `react-pdf`
- Tuân thủ NĐ 130/2018: Cần xác thực danh tính người ký (login trước khi ký)

### Về real-time dashboard
- Dùng Supabase Realtime hoặc Pusher Channels
- Khi NV cập nhật trạng thái KH (VD: "đưa vào phòng mổ") → Dashboard của Lễ tân cập nhật ngay

---

## 7. CÁC ĐIỂM KỸ THUẬT CẦN LƯU Ý VỀ ĐA CƠ SỞ

### Middleware lọc dữ liệu theo branch
```typescript
// Mọi API route đều chạy qua middleware này
// SUPER_ADMIN: không filter, thấy hết
// ADMIN/các role khác: tự động thêm WHERE branchId = session.user.branchId
function withBranchFilter(handler) {
  return async (req, res) => {
    const session = await getSession(req)
    if (session.user.role !== 'SUPER_ADMIN') {
      req.branchId = session.user.branchId  // Inject vào request
    }
    return handler(req, res)
  }
}
```

### Bảng nào cần `branchId`
| Bảng | Lý do |
|---|---|
| `customers` | KH thuộc về cơ sở nào (có thể chuyển cơ sở) |
| `appointments` | Lịch hẹn tại cơ sở cụ thể |
| `medical_episodes` | Dịch vụ thực hiện tại cơ sở nào |
| `invoices` | Doanh thu ghi nhận tại cơ sở nào |
| `expenses` | Chi phí của cơ sở nào |
| `stock_batches` | Kho độc lập theo cơ sở |
| `resources` | Phòng mổ/máy móc thuộc cơ sở nào |
| `users` | NV làm việc tại cơ sở nào |

### Form đặt lịch online — Luồng xử lý
```
Khách vào /booking/[branch-slug]
    → Chọn dịch vụ → Chọn ngày/giờ (chỉ thấy slot còn trống)
    → Điền Họ tên + SĐT → Submit
    → Appointment tạo với status: PENDING_CONFIRMATION
    → Lễ tân nhận notification → Confirm/Reschedule
    → SMS gửi về khách: "Lịch hẹn của bạn đã được xác nhận lúc..."
    → SMS nhắc lịch trước 24h
```
