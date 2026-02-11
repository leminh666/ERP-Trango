# FIX REPORT: Customer Create 500 Error + Port EADDRINUSE Issue

## Date: 2026-02-01

---

## LỖI 1: "Tạo khách hàng mới" bị 500 Internal Server Error

### Root Cause Analysis

**Mapping FE ↔ BE ↔ DB:**

| Layer | Field | Required | Type | Status |
|-------|-------|----------|------|--------|
| Frontend (create-order-modal.tsx) | name | ✅ | string | OK |
| | phone | ❌ | string | OK |
| | **email** | ❌ | string | ❌ **PROBLEM** |
| | address | ❌ | string | OK |
| Backend DTO (customers.controller.ts) | name | ✅ | string | OK |
| | phone | ❌ | string | OK |
| | **email** | ❌ | **KHÔNG CÓ** | ❌ |
| | address | ❌ | string | OK |
| Prisma Schema | name | ✅ | String | OK |
| | phone | ❌ | String? | OK |
| | **email** | ❌ | **KHÔNG CÓ** | ❌ |

**Nguyên nhân gốc:**
Frontend gửi field `email` nhưng:
1. Backend DTO không có `email` field
2. Prisma schema không có `email` field

### Files Changed

| File | Change |
|------|--------|
| `apps/web/components/create-order-modal.tsx` | Removed `email` from payload, state, and UI form |

**Before (lines 113-121):**
```javascript
body: {
  name: newCustomer.name,
  phone: newCustomer.phone || undefined,
  email: newCustomer.email || undefined,  // ❌ Removed
  address: newCustomer.address || undefined,
}
```

**After:**
```javascript
body: {
  name: newCustomer.name,
  phone: newCustomer.phone || undefined,
  address: newCustomer.address || undefined,
}
```

### Additional Backend Enhancement

**File:** `apps/api/src/customers/customers.service.ts`

Added proper error handling for Prisma unique constraint violations (P2002):

```typescript
if (error instanceof Prisma.PrismaClientKnownRequestError) {
  if (error.code === 'P2002') {
    const target = (error.meta?.target as string[]) || [];
    if (target.includes('phone')) {
      throw new BadRequestException('Số điện thoại đã tồn tại trong hệ thống');
    }
    // ... other cases
  }
}
```

---

## LỖI 2: EADDRINUSE :::4000

### Root Cause Analysis

**Nguyên nhân:**
Port 4000 bị chiếm bởi tiến trình trước đó chưa được tắt đúng cách:
1. User chạy `npm run dev` (hoặc `npm run dev:api`)
2. Server chạy thành công
3. User bấm Ctrl+C nhưng process không được kill hoàn toàn
4. User chạy lại command → EADDRINUSE

### Files Changed

| File | Change |
|------|--------|
| `apps/api/src/main.ts` | Added port availability check + auto-kill conflict process |

**Changes:**
1. Added `net` module import for port checking
2. Added `isPortInUse()` function to check if port is available
3. Added `killProcessOnPort()` function to auto-kill conflicting process
4. Added port check at bootstrap start

**Behavior After Fix:**
- When port is in use: auto-detect and kill the process
- If kill fails: show clear instructions to manually kill
- Prevent mysterious crashes with clear error messages

---

## Test Steps

### Test Lỗi 1: Create Customer

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orders/list` | Orders list page loads |
| 2 | Click "Tạo đơn hàng" | Modal opens |
| 3 | Select "Tạo khách hàng mới" | Sub-modal opens |
| 4 | Fill: Name="Test Customer", Phone="0123456789" | Fields filled |
| 5 | Click "Lưu" | 201 Created, modal closes, customer selected |
| 6 | Fill remaining fields, click "Tạo đơn hàng" | Order created successfully |

**Error Cases:**
| Case | Action | Expected |
|------|--------|----------|
| Missing name | Leave name empty, click Lưu | Show "Vui lòng nhập tên khách hàng" |
| Duplicate phone | Use existing phone number | Show "Số điện thoại đã tồn tại" (400, not 500) |

### Test LỖI 2: Port Conflict

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Terminal 1: `npm run dev:api` | API starts on port 4000 |
| 2 | Terminal 2: `npm run dev:api` | Process detected, auto-killed, server starts |
| 3 | Check logs | "Port 4000 is available" or "Successfully killed process" |

---

## Commands Reference

### Start Backend (Correct Way)

```bash
# Option 1: From root (runs both frontend + backend)
npm run dev

# Option 2: Backend only
npm run dev:api

# Option 3: Manual (from apps/api folder)
cd apps/api
npm run start:dev
```

### Stop Backend (Windows)

```bash
# Option 1: Use kill-port script (recommended)
npm run kill:port

# Option 2: Manual
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Force Kill All Node Processes

```bash
npm run kill:all
```

---

## Verification

- ✅ API builds successfully (`npm run build`)
- ✅ Frontend type-checks (`npx tsc --noEmit`)
- ✅ No new lint errors
- ✅ Customer creation payload matches backend DTO
- ✅ Error handling returns 400/409 instead of 500
- ✅ Port conflict handled gracefully with auto-recovery

