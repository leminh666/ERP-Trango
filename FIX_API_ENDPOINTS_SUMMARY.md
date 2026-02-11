# 📋 BÁO CÁO FIX DASHBOARD/REPORTS - API ENDPOINT FIX

## 🎯 TÌNH TRẠNG: ✅ ĐÃ FIX XONG VÀ TESTED

---

## 1️⃣ VẤN ĐỀ GỐC

### **Lỗi 1: Dashboard gọi sai endpoint (404/HTML thay vì JSON)**

**File:** `apps/web/app/(authenticated)/dashboard/page.tsx:61-66`

```typescript
// ❌ SAI: Dùng fetch trực tiếp, không qua fetchJson()
const res = await fetch(
  `/reports/dashboard?from=${timeFilter.from}&to=${timeFilter.to}`,
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);
const result = await res.json();
```

**Hậu quả:**
- Gọi `http://localhost:3000/reports/dashboard` 
- Next.js rewrite `/api/:path*` → `http://localhost:4000/:path*`
- Nhưng `/reports/dashboard` (KHÔNG có `/api/`) không được rewrite → 404 HTML

### **Lỗi 2: Auth error trả về HTML thay vì JSON**

Khi không có token hoặc token hết hạn:
- Backend NestJS redirect về HTML login page
- Frontend parse HTML như JSON → `SyntaxError: Unexpected token '<'`

---

## 2️⃣ CÁC FILE ĐÃ SỬA

### **File 1:** `apps/web/app/(authenticated)/dashboard/page.tsx`

**Thay đổi 1:** Import `fetchJson`
```typescript
import { fetchJson } from '@/lib/api';
```

**Thay đổi 2:** Sửa hàm `fetchDashboardData`
```typescript
// ✅ ĐÚNG: Dùng fetchJson() với proper error handling
const fetchDashboardData = async () => {
  try {
    setLoading(true);
    const result = await fetchJson<DashboardData>(`/reports/dashboard?from=${timeFilter.from}&to=${timeFilter.to}`);
    if (result && typeof result === 'object') {
      setData(result);
    } else {
      setData(null);
      console.error('Invalid dashboard data:', result);
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    setData(null);
  } finally {
    setLoading(false);
  }
};
```

---

### **File 2:** `apps/api/src/main.ts`

**Thêm:** Global Exception Filter để trả về JSON cho API errors

```typescript
import { GlobalExceptionFilter } from './common/global-exception.filter';

// ...
app.useGlobalFilters(new GlobalExceptionFilter());
```

**Mục đích:** Đảm bảo khi unauthorized (401), API trả về JSON thay vì HTML redirect.

---

### **File 3:** `apps/api/src/common/global-exception.filter.ts` (MỚI TẠO)

**Mục đích:** Handle tất cả exceptions và trả về JSON cho API requests

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // ... xử lý exception
    // Trả về JSON cho API requests (path bắt đầu với / hoặc /api/)
  }
}
```

---

## 3️⃣ KIẾN TRÚC ROUTE HIỆN TẠI

### **Next.js Web (Port 3000)**
```
/api/:path*  →  Rewrite to  http://localhost:4000/:path*
```

### **NestJS API (Port 4000)**
```
/reports/dashboard        →  DashboardController.getDashboardData()
/reports/expense-summary  →  ReportsController.getExpenseSummary()
/reports/customer-regions →  ReportsController.getCustomerRegionsReport()
/auth/login               →  AuthController.login()
```

---

## 4️⃣ KẾT QUẢ API INTEGRATION TEST

```
============================================================
🚀 API INTEGRATION TEST
============================================================

🔐 STEP 1: Login to get token
   Status: 200 ✅
   Token: eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...

📊 STEP 2: Test Dashboard endpoint
   Status: 200 ✅
   Data: {
     "revenueTotal": 323700000,
     "expenseTotal": 135100000,
     "profit": 188600000,
     "series": [...]
   }

💸 STEP 3: Test Expense Report endpoint
   Status: 200 ✅
   Data: {
     "total": 135100000,
     "directTotal": 130000000,
     "commonTotal": 5100000,
     "byCategory": [...]
   }

🗺️ STEP 4: Test Customer Regions endpoint
   Status: 200 ✅
   Data: {
     "byRegion": [
       { "region": "HCM", "revenueTotal": 320000000, ... },
       ...
     ]
   }

🔒 STEP 5: Test unauthorized request
   Status: 401 ✅ (JSON, không phải HTML)

📋 TEST SUMMARY
   ✅ PASS: Dashboard
   ✅ PASS: Expense Report
   ✅ PASS: Customer Regions
   ✅ PASS: Unauthorized JSON
```

---

## 5️⃣ DANH SÁCH FILE THAY ĐỔI

| File | Thay đổi | Lý do |
|------|----------|-------|
| `apps/web/app/(authenticated)/dashboard/page.tsx` | Sửa `fetch()` → `fetchJson()` | Dùng wrapper có proper error handling |
| `apps/api/src/main.ts` | Thêm `useGlobalFilters()` | Trả về JSON cho API errors |
| `apps/api/src/common/global-exception.filter.ts` | **MỚI TẠO** | Handle exceptions và trả JSON |

---

## 6️⃣ SCRIPTS TEST ĐÃ TẠO

| Script | Mục đích |
|--------|----------|
| `test-api-integration.js` | Test tất cả API endpoints |
| `test-reports-api.js` | Simulate API logic |
| `sanity-check.js` | Verify database data |

---

## 7️⃣ HƯỚNG DẪN VERIFY THỦ CÔNG

### **Bước 1: Đảm bảo services đang chạy**

```bash
# Terminal 1 - API
cd apps/api
npm run dev:api

# Terminal 2 - Web
cd apps/web
npm run dev
```

### **Bước 2: Login**

1. Mở http://localhost:3000
2. Đăng nhập:
   - Email: `admin@demo.com`
   - Password: `123456`

### **Bước 3: Verify Dashboard**

1. Vào `/dashboard`
2. Mở DevTools (F12) → Network tab
3. Refresh page
4. Tìm request `/api/reports/dashboard`
5. Verify:
   - ✅ Status: 200
   - ✅ Content-Type: application/json
   - ✅ Response có: `revenueTotal`, `expenseTotal`, `profit`, `series`

### **Bước 4: Verify Expense Report**

1. Vào `/reports/expense`
2. Verify Network request `/api/reports/expense-summary`
3. Check:
   - ✅ Status: 200
   - ✅ Response có: `total`, `directTotal`, `commonTotal`, `byCategory`

### **Bước 5: Verify Customer Regions**

1. Vào `/reports/customer-regions`
2. Verify Network request `/api/reports/customer-regions`
3. Check:
   - ✅ Status: 200
   - ✅ Response có: `byRegion`, `topRegionsByCustomers`, `topRegionsByRevenue`

---

## 8️⃣ CHECKLIST CHẤT LƯỢNG

- [x] Không làm hỏng module khác
- [x] Không thay đổi API contract
- [x] Endpoint trả về JSON đúng schema
- [x] Error handling tốt hơn
- [x] Auth error trả về JSON (không redirect HTML)
- [x] Build pass
- [x] API integration tests pass

---

## 9️⃣ LỆNH HỮU ÍCH

```bash
# Chạy API integration test
npx tsx test-api-integration.js

# Chạy sanity check
npx tsx sanity-check.js

# Chạy API tests
npx tsx test-reports-api.js
```

---

**📅 Ngày hoàn thành:** 2026-01-31
**🎯 Trạng thái:** ✅ DONE - Tất cả tests passed

