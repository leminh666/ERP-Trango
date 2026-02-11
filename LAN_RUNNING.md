# Hướng dẫn chạy ERP trên LAN (Desktop + Mobile)

## Tổng quan

Hệ thống ERP có thể được truy cập từ nhiều thiết bị trong mạng LAN:
- **Desktop**: `http://localhost:3000` hoặc `http://192.168.1.3:3000`
- **Mobile/Tablet**: `http://192.168.1.3:3000` (cùng mạng WiFi)

---

## Bước 1: Xác định IP máy tính

### Windows
```powershell
ipconfig
```
Tìm dòng "IPv4 Address" trong phần WiFi hoặc Ethernet.
```
IPv4 Address . . . . . . . . . : 192.168.1.3
```

### Lưu ý với Docker
Sau khi cài Docker, có thể có thêm network adapter ảo. Hãy chắc chắn sử dụng IP của card mạng vật lý (WiFi/Ethernet), không phải Docker's virtual network.

---

## Bước 2: Cấu hình Frontend

### Tạo/Cập nhật file `.env.local`

**File**: `apps/web/.env.local`

```env
# QUAN TRỌNG: Thay đổi IP này cho đúng với IP máy tính của bạn!
NEXT_PUBLIC_API_URL=http://192.168.1.3:4000

# Timeout cho API (milliseconds)
NEXT_PUBLIC_API_TIMEOUT=15000
```

### Sau khi sửa IP, restart frontend:
```bash
cd apps/web
npm run dev:lan
```

---

## Bước 3: Chạy Backend

### Khởi động (đã bind 0.0.0.0:4000)
```bash
cd apps/api
npm run start:dev
```

### Kiểm tra backend hoạt động
Mở browser trên máy chính:
```
http://localhost:4000/health
```

Response mong đợi:
```json
{
  "status": "ok",
  "port": 4000
}
```

### Kiểm tra từ máy khác trong LAN
```bash
curl http://192.168.1.3:4000/health
```

---

## Bước 4: Chạy Frontend

### Chế độ LAN (bind 0.0.0.0:3000)
```bash
cd apps/web
npm run dev:lan
```

### Hoặc chế độ local only
```bash
npm run dev
```

---

## Bước 5: Truy cập từ Mobile

### Điều kiện tiên quyết
1. Mobile và PC phải cùng mạng WiFi
2. Firewall Windows phải cho phép port 3000 và 4000

### Mở Firewall (nếu cần)
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="ERP Frontend" dir=in action=allow protocol=tcp localport=3000
netsh advfirewall firewall add rule name="ERP Backend" dir=in action=allow protocol=tcp localport=4000
```

### Kiểm tra kết nối từ Mobile
1. Mở browser trên điện thoại
2. Truy cập: `http://192.168.1.3:3000`
3. Đăng nhập và kiểm tra dữ liệu

---

## Kiểm tra & Khắc phục lỗi

### Lỗi "Failed to fetch"

**Nguyên nhân 1**: Backend không chạy
```bash
# Kiểm tra backend có đang chạy không
curl http://localhost:4000/health
# Nếu không có response, hãy chạy backend
cd apps/api && npm run start:dev
```

**Nguyên nhân 2**: API URL sai trong `.env.local`
```env
# SAI ❌
NEXT_PUBLIC_API_URL=192.168.1.3:4000  (thiếu http://)

# ĐÚNG ✅
NEXT_PUBLIC_API_URL=http://192.168.1.3:4000
```

**Nguyên nhân 3**: IP trong `.env.local` không khớp với IP thực
```powershell
# Kiểm tra IP thực
ipconfig
# Cập nhật .env.local với IP đúng
```

### Lỗi CORS

**Triệu chứng**: "Access to fetch has been blocked by CORS policy"

**Giải pháp**:
1. Backend tự động detect LAN IPs và thêm vào CORS
2. Nếu vẫn lỗi, thêm thủ công vào `.env`:
```env
WEB_CORS_ORIGINS=http://192.168.1.3:3000
```
3. Restart backend sau khi sửa

### Lỗi timeout khi load ảnh

**Nguyên nhân**: Uploads folder chưa được mount/container chưa expose

**Giải pháp**:
1. Kiểm tra uploads folder tồn tại: `apps/api/uploads/`
2. Nếu dùng Docker, mount volume:
```yaml
volumes:
  - ./uploads:/app/uploads
```

---

## Docker Considerations

### Nếu chạy Backend trong Docker

```yaml
# docker-compose.yml cho backend
services:
  api:
    build: ./apps/api
    ports:
      - "4000:4000"  # Expose port 4000
    environment:
      - WEB_CORS_ORIGINS=http://localhost:3000,http://192.168.1.3:3000
    volumes:
      - ./apps/api/uploads:/app/uploads
    command: npm run start:dev
```

### Lưu ý quan trọng với Docker
1. Backend phải bind `0.0.0.0` (không phải `127.0.0.1`)
2. Port phải được expose: `-p 4000:4000`
3. Uploads folder phải được mount

### Docker Desktop trên Windows/Mac
- Sử dụng `host.docker.internal` thay vì `localhost` để truy cập host machine
- Hoặc tạo Docker network với `--gateway`

---

## Checklist trước khi Demo

- [ ] Chạy `ipconfig` và xác nhận IP (ví dụ: 192.168.1.3)
- [ ] Cập nhật `apps/web/.env.local` với IP đúng
- [ ] Restart frontend (`npm run dev:lan`)
- [ ] Backend đang chạy và `curl http://localhost:4000/health` trả về `{"status":"ok"}`
- [ ] Kiểm tra Firewall cho phép port 3000 và 4000
- [ ] Test trên desktop: `http://localhost:3000` và `http://192.168.1.3:3000`
- [ ] Test trên mobile: `http://192.168.1.3:3000`

---

## Commands tóm tắt

```bash
# 1. Xem IP
ipconfig

# 2. Chạy Backend
cd apps/api
npm run start:dev

# 3. Chạy Frontend (terminal khác)
cd apps/web
npm run dev:lan

# 4. Test Backend
curl http://localhost:4000/health

# 5. Test từ mobile (cùng mạng)
# Mở browser: http://192.168.1.3:3000
```

