# BÁO CÁO FIX TRIỆT ĐỂ LỖI API CALLS & 404/JSON PARSE

## 📋 TÓM TẮT

**Vấn đề gốc:** Frontend gọi API nhầm sang port :3000 (Next.js) thay vì :4000 (NestJS backend) → gây 404 và lỗi parse JSON.

**Giải pháp:** Thống nhất tất cả API calls qua `apiClient` từ `@/lib/api` - gọi trực tiếp tới backend :4000.

---

## PHASE A: BACKEND ENDPOINTS (Source of Truth)

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
| Transfers | TransfersController | GET | `/transfers/:id` | - |
| Transfers | TransfersController | POST | `/transfers` | - |
| Transfers | TransfersController | DELETE | `/transfers/:id` | - |
| Transfers | TransfersController | POST | `/transfers/:id/restore` | - |
| Adjustments | AdjustmentsController | GET | `/adjustments` | `from`, `to`, `walletId`, `includeDeleted` |
| Adjustments | AdjustmentsController | GET | `/adjustments/:id` | - |
| Adjustments | AdjustmentsController | POST | `/adjustments` | - |
| Adjustments | AdjustmentsController | DELETE | `/adjustments/:id` | - |
| Adjustments | AdjustmentsController | POST | `/adjustments/:id/restore` | - |
| Cashflow | CashflowController | GET | `/cashflow` | `from`, `to`, `walletId` |
| Income Categories | IncomeCategoriesController | GET | `/income-categories` | `search`, `includeDeleted` |
| Expense Categories | ExpenseCategoriesController | GET | `/expense-categories` | `search`, `includeDeleted` |

---

## PHASE B & C: FILES ĐÃ SỬA

### 1. `apps/web/lib/api.ts`
- **Thay đổi:** Mở rộng `FetchOptions` để hỗ trợ `body` là object/array/string
- **Lý do:** Cho phép gọi `apiClient('/endpoint', { body: {...} })`

### 2. `apps/web/app/(authenticated)/settings/system/page.tsx`
| Dòng | Trước | Sau |
|------|-------|-----|
| 121-133 | `fetch('/settings', { headers: {...} })` | `apiClient('/settings')` |
| 135-155 | 3x `fetch('/settings/xxx', {...})` | 3x `apiClient('/xxx')` |
| 168-189 | `fetch('/settings', { method: 'PUT', ... })` | `apiClient('/settings', { method: 'PUT', body: {...} })` |

### 3. `apps/web/app/(authenticated)/fund/adjustments/page.tsx`
| Dòng | Trước | Sau |
|------|-------|-----|
| 56-68 | `fetch('/wallets?includeDeleted=false', {...})` | `apiClient('/wallets?includeDeleted=false')` |
| 70-88 | `fetch('/adjustments?...', {...})` | `apiClient('/adjustments?...')` |
| 101-135 | `fetch('/adjustments', { method: 'POST', ... })` | `apiClient('/adjustments', { method: 'POST', body: {...} })` |
| 137-165 | 2x `fetch('/adjustments/xxx', {...})` | 2x `apiClient('/adjustments/xxx', {...})` |
| 31 | `const { token, user } = useAuth()` | `const { user } = useAuth()` |

### 4. `apps/web/app/(authenticated)/fund/transfers/page.tsx`
| Dòng | Trước | Sau |
|------|-------|-----|
| 59-71 | `fetch('/wallets?includeDeleted=false', {...})` | `apiClient('/wallets?includeDeleted=false')` |
| 73-92 | `fetch('/transfers?...', {...})` | `apiClient('/transfers?...')` |
| 106-141 | `fetch('/transfers', { method: 'POST', ... })` | `apiClient('/transfers', { method: 'POST', body: {...} })` |
| 144-172 | 3x `fetch('/transfers/xxx', {...})` | 3x `apiClient('/transfers/xxx', {...})` |
| 33 | `const { token, user } = useAuth()` | `const { user } = useAuth()` |

### 5. `apps/web/app/(authenticated)/fund/cashflow/page.tsx`
| Dòng | Trước | Sau |
|------|-------|-----|
| 84-95 | `fetch('/wallets?includeDeleted=false', {...})` | `apiClient('/wallets?includeDeleted=false')` |
| 121-144 | `fetch('/cashflow?...', {...})` | `apiClient('/cashflow?...')` |
| 57 | `const { token } = useAuth()` | (removed - token tự động từ apiClient) |

### 6. `apps/web/app/(authenticated)/fund/wallets/[id]/page.tsx`
| Dòng | Trước | Sau |
|------|-------|-----|
| 6 | `import { fetchJson } from '@/lib/api'` | `import { apiClient } from '@/lib/api'` |
| 89-97 | `fetchJson('/wallets/xxx', { token })` | `apiClient('/wallets/xxx')` |
| 129 | `fetchJson('/wallets/xxx/usage/summary?...', { token })` | `apiClient('/wallets/xxx/usage/summary?...')` |
| 139-150 | `fetchJson('/wallets/xxx', { method: 'DELETE', token })` | `apiClient('/wallets/xxx', { method: 'DELETE' })` |
| 71 | `const { token, user } = useAuth()` | `const { user } = useAuth()` |

---

## PHASE D: GUARD CHỐNG TÁI PHÁT

### Tạo `tools/check-bad-fetch.mjs`
- Script kiểm tra pattern gọi API sai
- Cấm: `fetch('/settings')`, `fetch('/wallets')`, v.v.
- Cấm: `fetch('http://localhost:3000')`
- Chạy: `npm run lint:api`

### Thêm vào `package.json`
```json
{
  "scripts": {
    "lint:api": "node tools/check-bad-fetch.mjs"
  }
}
```

---

## PHASE E: VERIFICATION

### Build thành công ✅
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (36/36)
```

### Guard script pass ✅
```
🔍 Scanning for bad API call patterns...
✅ No bad API call patterns found!
📁 Files using apiClient: 6
```

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

# Scan API calls (guard)
cd ..
npm run lint:api
```

---

## CHECKLIST TEST THỦ CÔNG

| Trang | URL | Kiểm tra |
|-------|-----|----------|
| Settings System | http://localhost:3000/settings/system | Settings load đúng từ :4000 |
| Fund Transfers | http://localhost:3000/fund/transfers | Transfers list + create + delete |
| Fund Adjustments | http://localhost:3000/fund/adjustments | Adjustments list + create + delete |
| Fund Cashflow | http://localhost:3000/fund/cashflow | Cashflow report từ :4000 |
| Fund Wallets | http://localhost:3000/fund/wallets | Wallets list + detail |

**Expected:** Network tab không còn request nào đến `localhost:3000/api/*` cho các endpoint trên.

---

## QUY TẮC PHÁT TRIỂN MỚI

1. **LUÔN dùng `apiClient` từ `@/lib/api`** cho mọi API call
2. **KHÔNG dùng `fetch()` trực tiếp** cho backend calls
3. **CHẠY `npm run lint:api`** trước khi commit
4. **Token tự động attach** bởi apiClient - không cần truyền thủ công

```typescript
// ✅ ĐÚNG
import { apiClient } from '@/lib/api';
const data = await apiClient('/users');
await apiClient('/wallets', { method: 'POST', body: {...} });

// ❌ SAI
import { fetch } from 'fetch';
fetch('/users', { headers: { Authorization: `Bearer ${token}` } });
```

