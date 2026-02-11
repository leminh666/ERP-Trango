# ORDERS_FIX_REPORT_PHASE2.md

## 1. MAPPING ENDPOINTS & FRONTEND CALLS

### Backend Routes (Projects Module)

| Method | Route | Controller Method | Status |
|--------|-------|-------------------|--------|
| GET | `/projects` | `findAll()` | ✅ OK |
| GET | `/projects/summary` | `getSummary()` | ✅ OK |
| GET | `/projects/kanban` | `getKanban()` | ✅ OK |
| GET | `/projects/:id` | `findOne()` | ✅ OK |
| POST | `/projects` | `create()` | ✅ OK |
| POST | `/projects/:id/stage` | `updateStage()` | ✅ OK |
| **PUT** | `/projects/:id` | **`update()`** | ✅ **ADDED** |
| **DELETE** | `/projects/:id` | **`delete()`** | ✅ **ADDED** |

### Frontend API Calls (After Fix)

| File | API Call | Expected Endpoint | Status |
|------|----------|-------------------|--------|
| `orders/list/page.tsx:149` | `DELETE /projects/${id}` | `DELETE /projects/:id` | ✅ OK |
| `orders/list/page.tsx` | `PUT /projects/${id}` | `PUT /projects/:id` | ✅ OK |
| `orders/list/page.tsx` | Modal edit (no route) | EditOrderModal | ✅ OK |
| `orders/[id]/page.tsx` | `GET /projects/${id}` | `/projects/:id` | ✅ OK |

---

## 2. FILES CHANGED

### Backend (2 files)
- `apps/api/src/projects/projects.controller.ts` - Added `@Put(':id')` and `@Delete(':id')` endpoints
- `apps/api/src/projects/projects.service.ts` - Added `update()` and `delete()` methods

### Frontend (4 files)
- `apps/web/components/edit-order-modal.tsx` - **NEW** component for editing orders
- `apps/web/app/(authenticated)/orders/list/page.tsx` - Added Edit/Delete icons, EditOrderModal, reduced UI size
- `apps/web/app/(authenticated)/orders/[id]/page.tsx` - Removed header button, prefill workshop items, reduced UI size
- `docs/ORDERS_FIX_REPORT_PHASE2.md` - This file

---

## 3. CHANGES SUMMARY

### FIX 1: Delete order returns 500/404
**Root Cause**: Backend missing `@Delete(':id')` route
**Fix**: 
- Added `@Delete(':id')` endpoint in controller
- Added `delete()` method in service (soft-delete via `deletedAt`)
- Frontend now calls correct endpoint

### FIX 2: Edit button opens modal (not navigate)
**Root Cause**: `handleEditOrder()` used `router.push()`
**Fix**:
- Created `EditOrderModal` component (reuses form structure from CreateOrderModal)
- Changed `handleEditOrder()` to fetch full order data and open modal
- Added Edit icon button in each row

### UI FIX: Per-row icons (Eye/Edit/Delete)
**Before**: Only Eye icon in row, Sửa/Xóa buttons in header
**After**: 3 icons (Eye, Edit, Delete) in each row, header only has "Tạo đơn hàng"

### UI FIX: Remove "+ Phiếu gia công" from header
**Before**: Button in header AND in Production tab
**After**: Button only in Production tab (header removed)

### UI FIX: Reduce UI size
**Changes**: Smaller padding (p-4 vs pt-6), smaller icons (h-4/w-4 vs h-6/w-6), smaller fonts (text-lg vs text-xl)

### FEATURE: Workshop job prefill items
**Before**: No items in workshop job modal
**After**: 
- Opens modal → loads order items with qty=0 default
- User can edit qty for each item
- Can add/remove items
- Items with qty>0 are included in job

### PORT CONFLICT DOCUMENTATION
**Error**: `EADDRINUSE: address already in use :::4000`
**Windows Solution**:
```powershell
# Check which process uses port 4000
netstat -ano | findstr :4000
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
# Or kill all node processes
taskkill /F /IM node.exe
```

---

## 4. CHECKLIST TEST (PHẢI CHẠY)

### Backend
- [ ] Start: `cd apps/api && npm run start:dev`
- [ ] Check logs show: `Mapped {...} routes`

### Frontend  
- [ ] Start: `cd apps/web && npm run dev`
- [ ] Navigate to `/orders/list`

### Test 1: Orders list icons
- [ ] Each row has 3 icons: Eye (xem), Edit (sửa), Delete (xóa)
- [ ] Click Eye → go to order detail
- [ ] Click Edit → modal opens (not navigate)
- [ ] Click Delete → confirmation modal shows

### Test 2: Delete order
- [ ] Click Delete → confirm
- [ ] Toast: "Xóa thành công"
- [ ] Order removed from list (or hidden with soft-delete)

### Test 3: Edit order
- [ ] Click Edit → modal opens with current data
- [ ] Change name/address/deadline → Save
- [ ] Toast: "Đã cập nhật đơn hàng"
- [ ] List refreshes with new data

### Test 4: Order detail header
- [ ] Header no longer has "+ Phiếu gia công" button
- [ ] "Quay lại" button still works

### Test 5: Workshop job modal (Production tab)
- [ ] Click "+ Tạo phiếu gia công" in Production tab
- [ ] Modal opens with items preloaded (if order has items)
- [ ] Items show with qty=0 default
- [ ] Can edit qty, add/remove items
- [ ] Submit creates job with items that have qty>0

### Test 6: Other modules not affected
- [ ] Navigate to Customers, Products, Cashflow
- [ ] No new 404 errors

---

## 5. VERIFICATION

| Check | Result |
|-------|--------|
| Backend Build (`npm run build`) | ✅ Pass |
| Frontend Type Check (`npx tsc --noEmit`) | ✅ Pass |
| Lint Errors | ✅ None |
