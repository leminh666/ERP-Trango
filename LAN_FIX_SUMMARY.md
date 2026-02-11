# 🚀 LAN Access Guide - ERP System

## Mục tiêu
Chạy ứng dụng ERP để **Desktop và Mobile/Tablet** truy cập được mà không cần sửa code khi IP thay đổi.

---

## 📋 Checklist Trước Khi Bắt Đầu

- [ ] Đảm bảo PC và Mobile/Tablet kết nối cùng WiFi/LAN
- [ ] Tắt Windows Firewall hoặc allow ports 3000 và 4000
- [ ] Không có file `.env.local` với IP cứng (hoặc đã xóa IP cũ)

---

## 🏃 Cách 1: Sử Dụng Auto-Detect (ĐƯỢC KHUYẾN NGHỊ)

Cách đơn giản nhất - Frontend tự động phát hiện IP từ trình duyệt.

### Bước 1: Xóa/cập nhật .env.local

Nếu có `.env.local` với IP cứng, xóa dòng `NEXT_PUBLIC_API_URL`:

```bash
cd apps/web
# Xem nội dung hiện tại
type .env.local

# Nếu có IP cứng (ví dụ: 192.168.1.3), xóa dòng đó
# Chỉ giữ lại:
# NEXT_PUBLIC_API_TIMEOUT=15000
```

### Bước 2: Chạy API Server

```cmd
cd apps/api
npm run start:dev
```

**Output mong đợi:**
```
🔍 Checking port 4000...
✅ Port 4000 is available
🚀 API SERVER STARTED
📡 Local URL:   http://localhost:4000
📡 LAN URL:      http://0.0.0.0:4000
📡 Health:       http://localhost:4000/health
✅ CORS configured with X origins:
   1. http://localhost:3000
   2. http://127.0.0.1:3000
   3. http://192.168.1.12:3000  <-- IP của bạn
```

### Bước 3: Chạy Web Server

```cmd
cd apps/web
npm run dev:lan
```

**Output mong đợi:**
```
ready - started server on 0.0.0.0:3000, url = http://localhost:3000
```

### Bước 4: Truy Cập Từ Các Thiết Bị

| Thiết bị | URL | Cách hoạt động |
|----------|-----|----------------|
| **Desktop** | `http://localhost:3000` | FE → `http://localhost:4000` (auto-detect) |
| **Desktop** | `http://192.168.1.12:3000` | FE → `http://192.168.1.12:4000` (auto-detect) |
| **Mobile** | `http://192.168.1.12:3000` | FE → `http://192.168.1.12:4000` (auto-detect) |

### Bước 5: Verify

1. Mở **DevTools → Console** trên Desktop:
   ```
   [API CONFIG] Auto-detected from browser: http://localhost:4000
   [API] ✅ Success: data
   ```

2. Mở **DevTools → Console** trên Mobile:
   ```
   [API CONFIG] Auto-detected from browser: http://192.168.1.12:4000
   [API] ✅ Success: data
   ```

---

## 🔄 Khi IP Thay Đổi (Ví dụ: 192.168.1.3 → 192.168.1.12)

### Chỉ cần làm:

1. **Restart API Server** (để CORS nhận IP mới):
   ```cmd
   # Trong terminal đang chạy API
   Ctrl+C
   npm run start:dev
   ```

2. **F5 trình duyệt** (để FE nhận IP mới):
   - Frontend sẽ auto-detect IP mới từ `window.location.hostname`
   - Không cần sửa code!

### Không cần làm:
- ❌ Sửa `.env.local`
- ❌ Sửa `next.config.js`
- ❌ Deploy lại

---

## 🛠 Cách 2: Sử Dụng Proxy Mode (Thay Thế)

Dùng Next.js rewrites để proxy `/api/*` → backend.

### Bước 1: Tạo/Cập nhật .env.local

```bash
cd apps/web
echo "NEXT_PUBLIC_USE_PROXY=true" >> .env.local
echo "NEXT_PUBLIC_API_TIMEOUT=15000" >> .env.local
```

### Bước 2: Restart Web Server

```cmd
npm run dev:lan
```

### Bước 3: Cách Hoạt Động

| Thiết bị | URL | Request |
|----------|-----|---------|
| Desktop | `http://localhost:3000/api/auth/login` | → proxy → `http://localhost:4000/auth/login` |
| Mobile | `http://192.168.1.12:3000/api/auth/login` | → proxy → `http://localhost:4000/auth/login` |

**Ưu điểm:** Không cần CORS (same-origin)
**Nhược điểm:** Phức tạp hơn, một số endpoint cần gọi trực tiếp

---

## 🔥 Troubleshooting

### Lỗi: "Failed to fetch" / "ERR_CONNECTION_REFUSED"

**Nguyên nhân:** FE đang gọi IP cũ hoặc BE không chạy.

**Kiểm tra:**

1. **BE có đang chạy không?**
   ```cmd
   curl http://localhost:4000/health
   # Response: {"status":"ok",...}
   ```

2. **BE có accessible từ LAN không?**
   ```cmd
   # Từ PC:
   curl http://192.168.1.12:4000/health
   
   # Từ Mobile (dùng termux hoặc similar):
   curl http://192.168.1.12:4000/health
   ```

3. **Console FE hiện gì?**
   - Mở DevTools → Console
   - Tìm `[API CONFIG]` - phải hiện IP đúng

**Giải pháp:**
```cmd
# Restart API
cd apps/api
npm run start:dev

# Restart Web (trong terminal khác)
cd apps/web
npm run dev:lan

# Clear browser cache: Ctrl+Shift+R (hard refresh)
```

---

### Lỗi: CORS "Access to fetch blocked"

**Nguyên nhân:** Origin không có trong danh sách CORS của BE.

**Giải pháp 1:** Restart API để auto-detect IP mới
```cmd
cd apps/api
# Ctrl+C rồi chạy lại
npm run start:dev
```

**Giải pháp 2:** Thêm IP thủ công vào .env của API
```bash
cd apps/api
# Tạo/cập nhật .env
echo "WEB_CORS_ORIGINS=http://192.168.1.12:3000" >> .env

# Restart API
npm run start:dev
```

**Giải pháp 3:** Cho phép tất cả origins (DEV ONLY!)
```bash
cd apps/api
echo "ALLOW_ALL_CORS=true" >> .env

# Restart API
npm run start:dev
```
⚠️ **Cảnh báo:** Chỉ dùng trong development!

---

### Lỗi: Network timeout trên Mobile

**Nguyên nhân:** Firewall chặn kết nối.

**Kiểm tra:**
```cmd
# Trên PC, kiểm tra port có đang listen không
netstat -ano | findstr :4000

# Output mong đợi:
# TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING       <PID>
```

**Giải pháp - Mở Firewall:**

```powershell
# Chạy PowerShell as Administrator

# Cách 1: Allow Node.js
Get-Process -Name node | ForEach-Object {
    $path = $_.Path
    New-NetFirewallRule -DisplayName "Allow Node ($path)" -Direction Inbound -Program $path -Action Allow -Profile Private
}

# Cách 2: Allow specific ports
New-NetFirewallRule -DisplayName "Allow API 4000" -Direction Inbound -Port 4000 -Protocol TCP -Action Allow -Profile Private
New-NetFirewallRule -DisplayName "Allow Web 3000" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow -Profile Private
```

---

### Lỗi: Console hiện "localhost" thay vì IP LAN

**Nguyên nhân:** FE config vẫn dùng localhost.

**Giải pháp:**
```bash
cd apps/web

# Xóa .env.local cũ hoặc đảm bảo không có dòng NEXT_PUBLIC_API_URL
# Nếu có, xóa dòng đó

# Restart Web server
npm run dev:lan

# Hard refresh trình duyệt: Ctrl+Shift+R
```

---

## 📝 Quick Commands

```cmd
# Tìm IP của PC
ipconfig | findstr "IPv4"

# Test API từ PC
curl http://localhost:4000/health

# Test API từ LAN (cùng PC)
curl http://192.168.1.12:4000/health

# Kill process trên port
taskkill /PID <PID> /F

# Xem ports đang listening
netstat -ano | findstr ":3000\|:4000"
```

---

## 📁 Files Được Thay Đổi

| File | Thay đổi |
|------|----------|
| `apps/web/next.config.js` | Thêm rewrites cho proxy mode |
| `apps/web/lib/config.ts` | Thêm `isUsingProxy()`, hỗ trợ proxy mode |
| `apps/web/.env.local` | Để trống cho auto-detect, hoặc set `NEXT_PUBLIC_USE_PROXY=true` |
| `apps/api/src/main.ts` | Cải thiện CORS logging, thêm `ALLOW_ALL_CORS` |

---

## ✅ Checklist Cuối Cùng

- [ ] API chạy ở `0.0.0.0:4000` (không phải `127.0.0.1`)
- [ ] CORS includes IP của PC (ví dụ: `http://192.168.1.12:3000`)
- [ ] `.env.local` không có IP cứng (hoặc đã xóa)
- [ ] Console hiện auto-detected URL đúng
- [ ] Desktop `localhost:3000` → login OK
- [ ] Mobile `192.168.1.12:3000` → login OK
- [ ] Không có CORS errors trong Console
- [ ] Không có "Failed to fetch" errors

---

## 🎯 Mục tiêu Đạt được

✅ Login hoạt động trên cả Desktop và Mobile
✅ API calls không bị "Failed to fetch"
✅ Không cần sửa code khi IP thay đổi
✅ Hỗ trợ LAN access cho Mobile/Tablet

