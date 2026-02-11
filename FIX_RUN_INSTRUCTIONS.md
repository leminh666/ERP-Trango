# =============================================================================
# HƯỚNG DẪN CHẠY ERP SAU KHI FIX - TRẦN GỖ HOÀNG GIA
# =============================================================================

## 🚀 BƯỚC 1: Chạy API SERVER

### Cách 1: Chạy bằng npm script (khuyên dùng)
```bash
cd apps/api
npm run start
```

### Cách 2: Chạy trực tiếp từ source (development)
```bash
cd apps/api
npm run start:dev
```

### Cách 3: Chạy từ dist (đã build)
```bash
cd apps/api
node dist/src/main.js
```

**Kiểm tra API đang chạy:**
- Truy cập: http://localhost:4000/health
- Kết quả mong đợi: `{"status":"ok",...}`

**Lưu ý quan trọng:**
- API sẽ listen trên `0.0.0.0:4000` (tất cả interfaces)
- Điều này cho phép truy cập từ LAN (mobile/tablet)
- CORS đã được cấu hình tự động phát hiện IP LAN

---

## 🚀 BƯỚC 2: Cấu hình Frontend (.env.local)

### QUAN TRỌNG: Tạo file `apps/web/.env.local`

⚠️ **File này KHÔNG được commit (đã có trong .gitignore)**

Nội dung file:
```
NEXT_PUBLIC_API_URL=http://192.168.1.X:4000
NEXT_PUBLIC_API_TIMEOUT=15000
```

**Thay thế `192.168.1.X` bằng IP thực của máy bạn:**

1. Mở Command Prompt (cmd)
2. Chạy: `ipconfig`
3. Tìm dòng "IPv4 Address" (ví dụ: `192.168.1.105`)
4. Thay thế `192.168.1.X` bằng IP đó

**Ví dụ đúng:**
```
NEXT_PUBLIC_API_URL=http://192.168.1.105:4000
```

**Ví dụ SAI (sẽ gây lỗi):**
```
❌ NEXT_PUBLIC_API_URL=localhost:4000 (không hoạt động trên mobile!)
❌ NEXT_PUBLIC_API_URL=192.168.1.105:4000 (thiếu http://)
❌ NEXT_PUBLIC_API_URL= http://192.168.1.105:4000 (có dấu cách thừa)
```

---

## 🚀 BƯỚC 3: Chạy Frontend (LAN Mode)

### Chạy development server:
```bash
cd apps/web
npm run dev
```

### Truy cập từ máy tính:
- http://localhost:3000

### Truy cập từ mobile/tablet (cùng mạng LAN):
- http://192.168.1.X:3000 (thay X bằng IP máy)

---

## 🧪 TEST CHECKLIST

### 1. Kiểm tra API Health
```bash
curl http://localhost:4000/health
```
**Kỳ vọng:** `{"status":"ok","host":"0.0.0.0","port":4000}`

### 2. Kiểm tra FE kết nối API
- Mở browser console (F12)
- Tìm log: `[API CONFIG] baseUrl=...`
- Đảm bảo URL đúng (IP thực, không phải localhost)

### 3. Test tạo sản phẩm
1. Đăng nhập vào hệ thống
2. Vào trang quản lý sản phẩm
3. Click "Thêm sản phẩm mới"
4. Nhập:
   - Tên: "Test Sản Phẩm"
   - Đơn vị: "m2"
   - Loại: "Trần gỗ"
   - Logo: upload ảnh
5. Click "Tạo mới"
6. **Kỳ vọng:**
   - Status: 201 Created
   - Toast: "Tạo sản phẩm thành công!"
   - Sản phẩm xuất hiện trong danh sách

### 4. Test từ Mobile/Tablet
1. Kết nối cùng mạng WiFi với PC
2. Mở browser trên mobile
3. Truy cập: http://192.168.1.X:3000
4. Đăng nhập và thử tạo sản phẩm
5. **Kỳ vọng:**
   - Logo upload OK
   - Tạo sản phẩm OK
   - Không có lỗi ERR_CONNECTION_REFUSED

---

## 🔧 TROUBLESHOOTING

### Lỗi: `ERR_CONNECTION_REFUSED`
**Nguyên nhân:** API chưa chạy hoặc sai PORT
**Giải quyết:**
```bash
# Kiểm tra port 4000
netstat -ano | findstr :4000

# Nếu không có, chạy API:
cd apps/api
npm run start
```

### Lỗi: `localhost:3000` trong khi muốn LAN
**Nguyên nhân:** Frontend dùng localhost thay vì IP thực
**Giải quyết:**
1. Tạo file `apps/web/.env.local`
2. Thêm: `NEXT_PUBLIC_API_URL=http://192.168.1.X:4000`
3. Restart frontend: `npm run dev`

### Lỗi: CORS policy
**Nguyên nhân:** Browser chặn request từ domain khác
**Giải quyết:**
- API đã cấu hình CORS tự động
- Đảm bảo frontend và API cùng mạng LAN
- Kiểm tra firewall không chặn port 4000

### Lỗi: 500 Internal Server Error khi tạo sản phẩm
**Giải quyết:**
1. Kiểm tra console backend (nơi chạy `npm run start`)
2. Tìm log `[CREATE_PRODUCT]`
3. Xem message lỗi cụ thể
4. Đảm bảo:
   - Database đang chạy
   - Logo URL hợp lệ (bắt đầu http:// hoặc https://)
   - Không có trường thừa trong payload

---

## 📁 CẤU TRÚC FILES ĐÃ SỬA

### Backend (apps/api/)
- `src/main.ts` - API listen 0.0.0.0, CORS auto-detect LAN IP
- `src/products/products.service.ts` - Validate + prisma fields chính xác
- `src/files/files.controller.ts` - URL upload từ request header
- `src/files/files.service.ts` - Host từ options

### Frontend (apps/web/)
- `lib/config.ts` - Base URL từ env, có logging
- `components/create-product-modal.tsx` - Client validation + clean payload
- `next.config.js` - Image config cho LAN

---

## 📞 KIỂM TRA CUỐI CÙNG

Sau khi làm theo hướng dẫn:

✅ API health check: http://localhost:4000/health  
✅ FE log console: `[API CONFIG] baseUrl=http://192.168.1.X:4000`  
✅ Tạo sản phẩm: Status 201 + toast thành công  
✅ Mobile/Tablet: Load được + tạo sản phẩm được  
✅ Không còn ERR_CONNECTION_REFUSED  
✅ Không còn localhost:4000 khi đang dùng LAN


