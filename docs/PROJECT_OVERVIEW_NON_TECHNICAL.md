# 📊 ERP TRANGO v3.0 - BÁO CÁO TỔNG QUAN DỰ ÁN

**Ngày lập:** Tháng 02/2026  
**Phiên bản:** 3.0  
**Loại dự án:** Phần mềm quản lý doanh nghiệp ERP

---

## MỤC LỤC

1. [Cây thư mục dự án](#1-cây-thư-mục-dự-án)
2. [Các module/chức năng chính](#2-các-modulechức-năng-chính)
3. [Công nghệ sử dụng](#3-công-nghệ-sử-dụng)
4. [Cấu trúc dữ liệu (Database)](#4-cấu-trúc-dữ-liệu-database)

---

## 1. CÂY THƯ MỤC DỰ ÁN

```
ERP Trango v3.0/
│
├── 📁 apps/                         # Thư mục chính chứa ứng dụng
│   │
│   ├── 📁 api/                      # PHẦN MỀM PHÍA SERVER (Backend)
│   │   ├── 📁 prisma/               # Cấu hình database
│   │   │   └── schema.prisma        # Sơ đồ các bảng dữ liệu
│   │   │
│   │   ├── 📁 src/                  # Mã nguồn server
│   │   │   ├── 📁 auth/             # Đăng nhập, xác thực
│   │   │   ├── 📁 customers/        # Quản lý khách hàng
│   │   │   ├── 📁 products/         # Quản lý sản phẩm
│   │   │   ├── 📁 projects/        # Quản lý đơn hàng/dự án
│   │   │   ├── 📁 suppliers/        # Quản lý nhà cung cấp
│   │   │   ├── 📁 transactions/     # Giao dịch thu/chi
│   │   │   ├── 📁 wallets/          # Quản lý ví tiền
│   │   │   ├── 📁 workshops/        # Quản lý xưởng gia công
│   │   │   ├── 📁 workshop-jobs/     # Phiếu gia công
│   │   │   └── 📁 ...các module khác
│   │   │
│   │   └── 📁 uploads/              # File đã tải lên
│   │
│   └── 📁 web/                      # PHẦN MỀM PHÍA KHÁCH HÀNG (Frontend)
│       ├── 📁 app/                  # Mã nguồn web
│       │   ├── 📁 (authenticated)/  # Các trang cần đăng nhập
│       │   │   ├── 📁 orders/       # Trang đơn hàng
│       │   │   ├── 📁 partners/     # Trang đối tác (KH/NCC/Xưởng)
│       │   │   ├── 📁 catalog/      # Trang danh mục sản phẩm
│       │   │   ├── 📁 cashbook/     # Trang sổ quỹ
│       │   │   ├── 📁 fund/         # Trang quản lý quỹ
│       │   │   ├── 📁 workshops/     # Trang xưởng gia công
│       │   │   ├── 📁 reports/       # Trang báo cáo
│       │   │   └── 📁 settings/      # Trang cài đặt
│       │   │
│       │   └── 📁 login/            # Trang đăng nhập
│       │
│       ├── 📁 components/           # Các thành phần giao diện
│       │   ├── 📁 ui/               # Nút bấm, ô nhập, bảng...
│       │   ├── 📁 sidebar.tsx       # Thanh menu bên trái
│       │   ├── 📁 topbar.tsx        # Thanh menu trên cùng
│       │   └── 📁 ...các thành phần khác
│       │
│       └── 📁 lib/                  # Các hàm tiện ích
│           └── 📁 data/
│               └── vietnam-addresses.ts  # Danh sách tỉnh/thành VN
│
├── 📁 packages/                     # Mã nguồn dùng chung
│   └── shared/                     # Định nghĩa kiểu dữ liệu chung
│
└── 📁 docs/                        # Tài liệu dự án

```

---

## 2. CÁC MODULE/CHỨC NĂNG CHÍNH

### 2.1. Module Đơn hàng (Orders)

| Chức năng | Mô tả |
|-----------|--------|
| **Danh sách đơn hàng** | Xem tất cả đơn hàng, lọc theo trạng thái, thời gian |
| **Chi tiết đơn hàng** | Xem thông tin đầy đủ của một đơn hàng |
| **Tạo đơn hàng mới** | Thêm đơn hàng mới vào hệ thống |
| **Hạng mục đơn hàng** | Các sản phẩm/dịch vụ trong đơn hàng |
| **Nghiệm thu** | Xác nhận số lượng sản phẩm đã hoàn thành (SLNT) |
| **Sản xuất** | Tạo phiếu gia công cho đơn hàng |

### 2.2. Module Sản phẩm (Products)

| Chức năng | Mô tả |
|-----------|--------|
| **Danh mục sản phẩm** | Xem danh sách tất cả sản phẩm |
| **Biến thể sản phẩm** | Các loại/kích cỡ/màu của sản phẩm |
| **Giá bán** | Giá mặc định và giá theo biến thể |
| **Đơn vị tính** | Đơn vị tính của sản phẩm (cái, mét, kg...) |

### 2.3. Module Đối tác (Partners)

| Chức năng | Mô tả |
|-----------|--------|
| **Khách hàng** | Thông tin liên hệ, địa chỉ, khu vực của khách |
| **Nhà cung cấp** | Thông tin nhà cung cấp nguyên vật liệu |
| **Xưởng gia công** | Thông tin xưởng gia công, mã màu riêng |
| **Chọn địa chỉ** | Chọn Tỉnh/Thành phố (Quận/Huyện, Xã/Phường nhập tay) |

### 2.4. Module Sản xuất (Workshop Jobs)

| Chức năng | Mô tả |
|-----------|--------|
| **Danh sách phiếu gia công** | Xem tất cả phiếu gia công |
| **Tạo phiếu gia công** | Tạo phiếu mới giao cho xưởng |
| **Hạng mục gia công** | Các sản phẩm cần gia công |
| **Thanh toán** | Tạo phiếu chi thanh toán cho xưởng |
| **Lịch sử thanh toán** | Xem các khoản đã thanh toán |

### 2.5. Module Tài chính (Fund/Cashbook)

| Chức năng | Mô tả |
|-----------|--------|
| **Ví tiền** | Quản lý các quỹ tiền (ví chính, ví phụ...) |
| **Thu tiền** | Tạo phiếu thu từ khách hàng |
| **Chi tiền** | Tạo phiếu chi (trả NCC, trả xưởng...) |
| **Chuyển tiền** | Chuyển tiền giữa các ví |
| **Sổ quỹ** | Xem tất cả giao dịch thu/chi |

### 2.6. Module Báo cáo (Reports)

| Chức năng | Mô tả |
|-----------|--------|
| **Báo cáo doanh thu** | Doanh thu theo kênh, theo khách hàng |
| **Báo cáo chi phí** | Chi phí theo danh mục |
| **Báo cáo lợi nhuận** | Lợi nhuận theo đơn hàng |
| **Báo cáo theo vùng** | Doanh thu theo khu vực địa lý |

### 2.7. Module Cài đặt (Settings)

| Chức năng | Mô tả |
|-----------|--------|
| **Quản lý người dùng** | Tài khoản, quyền hạn người dùng |
| **Lịch sử thao tác** | Xem ai đã làm gì, khi nào (Audit log) |
| **Cấu hình hệ thống** | Các thiết lập chung |

---

## 3. CÔNG NGHỆ SỬ DỤNG

### 3.1. Backend (Phần mềm phía Server)

| Công nghệ | Mô tả |
|-----------|--------|
| **NestJS** | Framework xây dựng ứng dụng server |
| **Prisma** | Công cụ quản lý database |
| **PostgreSQL** | Hệ quản trị cơ sở dữ liệu |
| **JWT** | Công nghệ xác thực đăng nhập |
| **PostgreSQL** | Nơi lưu trữ tất cả dữ liệu |

### 3.2. Frontend (Phần mềm phía Khách hàng)

| Công nghệ | Mô tả |
|-----------|--------|
| **Next.js 14** | Framework xây dựng website |
| **React 18** | Thư viện xây giao diện |
| **TypeScript** | Ngôn ngữ lập trình có kiểm tra lỗi |
| **Tailwind CSS** | Công cụ thiết kế giao diện |
| **Lucide Icons** | Bộ icon sử dụng trong giao diện |

### 3.3. Công cụ hỗ trợ phát triển

| Công nghệ | Mô tả |
|-----------|--------|
| **Git** | Quản lý phiên bản mã nguồn |
| **ESLint** | Kiểm tra lỗi mã nguồn |
| **Prettier** | Định dạng mã nguồn đẹp |

---

## 4. CẤU TRÚC DỮ LIỆU (DATABASE)

### 4.1. Sơ đồ quan hệ các bảng chính

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KHỐI ĐƠN HÀNG                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐         ┌───────────────────┐                     │
│   │  PROJECT    │─────────│  PROJECT_ITEM     │                     │
│   │  (Đơn hàng) │  1:N    │  (Hạng mục ĐH)    │                     │
│   └─────────────┘         └───────────────────┘                     │
│         │                        │                                   │
│         │                        │                                   │
│         │         ┌──────────────┼──────────────┐                   │
│         │         │              │              │                   │
│         ▼         ▼              ▼              ▼                   │
│   ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐          │
│   │WorkshopJob│ │ProjectItem│ │WorkshopJob│ │Transaction│          │
│   │ (Phiếu GC)│ │(SLNT)    │ │  ITEM     │ │(Thu/Chi)  │          │
│   └─────┬─────┘ └──────────┘ └─────┬─────┘ └───────────┘          │
│         │                          │                                 │
│         │                          │                                 │
│         ▼                          ▼                                 │
│   ┌───────────────────────────────────────┐                          │
│   │  WORKSHOP (Xưởng gia công)           │                          │
│   └───────────────────────────────────────┘                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      KHỐI TÀI CHÍNH                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐         ┌───────────────────┐                     │
│   │  WALLET     │ 1:N     │  TRANSACTION      │                     │
│   │  (Ví tiền)  │◄────────│  (Giao dịch)      │                     │
│   └─────────────┘         └───────────────────┘                     │
│         │                        │                                   │
│         │                        │                                   │
│         └────────────────────────┤                                   │
│                                  │                                   │
│                                  ▼                                   │
│                         ┌───────────────┐                           │
│                         │ CUSTOMER      │                           │
│                         │ (Khách hàng)  │                           │
│                         └───────────────┘                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2. Chi tiết các bảng dữ liệu

#### 📋 Bảng PROJECT (Đơn hàng / Dự án)

| Tên trường | Ý nghĩa nghiệp vụ |
|------------|-------------------|
| `id` | Mã định danh duy nhất của đơn hàng |
| `code` | Mã đơn hàng (VD: KH-001) |
| `name` | Tên dự án/đơn hàng |
| `customer_id` | Khách hàng của đơn hàng |
| `status` | Trạng thái (MỚI, ĐANG LÀM, HOÀN THÀNH, HỦY) |
| `total_amount` | Tổng tiền đơn hàng |
| `created_at` | Ngày tạo đơn |
| `updated_at` | Ngày cập nhật cuối |

#### 📋 Bảng PROJECT_ITEM (Hạng mục trong đơn hàng)

| Tên trường | Ý nghĩa nghiệp vụ |
|------------|-------------------|
| `id` | Mã định danh hạng mục |
| `project_id` | Đơn hàng cha |
| `product_id` | Sản phẩm (nếu có) |
| `name` | Tên hạng mục/sản phẩm |
| `unit` | Đơn vị tính (cái, mét, m²...) |
| `qty` | Số lượng đặt |
| `unit_price` | Đơn giá bán |
| `accepted_qty` | Số lượng nghiệm thu (SLNT) |
| `accepted_unit_price` | Đơn giá nghiệm thu |

> **SLNT (Số lượng nghiệm thu):** Số sản phẩm thực tế khách hàng đã xác nhận nhận, dùng để tính tiền thanh toán cuối cùng.

#### 📋 Bảng WORKSHOP (Xưởng gia công)

| Tên trường | Ý nghĩa nghiệp vụ |
|------------|-------------------|
| `id` | Mã định danh xưởng |
| `code` | Mã xưởng (VD: X001) |
| `name` | Tên xưởng gia công |
| `phone` | Số điện thoại liên hệ |
| `address` | Địa chỉ xưởng |
| `color` | Mã màu hiển thị (VD: #f97316) |
| `is_active` | Xưởng còn hoạt động không |

#### 📋 Bảng WORKSHOP_JOB (Phiếu gia công)

| Tên trường | Ý nghĩa nghiệp vụ |
|------------|-------------------|
| `id` | Mã định danh phiếu |
| `code` | Mã phiếu (VD: JG0001) |
| `project_id` | Đơn hàng gốc |
| `workshop_id` | Xưởng gia công |
| `status` | Trạng thái (NHÁP, ĐANG LÀM, HOÀN THÀNH, ĐÃ GỬI, HỦY) |
| `start_date` | Ngày bắt đầu gia công |
| `due_date` | Ngày giao hàng |
| `amount` | Tổng tiền gia công |
| `paid_amount` | Số tiền đã thanh toán |

#### 📋 Bảng WORKSHOP_JOB_ITEM (Hạng mục trong phiếu gia công)

| Tên trường | Ý nghĩa nghiệp vụ |
|------------|-------------------|
| `id` | Mã định danh |
| `workshop_job_id` | Phiếu gia công cha |
| `product_id` | Sản phẩm (nếu có) |
| `product_name` | Tên sản phẩm/hạng mục |
| `unit` | Đơn vị tính |
| `quantity` | Số lượng gia công |
| `unit_price` | Đơn giá gia công |

#### 📋 Bảng CUSTOMER (Khách hàng)

| Tên trường | Ý nghĩa nghiệp vụ |
|------------|-------------------|
| `id` | Mã định danh khách hàng |
| `code` | Mã khách hàng |
| `name` | Tên khách hàng |
| `phone` | Số điện thoại |
| `province_code` | Mã Tỉnh/Thành phố |
| `province_name` | Tên Tỉnh/Thành phố |
| `district_code` | Mã Quận/Huyện |
| `district_name` | Tên Quận/Huyện |
| `ward_code` | Mã Xã/Phường |
| `ward_name` | Tên Xã/Phường |
| `address_line` | Số nhà, tên đường |
| `region` | Vùng (Miền Bắc, Trung, Nam) |

#### 📋 Bảng SUPPLIER (Nhà cung cấp)

| Tên trường | Ý nghĩa nghiệp vụ |
|------------|-------------------|
| `id` | Mã định danh NCC |
| `code` | Mã NCC |
| `name` | Tên NCC |
| `phone` | Điện thoại |
| `address` | Địa chỉ |
| Các trường địa chỉ khác | Giống Customer |

#### 📋 Bảng TRANSACTION (Giao dịch - Thu/Chi)

| Tên trường | Ý nghĩa nghiệp vụ |
|------------|-------------------|
| `id` | Mã định danh giao dịch |
| `type` | Loại (INCOME = Thu, EXPENSE = Chi) |
| `amount` | Số tiền |
| `wallet_id` | Ví tiền |
| `category_id` | Danh mục (nếu có) |
| `project_id` | Đơn hàng liên quan |
| `workshop_job_id` | Phiếu gia công liên quan |
| `date` | Ngày giao dịch |
| `note` | Ghi chú |

#### 📋 Bảng WALLET (Ví tiền)

| Tên trường | Ý nghĩa nghiệp vụ |
|------------|-------------------|
| `id` | Mã định danh ví |
| `name` | Tên ví (Ví chính, Ví phụ...) |
| `balance` | Số dư hiện tại |

---

## 5. LUỒNG NGHIỆP VỤ CHÍNH

### 5.1. Luồng tạo đơn hàng mới

```
1. Tạo đơn hàng mới
         │
         ▼
2. Thêm hạng mục sản phẩm (tên, đơn vị, số lượng, đơn giá)
         │
         ▼
3. Lưu đơn hàng
         │
         ▼
4. Khách hàng nghiệm thu → Cập nhật SLNT → Tính lại thành tiền
         │
         ▼
5. Tạo phiếu gia công (nếu cần) → Giao xưởng
         │
         ▼
6. Xưởng gia công xong → Thanh toán phiếu chi
         │
         ▼
7. Khách hàng thanh toán → Tạo phiếu thu
```

### 5.2. Luồng thanh toán cho xưởng gia công

```
Phiếu gia công hoàn thành
            │
            ▼
    Tạo phiếu chi mới
            │
            ▼
    Chọn ví thanh toán
            │
            ▼
    Nhập số tiền, ghi chú
            │
            ▼
    Lưu → Cập nhật số dư ví
    Cập nhật paid_amount trong phiếu gia công
```

---

## 6. QUY TẮC ĐẶT MÃ

| Loại | Quy tắc | Ví dụ |
|------|---------|--------|
| Đơn hàng | KH-001, KH-002... | KH-001 |
| Khách hàng | KHACH-001... | KHACH-001 |
| Nhà cung cấp | NCC-001... | NCC-001 |
| Xưởng gia công | X001, X002... | X001 |
| Phiếu gia công | JG0001, JG0002... | JG0001 |
| Phiếu thu | PT-001... | PT-001 |
| Phiếu chi | PC-001... | PC-001 |

---

## 7. TRẠNG THÁI CÁC ĐỐI TƯỢNG

### Đơn hàng (Project Status)
| Trạng thái | Mô tả |
|------------|--------|
| NEW | Mới tạo |
| IN_PROGRESS | Đang thực hiện |
| COMPLETED | Hoàn thành |
| CANCELLED | Đã hủy |
| DRAFT | Nháp |

### Phiếu gia công (WorkshopJob Status)
| Trạng thái | Mô tả |
|------------|--------|
| DRAFT | Nháp |
| IN_PROGRESS | Đang gia công |
| DONE | Hoàn thành |
| SENT | Đã gửi/hóa đơn |
| CANCELLED | Đã hủy |

### Giao dịch (Transaction Type)
| Loại | Mô tả |
|------|--------|
| INCOME | Phiếu thu (khách trả tiền) |
| EXPENSE | Phiếu chi (trả tiền NCC/xưởng) |

---

## 8. PHÂN QUYỀN NGƯỜI DÙNG

| Vai trò | Quyền hạn |
|---------|-----------|
| ADMIN | Toàn quyền hệ thống |
| USER | Thao tác theo phân công |

---

## 9. HƯỚNG DẪN SỬ DỤNG NHANH

### Đăng nhập hệ thống
1. Truy cập địa chỉ web
2. Nhập username/password
3. Nhấn "Đăng nhập"

### Tạo đơn hàng mới
1. Vào menu **Đơn hàng** → **Danh sách**
2. Nhấn nút **Tạo mới**
3. Nhập thông tin đơn hàng
4. Thêm sản phẩm vào đơn
5. Nhấn **Lưu**

### Tạo phiếu gia công
1. Mở **Chi tiết đơn hàng**
2. Chuyển sang tab **Sản xuất**
3. Nhấn **Tạo phiếu gia công**
4. Chọn xưởng, nhập ngày, thêm sản phẩm
5. Nhấn **Lưu**

### Xem báo cáo
1. Vào menu **Báo cáo**
2. Chọn loại báo cáo
3. Lọc theo thời gian, trạng thái
4. Xem kết quả

---

## 10. GHI CHÚ

### Các tên viết tắt thường gặp

| Tên viết tắt | Giải thích |
|--------------|------------|
| SLNT | Số lượng nghiệm thu |
| NCC | Nhà cung cấp |
| ĐH | Đơn hàng |
| PGC | Phiếu gia công |
| PT | Phiếu thu |
| PC | Phiếu chi |

### Liên hệ hỗ trợ

Nếu gặp vấn đề khi sử dụng:
1. Liên hệ quản trị viên hệ thống
2. Xem hướng dẫn trong tài liệu
3. Kiểm tra lịch sử thao tác (Settings → Audit)

---

**HẾT BÁO CÁO**

*Tài liệu này được tạo để phục vụ việc bàn giao và đào tạo người dùng mới.*

