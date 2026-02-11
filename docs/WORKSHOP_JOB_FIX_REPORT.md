# WORKSHOP_JOB_FIX_REPORT.md

## 1. ENDPOINT MAPPING

### Backend Routes (workshop-jobs)

| Method | Route | Controller Method | Auth | Body/Query |
|--------|-------|-------------------|------|------------|
| GET | `/workshop-jobs` | `findAll()` | JWT | `?from=&to=&search=&status=&workshopId=&projectId=&includeDeleted` |
| GET | `/workshop-jobs/summary` | `summary()` | JWT | `?from=&to=&status=&workshopId=&projectId` |
| GET | `/workshop-jobs/:id` | `findOne()` | JWT | - |
| POST | `/workshop-jobs` | `create()` | **ADMIN** | `{projectId, workshopId, title?, description?, amount (>0), status?, startDate?, dueDate?, note?}` |
| PUT | `/workshop-jobs/:id` | `update()` | ADMIN | Partial<CreateDto> |
| DELETE | `/workshop-jobs/:id` | `delete()` | ADMIN | - |
| POST | `/workshop-jobs/:id/restore` | `restore()` | ADMIN | - |
| POST | `/workshop-jobs/:id/pay` | `pay()` | ADMIN | `{date, amount, walletId, expenseCategoryId, note?}` |
| GET | `/workshop-jobs/:id/payments` | `getPayments()` | JWT | - |

---

## 2. FRONTEND API CALLS - BEFORE & AFTER

### File: `apps/web/components/workshop-jobs-summary.tsx`

**BEFORE (WRONG):**
```javascript
const res = await fetch(`/api/workshop-jobs?projectId=${projectId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await res.json();
```

**AFTER (FIXED):**
```javascript
import { apiClient } from '@/lib/api';
const data = await apiClient<any[]>(`/workshop-jobs?projectId=${projectId}`);
```

**Root Cause:** Using `/api/workshop-jobs` (Next.js API route) instead of `/workshop-jobs` (direct to backend port 4000)

---

### File: `apps/web/app/(authenticated)/orders/[id]/page.tsx`

**CREATE WORKSHOP JOB - BEFORE:**
```javascript
await apiClient('/workshop-jobs', {
  method: 'POST',
  body: JSON.stringify({
    projectId: id,
    workshopId: workshopJobForm.workshopId,
    amount: parseFloat(workshopJobForm.amount),
    title: workshopJobForm.title,
    description: workshopJobForm.note,  // ❌ WRONG FIELD
    note: workshopJobForm.note,
  }),
});
alert('Tạo phiếu gia công thành công!');
```

**CREATE WORKSHOP JOB - AFTER:**
```javascript
await apiClient('/workshop-jobs', {
  method: 'POST',
  body: {
    projectId: id,
    workshopId: workshopJobForm.workshopId,
    amount: parseFloat(workshopJobForm.amount),
    title: workshopJobForm.title || undefined,
    note: workshopJobForm.note || undefined,
  },
});
showSuccess('Thành công', 'Đã tạo phiếu gia công thành công!');
```

**Changes:**
1. Removed wrong `description` field
2. Changed `alert()` to `toast` system
3. Used object instead of JSON.stringify (apiClient handles serialization)

---

## 3. FILES MODIFIED

| File | Change |
|------|--------|
| `apps/web/components/workshop-jobs-summary.tsx` | Fixed API path: `/api/workshop-jobs` → `/workshop-jobs`, use apiClient |
| `apps/web/app/(authenticated)/orders/[id]/page.tsx` | Fixed payload, added toast import and usage |
| `docs/WORKSHOP_JOB_FIX_REPORT.md` | This file |

---

## 4. VERIFICATION RESULTS

| Check | Result |
|-------|--------|
| Backend Build | ✅ Pass |
| Frontend Type Check | ✅ Pass |

---

## 5. TEST CHECKLIST

### 5.1. Backend
- [ ] Start API: `cd apps/api && npm run start:dev`
- [ ] Check no EADDRINUSE error
- [ ] Swagger docs: http://localhost:4000/docs

### 5.2. Frontend  
- [ ] Start Frontend: `cd apps/web && npm run dev`
- [ ] Go to Order Detail: `/orders/[id]`
- [ ] Tab "Sản xuất" shows workshop jobs (if any)

### 5.3. Create Workshop Job
- [ ] Click "+ Tạo phiếu gia công" in Production tab
- [ ] Modal opens
- [ ] Select workshop (dropdown)
- [ ] Enter amount (> 0)
- [ ] Enter title (optional)
- [ ] Enter note (optional)
- [ ] Click "Tạo phiếu gia công"
- [ ] Toast shows success message
- [ ] Redirect to workshop job detail page

### 5.4. Verify in Workshop Jobs List
- [ ] Go to `/workshops/jobs`
- [ ] New job appears in list
- [ ] Data matches what was created

### 5.5. Verify Order Detail Workshop Jobs
- [ ] Go back to order detail
- [ ] Tab "Sản xuất" shows the newly created job
- [ ] No more "Có lỗi xảy ra" error

---

## 6. KNOWN ISSUES (NOT IN SCOPE)

1. **ADMIN Role Required**: Backend requires ADMIN role to create workshop jobs. If non-admin users need to create jobs, the backend check needs to be modified.

2. **Modal UI Order**: The modal fields are not in the exact required order as specified (need to be reorganized).

3. **Items/Products in Workshop Job**: The current backend doesn't support items in workshop jobs. This would require significant backend changes.

4. **Workshop Creation in Modal**: The "+ Tạo xưởng mới" option in workshop dropdown is not yet implemented.

5. **Date-only Deadline**: The deadline field in workshop modal shows datetime, not date-only.

---

## 7. PORT 4000 EADDRINUSE FIX

If you encounter EADDRINUSE error when starting the backend:

**Windows:**
```powershell
# Check which process uses port 4000
netstat -ano | findstr :4000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or kill all node processes
taskkill /F /IM node.exe
```

**Then restart:**
```powershell
cd apps/api
npm run start:dev
```
