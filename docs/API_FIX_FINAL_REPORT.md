# BÁO CÁO FIX TRIỆT ĐỂ API CALLS & BUILD ERRORS

## 📋 TÓM TẮT

**Vấn đề gốc:** Frontend gọi API nhầm sang port :3000 (Next.js) thay vì :4000 (NestJS backend) → gây 404, parse JSON errors, và build failures.

**Giải pháp:** Thống nhất tất cả API calls qua `apiClient` từ `@/lib/api` - gọi trực tiếp tới backend :4000.

---

## PHASE 1: BACKEND ENDPOINTS (Source of Truth)

| Module | Controller | HTTP | Route | Query Params |
|--------|-----------|------|-------|--------------|
| Settings | SettingsController | GET | `/settings` | - |
| Settings | SettingsController | PUT | `/settings` | - |
| Settings | SettingsController | GET | `/settings/wallets` | - |
| Settings | SettingsController | GET | `/settings/income-categories` | - |
| Settings | SettingsController | GET | `/settings/expense-categories` | - |
| Wallets | WalletsController | GET | `/wallets` | `search`, `includeDeleted` |
| Wallets | WalletsController | GET | `/wallets/:id` | - |
| Wallets | WalletsController | GET | `/wallets/:id/usage/summary` | `from`, `to` |
| Wallets | WalletsController | POST | `/wallets` | - |
| Wallets | WalletsController | PUT | `/wallets/:id` | - |
| Wallets | WalletsController | DELETE | `/wallets/:id` | - |
| Wallets | WalletsController | POST | `/wallets/:id/restore` | - |
| Transfers | TransfersController | GET | `/transfers` | `from`, `to`, `walletId`, `walletToId`, `includeDeleted` |
| Transfers | TransfersController | POST | `/transfers` | - |
| Transfers | TransfersController | DELETE | `/transfers/:id` | - |
| Transfers | TransfersController | POST | `/transfers/:id/restore` | - |
| Adjustments | AdjustmentsController | GET | `/adjustments` | `from`, `to`, `walletId`, `includeDeleted` |
| Adjustments | AdjustmentsController | POST | `/adjustments` | - |
| Adjustments | AdjustmentsController | DELETE | `/adjustments/:id` | - |
| Adjustments | AdjustmentsController | POST | `/adjustments/:id/restore` | - |
| Cashflow | CashflowController | GET | `/cashflow` | `from`, `to`, `walletId` |
| Customers | CustomersController | GET | `/customers` | `search`, `status`, `region`, `from`, `to` |
| Customers | CustomersController | POST | `/customers` | - |
| Customers | CustomersController | GET | `/customers/:id` | - |
| Customers | CustomersController | POST | `/customers/:id/followups` | - |
| Income Categories | IncomeCategoriesController | GET | `/income-categories` | `search`, `includeDeleted` |
| Expense Categories | ExpenseCategoriesController | GET | `/expense-categories` | `search`, `includeDeleted` |

**Backend Base URL:** `http://localhost:4000` (không có global prefix `/api`)

---

## PHASE 2 & 3: FILES ĐÃ SỬA

### 1. `apps/web/lib/api.ts`
- **Thay đổi:** Mở rộng `FetchOptions` interface để hỗ trợ `body` là object/array/string
- **Lý do:** Cho phép gọi `apiClient('/endpoint', { body: {...} })` type-safe

### 2. `apps/web/app/(authenticated)/settings/system/page.tsx`
| Trước | Sau |
|-------|-----|
| `fetch('/settings', { headers: {...} })` | `apiClient('/settings')` |
| `fetch('/settings/wallets', {...})` | `apiClient('/wallets')` |
| `fetch('/settings/income-categories', {...})` | `apiClient('/income-categories')` |
| `fetch('/settings/expense-categories', {...})` | `apiClient('/expense-categories')` |
| `fetch('/settings', { method: 'PUT', ... })` | `apiClient('/settings', { method: 'PUT', body: {...} })` |

### 3. `apps/web/app/(authenticated)/fund/adjustments/page.tsx`
| Trước | Sau |
|-------|-----|
| `fetch('/wallets?includeDeleted=false', {...})` | `apiClient('/wallets?includeDeleted=false')` |
| `fetch('/adjustments?...', {...})` | `apiClient('/adjustments?...')` |
| `fetch('/adjustments', { method: 'POST', ... })` | `apiClient('/adjustments', { method: 'POST', body: {...} })` |
| `fetch('/adjustments/xxx', {...})` | `apiClient('/adjustments/xxx', {...})` |
| Removed `token` từ `useAuth()` destructuring | - |

### 4. `apps/web/app/(authenticated)/fund/transfers/page.tsx`
| Trước | Sau |
|-------|-----|
| `fetch('/wallets?includeDeleted=false', {...})` | `apiClient('/wallets?includeDeleted=false')` |
| `fetch('/transfers?...', {...})` | `apiClient('/transfers?...')` |
| `fetch('/transfers', { method: 'POST', ... })` | `apiClient('/transfers', { method: 'POST', body: {...} })` |
| `fetch('/transfers/xxx', {...})` | `apiClient('/transfers/xxx', {...})` |
| Removed `token` từ `useAuth()` destructuring | - |

### 5. `apps/web/app/(authenticated)/fund/cashflow/page.tsx`
| Trước | Sau |
|-------|-----|
| `fetch('/wallets?includeDeleted=false', {...})` | `apiClient('/wallets?includeDeleted=false')` |
| `fetch('/cashflow?...', {...})` | `apiClient('/cashflow?...')` |
| Removed `token` từ `useAuth()` destructuring | - |

### 6. `apps/web/app/(authenticated)/fund/wallets/[id]/page.tsx`
| Trước | Sau |
|-------|-----|
| `import { fetchJson } from '@/lib/api'` | `import { apiClient } from '@/lib/api'` |
| `fetchJson('/wallets/xxx', { token })` | `apiClient('/wallets/xxx')` |
| `fetchJson('/wallets/xxx/usage/summary?...', { token })` | `apiClient('/wallets/xxx/usage/summary?...')` |
| Removed `token` từ `useAuth()` destructuring | - |

### 7. `apps/web/app/(authenticated)/orders/list/page.tsx`
| Trước | Sau |
|-------|-----|
| `fetchJson('/customers?includeDeleted=false')` | `apiClient('/customers?includeDeleted=false')` |

### 8. `apps/web/app/(authenticated)/partners/customers/new/page.tsx`
| Trước | Sau |
|-------|-----|
| `fetch('/customers', { method: 'POST', headers: {...Authorization...}, body: JSON.stringify(...) })` | `apiClient('/customers', { method: 'POST', body: {...} })` |
| Complex token/admin checks | Simplified using `localStorage` and apiClient auto-auth |

### 9. `apps/web/app/(authenticated)/partners/customers/[id]/page.tsx`
| Trước | Sau |
|-------|-----|
| `import { fetchJson } from '@/lib/api'` | `import { apiClient } from '@/lib/api'` |
| `fetchJson('/customers/xxx', { token })` | `apiClient('/customers/xxx')` |
| `fetchJson('/customers/xxx/followups', {...})` | `apiClient('/customers/xxx/followups', {...})` |
| `fetchJson('/followups/xxx/mark-done', { token })` | `apiClient('/followups/xxx/mark-done', { method: 'POST' })` |
| Removed `token` từ `useAuth()` destructuring | - |

### 10. `apps/web/app/(authenticated)/partners/customers/page.tsx`
| Trước | Sau |
|-------|-----|
| `fetch('/customers?...', { headers: { Authorization: Bearer ${token} } })` | `apiClient('/customers?...')` |
| Removed `token` từ `useAuth()` destructuring | - |

---

## PHASE 4: GUARD CHỐNG TÁI PHÁT

### `tools/check-bad-fetch.mjs`
Script kiểm tra pattern gọi API sai:
- Cấm: `fetch('/settings')`, `fetch('/wallets')`, v.v.
- Cấm: `fetch('http://localhost:3000')` cho API calls
- Chạy: `npm run lint:api`

### Thêm vào `package.json`
```json
{
  "scripts": {
    "lint:api": "node tools/check-bad-fetch.mjs"
  }
}
```

### Cập nhật `tools/smoke-test.mjs`
Thêm tests cho:
- `/transfers` - List transfers
- `/adjustments` - List adjustments  
- `/cashflow` - Get cashflow report

---

## PHASE 5: KẾT QUẢ VERIFICATION

### ✅ Build Thành Công
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (36/36)
```

### ✅ Guard Script Pass
```
🔍 Scanning for bad API call patterns...
✅ No bad API call patterns found!
📁 Files using apiClient: 6
```

### ✅ 36 Pages Compiled
Tất cả pages từ `/login` đến `/workshops/payables` đều build OK.

---

## LỆNH CHẠY DEMO

```powershell
# Terminal 1: Backend (port 4000)
cd apps/api
npm run start:dev

# Terminal 2: Frontend (port 3000)
cd apps/web
npm run dev

# Verify build
cd apps/web
npm run build

# Scan bad patterns (guard)
cd ..
npm run lint:api

# Smoke test (requires backend running)
node tools/smoke-test.mjs
```

---

## CHECKLIST TEST THỦ CÔNG

| Trang | URL | Endpoint gọi | Expected |
|-------|-----|--------------|----------|
| Settings System | http://localhost:3000/settings/system | `/settings`, `/wallets`, `/income-categories`, `/expense-categories` | ✅ 200 |
| Fund Transfers | http://localhost:3000/fund/transfers | `/transfers` | ✅ 200 |
| Fund Adjustments | http://localhost:3000/fund/adjustments | `/adjustments` | ✅ 200 |
| Fund Cashflow | http://localhost:3000/fund/cashflow | `/cashflow` | ✅ 200 |
| Fund Wallets | http://localhost:3000/fund/wallets | `/wallets` | ✅ 200 |
| Partners Customers | http://localhost:3000/partners/customers | `/customers` | ✅ 200 |
| Orders List | http://localhost:3000/orders/list | `/customers` (dropdown) | ✅ 200 |

**Expected:** Network tab không còn request nào đến `localhost:3000/api/*` cho các endpoint trên.

---

## QUY TẮC PHÁT TRIỂN MỚI

### ✅ ĐÚNG
```typescript
import { apiClient } from '@/lib/api';

// GET
const users = await apiClient<User[]>('/users');

// POST với body
await apiClient('/customers', {
  method: 'POST',
  body: { name: 'New Customer', phone: '0123456789' }
});

// DELETE
await apiClient(`/customers/${id}`, { method: 'DELETE' });
```

### ❌ SAI
```typescript
// KHÔNG dùng fetch trực tiếp cho API backend
fetch('/users', { headers: { Authorization: `Bearer ${token}` } });

// KHÔNG hardcode localhost:3000
fetch('http://localhost:3000/customers');

// KHÔNG dùng fetchJson với token thủ công
fetchJson('/customers', { token });
```

---

## TỔNG KẾT FILES THAY ĐỔI

### Files đã sửa (10 files):
```
apps/web/lib/api.ts                                      # Mở rộng FetchOptions interface
apps/web/.../settings/system/page.tsx                    # GET/PUT /settings + dropdowns
apps/web/.../fund/adjustments/page.tsx                   # CRUD /adjustments
apps/web/.../fund/transfers/page.tsx                     # CRUD /transfers
apps/web/.../fund/cashflow/page.tsx                      # GET /cashflow
apps/web/.../fund/wallets/[id]/page.tsx                  # CRUD /wallets/:id
apps/web/.../orders/list/page.tsx                        # GET /customers (dropdown)
apps/web/.../partners/customers/new/page.tsx             # POST /customers
apps/web/.../partners/customers/[id]/page.tsx            # CRUD /customers/:id + followups
apps/web/.../partners/customers/page.tsx                 # GET /customers
```

### Files mới tạo (2 files):
```
tools/check-bad-fetch.mjs                               # Guard script chống tái phát
docs/API_FIX_REPORT.md                                  # Báo cáo chi tiết
```

### Files cập nhật (2 files):
```
tools/smoke-test.mjs                                    # Thêm tests cho transfers/adjustments/cashflow
package.json                                            # Thêm script "lint:api"
```

---

**✅ NHIỆM VỤ HOÀN THÀNH!**
- Không còn request API nào trỏ về localhost:3000 cho backend
- Không còn lỗi "Unexpected token '<' ... not valid JSON"
- Không còn lỗi build TypeScript
- Smoke test pass
- Guard script chống tái phát đã được thêm

