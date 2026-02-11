# 📘 ERP Trango v3.0 - Hướng dẫn phát triển

## Mục lục
1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Cấu trúc dự án](#cấu-trúc-dự-án)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Quy trình phát triển](#quy-trình-phát-triển)
7. [Coding Conventions](#coding-conventions)
8. [Các module chính](#các-module-chính)
9. [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)
10. [Hướng dẫn deploy](#hướng-dẫn-deploy)

---

## 1. Tổng quan hệ thống

ERP Trango v3.0 là hệ thống quản lý doanh nghiệp với các tính năng:
- **Quản lý đơn hàng**: Tạo, sửa, theo dõi đơn hàng
- **Quản lý sản phẩm**: Danh mục sản phẩm, biến thể, giá
- **Quản lý đối tác**: Khách hàng, Nhà cung cấp, Xưởng gia công
- **Quản lý tài chính**: Sổ quỹ, Thu/Chi, Ví tiền, Báo cáo
- **Quản lý sản xuất**: Phiếu gia công, Nghiệm thu sản phẩm

### Luồng dữ liệu chính
```
Khách hàng → Đơn hàng → Phiếu gia công → Nghiệm thu → Thanh toán
                ↓
         Sản phẩm/Dịch vụ
                ↓
         Nhà cung cấp/Nhập kho
```

---

## 2. Cấu trúc dự án

```
E:\tran-go-hoang-gia-erp\
├── apps/
│   ├── api/                          # Backend API (NestJS)
│   │   ├── prisma/
│   │   │   └── schema.prisma          # Database Schema
│   │   ├── src/
│   │   │   ├── adjustments/          # Điều chỉnh quỹ
│   │   │   ├── ai/                   # AI Entry (Drafts)
│   │   │   ├── auth/                  # Authentication (JWT, Google)
│   │   │   ├── cashflow/              # Lưu chuyển tiền tệ
│   │   │   ├── customers/             # Khách hàng + Follow-up
│   │   │   ├── dashboard/             # Dashboard stats
│   │   │   ├── expense-categories/     # Danh mục chi tiêu
│   │   │   ├── income-categories/      # Danh mục thu nhập
│   │   │   ├── files/                 # File upload
│   │   │   ├── order-items/           # Hạng mục đơn hàng
│   │   │   ├── products/              # Sản phẩm + Biến thể
│   │   │   ├── projects/              # Dự án/Đơn hàng (Core)
│   │   │   ├── reminders/             # Nhắc nhở
│   │   │   ├── reports/               # Báo cáo
│   │   │   ├── settings/              # Cài đặt hệ thống
│   │   │   ├── suppliers/             # Nhà cung cấp
│   │   │   ├── transactions/          # Giao dịch (Thu/Chi)
│   │   │   ├── transfers/             # Chuyển tiền giữa ví
│   │   │   ├── users/                 # Users management
│   │   │   ├── wallets/                # Ví tiền
│   │   │   ├── workshop-jobs/         # Phiếu gia công (Core)
│   │   │   └── workshops/             # Xưởng gia công
│   │   ├── uploads/                   # Uploaded files
│   │   └── env.example
│   │
│   └── web/                          # Frontend (Next.js 14 App Router)
│       ├── app/
│       │   ├── (authenticated)/       # Protected routes
│       │   │   ├── ai-entry/         # AI Draft
│       │   │   ├── cashbook/         # Sổ quỹ
│       │   │   ├── catalog/          # Danh mục SP
│       │   │   ├── dashboard/        # Dashboard
│       │   │   ├── fund/             # Quỹ tiền
│       │   │   ├── orders/          # Đơn hàng
│       │   │   ├── partners/        # Đối tác
│       │   │   ├── reports/          # Báo cáo
│       │   │   ├── settings/        # Cài đặt
│       │   │   └── workshops/       # Phiếu gia công
│       │   ├── api/                 # Next.js API routes
│       │   ├── login/
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/                  # UI Primitives
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── input.tsx
│       │   │   ├── select.tsx
│       │   │   ├── table.tsx
│       │   │   ├── tabs.tsx
│       │   │   ├── address-selector.tsx  # Address dropdown
│       │   │   └── ...
│       │   ├── create-order-modal.tsx
│       │   ├── create-workshop-job-modal.tsx
│       │   ├── product-picker.tsx
│       │   ├── sidebar.tsx
│       │   ├── topbar.tsx
│       │   ├── toast-provider.tsx
│       │   └── ...
│       ├── contexts/                # React Contexts
│       │   └── auth-context.tsx
│       ├── lib/                    # Utilities
│       │   ├── api.ts               # API Client wrapper
│       │   ├── hooks.ts             # Custom hooks
│       │   ├── utils.ts             # Helper functions
│       │   └── data/
│       │       └── vietnam-addresses.ts  # VN Administrative divisions
│       ├── config/
│       └── public/
│
├── packages/
│   └── shared/                     # Shared TypeScript types
│       └── src/index.ts
│
├── docs/                          # Documentation
└── scripts/                       # Dev scripts
```

---

## 3. Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **NestJS** | Node.js framework |
| **Prisma ORM** | Database ORM |
| **PostgreSQL** | Database |
| **JWT** | Authentication |
| ** Passport.js** | Auth strategies |
| **Class-validator** | DTO validation |
| **Helmet** | Security headers |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework (App Router) |
| **React 18** | UI Library |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Lucide React** | Icons |
| **React Hook Form** | Form management |
| **Zod** | Validation |
| **React Query** | Data fetching |

### Development
| Technology | Purpose |
|------------|---------|
| **ESLint** | Linting |
| **Prettier** | Code formatting |
| **Git** | Version control |
| **Windows** | Development OS |

---

## 4. Database Schema

### Core Models

```prisma
// Projects - Đơn hàng/Dự án (Central entity)
model Project {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  customerId  String?
  status      ProjectStatus
  totalAmount Float    @default(0)
  items       ProjectItem[]
  jobs        WorkshopJob[]
  // ...
}

// ProjectItem - Hạng mục trong đơn hàng
model ProjectItem {
  id            String   @id @default(uuid())
  projectId     String
  productId     String?
  name          String
  unit          String
  qty           Float
  unitPrice     Float
  acceptedQty   Float?   // SLNT - Số lượng nghiệm thu
  acceptedUnitPrice Float? // Đơn giá nghiệm thu
  // ...
}

// WorkshopJob - Phiếu gia công
model WorkshopJob {
  id          String   @id @default(uuid())
  code        String   @unique  // JGXXXX
  projectId   String
  workshopId  String
  status      WorkshopJobStatus
  startDate   DateTime?
  dueDate     DateTime?
  amount      Float
  paidAmount  Float    @default(0)
  items       WorkshopJobItem[]
  payments    Transaction[]
  // ...
}

// WorkshopJobItem - Hạng mục trong phiếu gia công
model WorkshopJobItem {
  id            String   @id @default(uuid())
  workshopJobId String
  productId     String?
  productName   String
  unit          String
  quantity      Float
  unitPrice     Float
  // ...
}

// Customer - Khách hàng
model Customer {
  id            String   @id @default(uuid())
  code          String   @unique
  name          String
  phone         String?
  provinceCode  String?   // Mã tỉnh
  provinceName  String?
  districtCode  String?
  districtName  String?
  wardCode      String?
  wardName      String?
  addressLine   String?   // Số nhà, tên đường
  // ...
}

// Workshop - Xưởng gia công
model Workshop {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  phone       String?
  address     String?
  color       String?   @default("#f97316")
  // ...
}

// Transaction - Giao dịch thu/chi
model Transaction {
  id                String   @id @default(uuid())
  type              TransactionType  // INCOME/EXPENSE
  amount            Float
  walletId          String
  categoryId        String?
  projectId         String?   // Đơn hàng liên quan
  workshopJobId     String?   // Phiếu gia công liên quan
  // ...
}

// Wallet - Ví tiền
model Wallet {
  id          String   @id @default(uuid())
  name        String
  balance     Float    @default(0)
  // ...
}
```

### Enum Types

```typescript
// ProjectStatus
'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DRAFT'

// WorkshopJobStatus  
'DRAFT' | 'IN_PROGRESS' | 'DONE' | 'SENT' | 'CANCELLED'

// TransactionType
'INCOME' | 'EXPENSE'
```

---

## 5. API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login |
| POST | `/auth/register` | Register |
| POST | `/auth/forgot-password` | Forgot password |
| GET | `/auth/me` | Get current user |

### Projects (Đơn hàng)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List projects with filters |
| GET | `/projects/:id` | Get project details |
| POST | `/projects` | Create project |
| PUT | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Soft delete |
| POST | `/projects/:id/items` | Add item |
| PUT | `/projects/:id/items/:itemId` | Update item |
| DELETE | `/projects/:id/items/:itemId` | Delete item |

### Products (Sản phẩm)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List products |
| GET | `/products/:id` | Get product with variants |
| POST | `/products` | Create product |
| PUT | `/products/:id` | Update product |
| POST | `/products/:id/variants` | Add variant |

### Customers (Khách hàng)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | List customers |
| GET | `/customers/:id` | Get customer |
| POST | `/customers` | Create customer |
| PUT | `/customers/:id` | Update customer |

### Workshops (Xưởng gia công)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workshops` | List workshops |
| GET | `/workshops/:id` | Get workshop |
| POST | `/workshops` | Create workshop |
| PUT | `/workshops/:id` | Update workshop |

### Workshop Jobs (Phiếu gia công)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workshop-jobs` | List jobs with filters |
| GET | `/workshop-jobs/:id` | Get job details |
| POST | `/workshop-jobs` | Create job |
| PUT | `/workshop-jobs/:id` | Update job |
| POST | `/workshop-jobs/:id/pay` | Tạo phiếu chi |
| GET | `/workshop-jobs/:id/payments` | Get payments |

### Transactions (Thu/Chi)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List transactions |
| POST | `/transactions/income` | Tạo phiếu thu |
| POST | `/transactions/expense` | Tạo phiếu chi |

### Wallets (Ví tiền)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallets` | List wallets |
| POST | `/wallets` | Create wallet |
| POST | `/wallets/:id/transfer` | Transfer between wallets |

---

## 6. Quy trình phát triển

### 6.1. Setup môi trường

```bash
# Clone project
git clone <repo-url>
cd tran-go-hoang-gia-erp

# Install dependencies
npm install

# Setup API
cd apps/api
cp env.example .env
# Edit .env with your DB credentials
npx prisma db push
npx prisma generate
npm run start:dev

# Setup Web
cd apps/web
cp ENV_LOCAL_SAMPLE.txt .env.local
# Edit .env.local
npm run dev
```

### 6.2. Chạy development

```bash
# Terminal 1: API
cd apps/api
npm run start:dev

# Terminal 2: Web
cd apps/web
npm run dev

# Hoặc chạy cả hai với LAN access
cd apps/web
npm run dev:lan
```

### 6.3. Database migrations

```bash
# Push schema changes (development)
cd apps/api
npx prisma db push

# Generate Prisma client
npx prisma generate

# Create migration (production)
npx prisma migrate dev --name <migration_name>
```

### 6.4. Git workflow

```bash
# Tạo branch mới
git checkout -b feature/ten-tinh-nang

# Commit changes
git add .
git commit -m "feat: mô tả tính năng"

# Push
git push origin feature/ten-tinh-nang

# Tạo Pull Request
```

---

## 7. Coding Conventions

### 7.1. React Components

```tsx
// ✅ Đúng
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function MyComponent({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  return <div>...</div>;
}

// ❌ Sai
import React from 'react';
export default function myComponent({id}) {
  const [data, setData] = useState(null);
  // ...
}
```

### 7.2. API Calls

```tsx
// ✅ Đúng - Dùng apiClient wrapper
import { apiClient } from '@/lib/api';

const fetchData = async () => {
  try {
    const data = await apiClient<MyType>(`/endpoint/${id}`);
    return data;
  } catch (error) {
    console.error('Failed:', error);
  }
};
```

### 7.3. TypeScript Types

```typescript
// ✅ Đúng - Dùng interface cho objects
interface OrderItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
}

// ❌ Sai - Dùng any
const item: any = { ... };
```

### 7.4. Naming Conventions

| Loại | Quy tắc | Ví dụ |
|------|---------|-------|
| Components | PascalCase | `CustomerList`, `OrderDetail` |
| Functions | camelCase | `fetchCustomer`, `handleSubmit` |
| Variables | camelCase | `isLoading`, `formData` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Types/Interfaces | PascalCase | `OrderItem`, `ProjectSummary` |
| Files | kebab-case | `create-order-modal.tsx` |

### 7.5. Import Order

```tsx
import React from 'react';

// External libs
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// UI Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Internal imports
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

// Types
import { OrderItem } from '@tran-go-hoang-gia/shared';
```

---

## 8. Các module chính

### 8.1. Orders (Đơn hàng)

**Files quan trọng:**
- `apps/web/app/(authenticated)/orders/[id]/page.tsx` - Chi tiết đơn hàng
- `apps/web/app/(authenticated)/orders/list/page.tsx` - Danh sách đơn hàng

**Tính năng chính:**
- Tab Thông tin: Thông tin đơn hàng, khách hàng
- Tab Hạng mục: Sản phẩm/Dịch vụ trong đơn
- Tab Nghiệm thu: SLNT (Số lượng nghiệm thu), tính thành tiền
- Tab Sản xuất: Tạo phiếu gia công
- Tab Giao dịch: Phiếu thu/chi liên quan

**State quan trọng:**
```tsx
const [items, setItems] = useState<OrderItem[]>([]);
const [acceptanceItems, setAcceptanceItems] = useState<AcceptanceItem[]>([]);
const [workshopJobItems, setWorkshopJobItems] = useState<WorkshopJobItem[]>([]);
```

### 8.2. Workshop Jobs (Phiếu gia công)

**Files quan trọng:**
- `apps/api/src/workshop-jobs/workshop-jobs.service.ts` - Backend logic
- `apps/web/components/create-workshop-job-modal.tsx` - Modal tạo mới
- `apps/web/components/work-orders-table.tsx` - Table hiển thị

**Quy trình:**
1. Tạo từ tab Sản xuất trong Đơn hàng
2. Hoặc tạo trực tiếp từ `/workshops/jobs`
3. Tạo phiếu chi thanh toán
4. Lịch sử thanh toán

### 8.3. Address Selection (Địa chỉ)

**Files quan trọng:**
- `apps/web/lib/data/vietnam-addresses.ts` - Data tỉnh/thành VN
- `apps/web/components/ui/address-selector.tsx` - Component chọn địa chỉ

**Cấu trúc data:**
```typescript
interface Province {
  code: string;
  name: string;
  nameEn: string;
  type: 'thanh_pho' | 'tinh';
}

// District/Ward nhập tay (không có dropdown)
```

### 8.4. Transactions (Thu/Chi)

**Các loại giao dịch:**
- **INCOME** - Phiếu thu
- **EXPENSE** - Phiếu chi

**Liên kết với:**
- Đơn hàng (Project)
- Phiếu gia công (WorkshopJob)
- Ví tiền (Wallet)

---

## 9. Xử lý lỗi thường gặp

### 9.1. Lỗi "Rendered fewer hooks than expected"

**Nguyên nhân:** React hooks được gọi khác nhau giữa các lần render.

**Cách xử lý:**
- Đảm bảo tất cả hooks được gọi cùng thứ tự
- Không gọi hooks trong if/for
- Di chuyển `if (loading) return` sau khi khai báo hooks

```tsx
// ✅ Đúng
export function MyComponent() {
  const [state, setState] = useState(null);
  
  if (loading) return <Spinner />; // Return sau khi khai báo hooks
  
  return <div>...</div>;
}

// ❌ Sai
export function MyComponent() {
  if (loading) return <Spinner />; // Return trước hooks!
  
  const [state, setState] = useState(null);
  return <div>...</div>;
}
```

### 9.2. Lỗi Prisma "Unknown argument"

**Nguyên nhân:** Backend schema chưa được cập nhật với frontend payload.

**Cách xử lý:**
1. Kiểm tra Prisma schema
2. Thêm field vào model
3. Chạy `npx prisma db push`
4. Restart API server

```bash
cd apps/api
npx prisma db push
```

### 9.3. Lỗi "Cannot read property of undefined"

**Nguyên nhân:** Dữ liệu chưa được load xong đã truy cập.

**Cách xử lý:**
```tsx
// ✅ Đúng - Check existence
const customerName = data?.customer?.name || 'N/A';

// ❌ Sai
const customerName = data.customer.name; // Crash nếu null
```

### 9.4. Lỗi API 401/403

**Nguyên nhân:** Token hết hạn hoặc không có quyền.

**Cách xử lý:**
- Kiểm tra `useAuth` context
- Redirect về login nếu token null

### 9.5. Lỗi EPERM (Windows file lock)

**Nguyên nhân:** Prisma generate bị lock file.

**Cách xử lý:**
```bash
# Đóng tất cả terminal
# Restart IDE
# Hoặc chạy
npx prisma generate
```

---

## 10. Hướng dẫn deploy

### 10.1. Build API

```bash
cd apps/api
npm run build
npm run start:prod
```

### 10.2. Build Web

```bash
cd apps/web
npm run build
npm run start
```

### 10.3. Environment Variables

**API (.env):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/erp"
JWT_SECRET="your-secret-key"
PORT=3001
```

**Web (.env.local):**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret"
```

---

## 📌 Checklist trước khi deploy

- [ ] Không có lỗi ESLint
- [ ] Build thành công (`npm run build`)
- [ ] Database migration đã chạy
- [ ] Environment variables đã cấu hình
- [ ] API đã restart
- [ ] Test các luồng chính

---

## 🔗 Tài liệu liên quan

- Next.js Docs: https://nextjs.org/docs
- NestJS Docs: https://docs.nestjs.com
- Prisma Docs: https://www.prisma.io/docs
- Tailwind CSS: https://tailwindcss.com/docs
- TypeScript: https://www.typescriptlang.org/docs

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra console logs
2. Kiểm tra Network tab trong DevTools
3. Xem logs trong terminal API
4. Kiểm tra database với Prisma Studio: `npx prisma studio`

```bash
# Prisma Studio - Xem database
cd apps/api
npx prisma studio
```

---

**Version:** 3.0.0  
**Last Updated:** Feb 2026  
**Author:** Development Team

