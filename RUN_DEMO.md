# =============================================================================
# RUN_DEMO.md - Hướng dẫn chạy Demo Trần Gỗ Hoàng Gia ERP
# =============================================================================

## 📋 Yêu cầu hệ thống

- **Node.js**: v18+
- **npm**: v9+ (đã cài sẵn với Node.js)
- **PostgreSQL**: Đang chạy trên localhost:5432
- **Database**: `tran_go_hoang_gia_erp` (đã tạo sẵn)

## 🚀 Cách 1: Chạy nhanh (khuyên dùng)

```bash
# 1. Kill các port đang sử dụng (nếu có)
npm run kill:port

# 2. Chạy cả backend và frontend cùng lúc
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Swagger Docs**: http://localhost:4000/docs

## 🚀 Cách 2: Chạy riêng lẻ

### Chạy Backend API

```bash
# Terminal 1
cd apps/api
npm run start:dev
```

### Chạy Frontend Web

```bash
# Terminal 2
cd apps/web
npm run dev
```

## 🔧 Các lệnh hữu ích

```bash
# Kill port 4000 và 3000 nếu bị chiếm
npm run kill:port

# Kill tất cả node processes
npm run kill:all

# Build tất cả workspaces
npm run build

# Chạy Prisma migrations
npm run prisma:migrate

# Seed dữ liệu mẫu
npm run prisma:seed

# Mở Prisma Studio
npm run prisma:studio
```

## 🔐 Tài khoản Demo

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| admin@demo.com | 123456 | Admin |

## ⚠️ Xử lý lỗi thường gặp

### Lỗi "EADDRINUSE: address already in use :::4000"

Port 4000 đang bị chiếm bởi process khác.

**Cách 1: Sử dụng script có sẵn (Khuyên dùng)**

```bash
npm run kill:port
```

**Cách 2: Tắt tất cả Node processes**

```bash
npm run kill:all
```

**Cách 3: Thủ công trên Windows**

Nếu script không hoạt động, hãy làm theo các bước sau:

1. **Kiểm tra port 4000**
   ```cmd
   netstat -ano | findstr :4000
   ```
   Kết quả sẽ hiển thị tương tự:
   ```
   TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING       12345
   ```

2. **Kill PID (thay 12345 bằng PID bạn nhận được)**
   ```cmd
   taskkill /PID 12345 /F
   ```

3. **Kiểm tra lại port đã được giải phóng**
   ```cmd
   netstat -ano | findstr :4000
   ```
   Nếu không có kết quả nào hiển thị, port đã được giải phóng.

4. **Chạy lại ứng dụng**
   ```bash
   npm run dev
   ```

**Kiểm tra port 3000 (Frontend)**
```cmd
netstat -ano | findstr :3000
```

### Lỗi "DATABASE_URL not found"

Đảm bảo file `apps/api/.env` tồn tại với nội dung:

```env
DATABASE_URL=postgresql://postgres:Hamy2015@localhost:5432/tran_go_hoang_gia_erp?schema=public
JWT_SECRET=super-secret-jwt-key-2026-change-in-prod
PORT=4000
```

### Lỗi 401 Unauthorized

1. Đăng xuất và đăng nhập lại
2. Kiểm tra token trong LocalStorage (F12 → Application → Local Storage)
3. Xóa cache trình duyệt

## 📁 Cấu trúc thư mục

```
tran-go-hoang-gia-erp/
├── apps/
│   ├── api/          # NestJS Backend
│   │   ├── src/
│   │   ├── prisma/
│   │   └── .env      # Backend env (DATABASE_URL, JWT_SECRET)
│   └── web/          # Next.js Frontend
│       ├── app/
│       ├── components/
│       └── lib/
└── packages/          # Shared packages
```

## 🔧 Cấu hình môi trường

### Backend (apps/api/.env)

```env
# Database
DATABASE_URL=postgresql://postgres:Hamy2015@localhost:5432/tran_go_hoang_gia_erp?schema=public

# JWT Authentication
JWT_SECRET=super-secret-jwt-key-2026-change-in-prod
JWT_EXPIRES_IN=7d

# Server
PORT=4000
NODE_ENV=development
```

### Frontend (apps/web/.env.local) - Tùy chọn

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_API_TIMEOUT=10000
```

## ✅ Kiểm tra sau khi chạy

1. Backend logs hiển thị: "🚀 API SERVER STARTED SUCCESSFULLY"
2. Frontend mở được: http://localhost:3000
3. Login với: admin@demo.com / 123456
4. Vào "Danh mục sản phẩm" thấy danh sách sản phẩm
5. Vào "Đơn hàng" thấy danh sách đơn hàng

## 🏗️ Kiến trúc hệ thống

### Frontend → Backend Communication (Option A: Direct-to-Backend)

**Tất cả API calls đi trực tiếp từ browser → Backend (http://localhost:4000)**

```
Browser (localhost:3000) ──────→ Backend API (localhost:4000)
        │                              │
        │  GET /users                  │  Direct HTTP request
        │  POST /auth/login            │  (no proxy)
        │  Authorization: Bearer ...   │
        ▼                              ▼
```

### Quy tắc quan trọng

| File | Vai trò |
|------|---------|
| `lib/api.ts` | **CHỈ** chứa API utilities (apiClient, fetchJson, token helpers) - **KHÔNG** có React/JSX |
| `contexts/auth-context.tsx` | React AuthProvider & useAuth hook |
| `components/*.tsx` | React components |
| `app/**/*.tsx` | React pages |

### Cấu trúc API Client

```typescript
// lib/api.ts
export async function apiClient<T>(endpoint: string, options?: FetchOptions): Promise<T> {
  // endpoint: '/users' (KHÔNG có /api prefix)
  // → Gọi: http://localhost:4000/users
  // → Tự động attach Authorization header từ localStorage
}
```

### Các hàm trong lib/api.ts

```typescript
// Core
apiClient<T>(endpoint, options)  // Main API client - gọi trực tiếp backend
fetchJson<T>(path, options)      // Legacy wrapper (dùng apiClient bên trong)

// Token Management
getToken()                        // Đọc token từ localStorage
setToken(token)                   // Lưu token
removeToken()                     // Xóa token

// User Management  
getUser()                         // Đọc user từ localStorage
setUser(user)                     // Lưu user
removeUser()                      // Xóa user

// Helpers
getFileUrl(url)                   // Lấy full URL cho files
unwrapItems<T>(response)          // Unwrap array từ response
toArray<T>(data)                  // Đảm bảo luôn trả về array
```

### Xử lý 401 Unauthorized

Khi API trả về 401:
1. Xóa token/user từ localStorage
2. Redirect về `/login?reason=unauthorized`
3. Hiển thị thông báo "Phiên đăng nhập không hợp lệ"

### Guardrail (Dev mode)

Nếu request đi sai đến frontend (localhost:3000), sẽ throw error:

```
[API ERROR] Request going to frontend (3000) instead of backend (4000)!
URL: http://localhost:3000/api/users
Remove /api prefix and use direct backend URL.
```

