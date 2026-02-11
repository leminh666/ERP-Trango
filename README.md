# TRẦN GỖ HOÀNG GIA ERP - Monorepo MVP

Monorepo cho hệ thống ERP với Next.js + NestJS + Prisma.

## 🛠️ Công nghệ

- **Web**: Next.js 14 + Tailwind CSS + shadcn/ui
- **API**: NestJS + Prisma + JWT Auth
- **Database**: PostgreSQL (đã cài sẵn, không dùng Docker)
- **Shared**: TypeScript types + Zod schemas

## 📋 Hướng dẫn cài đặt (Windows)

### Bước 1: Mở folder bằng Cursor

Mở Cursor IDE và mở folder `E:\tran-go-hoang-gia-erp`

### Bước 2: Tạo file .env cho API

Tạo file `apps/api/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tran_go_hoang_gia_erp?schema=public"

# JWT
JWT_SECRET="your-super-secret-key-change-in-production"

# API Port (mặc định 4000, tự động chọn port khác nếu bị chiếm)
PORT=4000
```

### Bước 3: Cấu hình Frontend (TỰ ĐỘNG - KHÔNG CẦN LÀM GÌ!)

**Hệ thống đã được cấu hình để TỰ ĐỘNG detect IP:**

- Nếu bạn truy cập `http://192.168.1.3:3000` trên trình duyệt
- API sẽ tự động là `http://192.168.1.3:4000`
- **KHÔNG cần tạo file `.env.local`!**

**Tùy chọn: Cấu hình thủ công (nếu cần)**

Nếu muốn dùng IP cố định thay vì auto-detect:

```env
# Tạo file apps/web/.env.local
NEXT_PUBLIC_API_URL=http://192.168.1.3:4000
NEXT_PUBLIC_API_TIMEOUT=15000
```

**Cách lấy IP máy:**
```cmd
ipconfig
# Tìm IPv4 Address (ví dụ: 192.168.1.3)
```

**Truy cập từ Mobile/Tablet:**

1. **Đảm bảo frontend chạy ở chế độ LAN:**
   ```bash
   npm run dev:lan   # Chạy trên tất cả interfaces
   ```
2. **Truy cập từ mobile bằng IP của máy:**
   - `http://192.168.1.3:3000`
3. **API sẽ tự động theo IP bạn đang dùng!**

**Tại sao auto-detect hoạt động?**

- Frontend đọc `window.location.hostname` từ trình duyệt
- API URL = `http://{hostname}:4000`
- Không cần config mỗi khi IP thay đổi!

### Bước 4: Cài đặt dependencies

Mở Terminal (Ctrl + `) và chạy:

```bash
npm install
```

### Bước 5: Setup database

Chạy script setup để tạo migration và seed data:

```bash
npm run setup
```

Script này sẽ:
- Cài đặt tất cả dependencies
- Chạy Prisma migration
- Seed data mẫu (2 users, settings)

### Bước 6: Chạy ứng dụng

**Chạy cả Web và API cùng lúc:**

```bash
npm run dev
```

**Hoặc chạy riêng lẻ (nếu cần debug):**

```bash
# Terminal 1: API
cd apps/api
npm run start:dev

# Terminal 2: Web
cd apps/web
npm run dev
```

## 🔗 URL và Credentials

### Web Application (PC)
- **URL**: http://localhost:3000
- **Trang chủ**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard (cần đăng nhập)

### Web Application (Mobile/Tablet)
- **URL**: http://<IP_MAY>:3000
- Ví dụ: http://192.168.1.3:3000
- **Tự động**: API sẽ theo IP bạn dùng để truy cập FE
- Ví dụ: Nếu truy cập FE bằng `http://192.168.1.3:3000`, API sẽ là `http://192.168.1.3:4000`
- **Lưu ý**: Frontend phải được truy cập qua LAN IP, không dùng localhost
- **Yêu cầu**: Chạy frontend với `npm run dev:lan` để bind 0.0.0.0

### API
- **Local**: http://localhost:4000
- **LAN**: http://<IP_MAY>:4000
- **Health Check**: http://localhost:4000/health
- **Swagger Docs**: http://localhost:4000/docs

### Tài khoản demo

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| admin@demo.com | 123456 | ADMIN |
| staff@demo.com | 123456 | STAFF |

## 🔄 Xử lý Port Conflict (EADDRINUSE)

### Tự động (Mặc định)

Backend đã được cấu hình để **tự động tìm port trống** nếu port 4000 bị chiếm:
1. Thử port 4000
2. Nếu bị chiếm → kill process đó (nếu được quyền)
3. Nếu vẫn bị chiếm → thử port 4001, 4002, ...
4. Hiển thị port đang chạy trong console

**Health endpoint sẽ cho biết port thực đang chạy:**
```json
{
  "status": "ok",
  "port": 4000,
  "apiUrl": "http://localhost:4000",
  "uploadsUrl": "http://localhost:4000/uploads"
}
```

### Thủ công (Windows)

Nếu cần giải phóng port thủ công:

```cmd
# Kiểm tra port 4000
netstat -ano | findstr :4000

# Kill PID (thay 12345 bằng PID thực)
taskkill /PID 12345 /F

# Hoặc dùng script có sẵn
npm run kill:port
```

## 🔄 Xử lý khi IP máy thay đổi

**Không cần làm gì cả!**

Hệ thống đã được cấu hình để **TỰ ĐỘNG detect IP** từ trình duyệt:

1. Khi bạn truy cập `http://192.168.1.3:3000` từ PC
2. Hệ thống tự động dùng `http://192.168.1.3:4000` cho API
3. Khi bạn truy cập `http://192.168.1.5:3000` từ mobile
4. Hệ thống tự động dùng `http://192.168.1.5:4000` cho API

**Chỉ cần đảm bảo:**
- Frontend chạy với `npm run dev:lan` (bind 0.0.0.0)
- Backend chạy bình thường (đã bind 0.0.0.0 mặc định)
- Mobile và PC cùng mạng LAN

**Nếu muôn dùng IP cố định:**

Tạo file `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://192.168.1.3:4000
```

## 🧩 Scripts có sẵn

| Command | Mô tả |
|---------|-------|
| `npm run setup` | Cài deps + migrate + seed |
| `npm run dev` | Chạy web + api |
| `npm run dev:web` | Chỉ chạy web |
| `npm run dev:api` | Chỉ chạy api |
| `npm run kill:port` | Giải phóng port 4000 và 3000 |
| `npm run kill:all` | Tắt tất cả tiến trình Node.js |
| `npm run prisma:studio` | Mở Prisma Studio |

## 📁 Cấu trúc thư mục

```
tran-go-hoang-gia-erp/
├── apps/
│   ├── api/              # NestJS Backend
│   │   ├── prisma/       # Schema & migrations
│   │   └── src/          # Source code
│   └── web/              # Next.js Frontend
│       ├── app/          # App Router pages
│       ├── components/   # UI components
│       └── contexts/     # React contexts
├── packages/
│   └── shared/           # Shared types & zod schemas
└── package.json          # Root workspace config
```

## 🧪 Test API

### Đăng nhập và lấy token

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"123456"}'
```

### Lấy danh sách sản phẩm

```bash
# Thay TOKEN bằng accessToken từ bước đăng nhập
curl http://localhost:4000/products \
  -H "Authorization: Bearer TOKEN"
```

### Tạo sản phẩm mới

```bash
# Thay TOKEN bằng accessToken
curl -X POST http://localhost:4000/products \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trần gỗ óc chó cao cấp",
    "unit": "m2",
    "productType": "CEILING_WOOD",
    "imageUrl": "http://localhost:4000/uploads/placeholder-product.png"
  }'
```

## 📝 Database Schema

### Models

- **User**: id, email, password, name, role (ADMIN/STAFF)
- **Product**: id, code, name, unit, productType, imageUrl, isActive, deletedAt
- **AuditLog**: id, userId, action, entity, entityId, details
- **SystemSetting**: id, key, valueJson, description

### Product Types (Enum)

| Value | Display |
|-------|---------|
| CEILING_WOOD | Trần gỗ |
| FURNITURE | Nội thất |
| OTHER_ITEM | Hạng mục khác |

## 🚀 Phát triển tiếp theo (Phase 2+)

- [x] Module Products (CREATE/READ/UPDATE/DELETE)
- [ ] Modules: Orders, Customers, Inventory
- [ ] Xây dựng dashboard với charts
- [ ] Phân quyền chi tiết (RBAC)
- [ ] File upload/download
- [ ] Real-time notifications
- [ ] Export reports (PDF, Excel)
