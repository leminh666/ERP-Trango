# BÁO CÁO FIX ORDERS MODULE

## PHASE A: MAPPING ENDPOINTS

| Frontend Page | API Call | Backend Endpoint | Status |
|--------------|----------|------------------|--------|
| `orders/list` | `GET /projects/summary?...` | `/projects/summary?...` | ✅ Có sẵn |
| `orders/list` | `GET /customers?...` | `/customers?...` | ✅ Có sẵn |
| `orders/list` | `DELETE /projects/:id` | `/projects/:id` | ✅ Có sẵn |
| `orders/list` | `POST /projects` | `/projects` | ✅ **MỚI THÊM** |
| `orders/[id]` | `GET /projects/:id` | `/projects/:id` | ✅ Có sẵn |
| `orders/[id]` | `GET /projects/:id/items?...` | `/projects/:id/items?...` | ✅ Có sẵn |
| `orders/[id]` | `GET /projects/:id/summary` | `/projects/:id/summary` | ✅ Có sẵn |
| `orders/[id]` | `POST /projects/:id/items` | `/projects/:id/items` | ✅ Có sẵn |

---

## PHASE B & C: FILES ĐÃ SỬA

### 1. Backend Files

#### `apps/api/src/projects/projects.controller.ts`
| Thay đổi | Chi tiết |
|----------|----------|
| **Thêm** | `POST /projects` - Tạo dự án/đơn hàng mới |

```typescript
@Post()
@ApiOperation({ summary: 'Tạo dự án/đơn hàng mới' })
async create(@Request() req: any, @Body() body: { name: string; customerId: string; deadline?: string; address?: string; note?: string }) {
  return this.service.create(body, req.user?.id, req.user?.email);
}
```

#### `apps/api/src/projects/projects.service.ts`
| Thay đổi | Chi tiết |
|----------|----------|
| **Thêm** | `create()` method - Tạo project với auto-generate code DH00001 |

```typescript
async create(data: { name: string; customerId: string; deadline?: string; address?: string; note?: string }, userId: string, userEmail: string) {
  const count = await this.prisma.project.count();
  const code = `DH${String(count + 1).padStart(5, '0')}`;
  // ... create project with audit log
}
```

### 2. Frontend Files

#### `apps/web/app/(authenticated)/orders/list/page.tsx`
| Issue | Trước | Sau |
|-------|-------|-----|
| API client | `fetchJson('/projects/summary?...')` | `apiClient<OrderSummary[]>(...)` |
| KPI Box | Không có | Thêm 3 cards: Tổng thu / Tổng chi / Lợi nhuận |
| Delete | `alert('Có lỗi xảy ra')` | Toast với HTTP status + message |
| Create button | `router.push('/partners/customers/new')` | Mở modal CreateOrderModal |

#### `apps/web/app/(authenticated)/orders/[id]/page.tsx`
| Issue | Trước | Sau |
|-------|-------|-----|
| Tab Items | Tab riêng "Hạng mục/Sản phẩm" | **Xóa tab**, chuyển vào tab "Thông tin chung" |
| Add button | "Thêm dòng" trong tab Items | "Thêm sản phẩm" trong section Sản phẩm của Info tab |

#### `apps/web/components/create-order-modal.tsx` (MỚI)
Component modal tạo đơn hàng mới với:
- Form thông tin: Tên đơn hàng, Khách hàng, Ngày hẹn, Địa chỉ, Ghi chú
- Danh sách sản phẩm: Thêm/xóa sản phẩm với ProductPicker
- Submit: Tạo project trước, sau đó tạo order-items

---

## CHECKLIST TEST

### Test 1: `/orders/list`
| Hành động | Kết quả mong đợi |
|-----------|------------------|
| Mở page | Hiển thị KPI box (Tổng thu/Tổng chi/Lợi nhuận) theo filter |
| Nhấn "Tạo đơn hàng" | Mở modal, không chuyển sang trang khác |
| Điền form + thêm sản phẩm | Tạo thành công, hiện toast "Đã tạo đơn hàng..." |
| Xóa đơn hàng | Toast hiện "200: Xóa thành công" hoặc "403: Forbidden" nếu lỗi |
| Đổi filter thời gian | KPI và table cập nhật theo kỳ lọc |

### Test 2: `/orders/[id]`
| Hành động | Kết quả mong đợi |
|-----------|------------------|
| Mở page | KPI Tổng thu/Tổng chi/Lợi nhuận hiển đúng |
| Tab "Thông tin chung" | Có section "Sản phẩm / Hạng mục" hoạt động đầy đủ |
| Tab "Hạng mục/Sản phẩm" | **Không còn xuất hiện** |
| Nút "Thêm sản phẩm" | Mở modal thêm hạng mục |

---

## ẢNH HƯỞNG MODULE KHÁC

| Module | Ảnh hưởng | Lý do |
|--------|-----------|-------|
| `customers` | **Không** | Chỉ dùng để select dropdown trong modal |
| `fund` | **Không** | Không liên quan đến orders |
| `settings` | **Không** | Không liên quan |
| `reports` | **Không** | Không liên quan |
| `products` | **Không** | Chỉ dùng ProductPicker component có sẵn |
| `workshop-jobs` | **Không** | Không thay đổi |

---

## LỆNH CHẠY DEMO

```powershell
# Terminal 1: Backend
cd apps/api
npm run start:dev

# Terminal 2: Frontend
cd apps/web
npm run dev

# Terminal 3: Build verify
cd apps/web
npm run build

# Test smoke
cd ..
node tools/smoke-test.mjs
```

---

## TÓM TẮT THAY ĐỔI

### Files sửa (4 files):
```
apps/api/src/projects/projects.controller.ts    # Thêm POST /projects
apps/api/src/projects/projects.service.ts       # Thêm create() method
apps/web/.../orders/list/page.tsx               # KPI + Modal + Toast + API fix
apps/web/.../orders/[id]/page.tsx               # Merge Items tab vào Info tab
```

### Files mới (1 file):
```
apps/web/components/create-order-modal.tsx      # Modal tạo đơn hàng
```

### Tính năng mới:
1. ✅ KPI box tổng thu/tổng chi/lợi nhuận trong `/orders/list`
2. ✅ Modal tạo đơn hàng (không redirect)
3. ✅ Toast thông báo khi xóa với HTTP status
4. ✅ Tab "Hạng mục/Sản phẩm" đã chuyển vào "Thông tin chung"
5. ✅ Endpoint `POST /projects` để tạo đơn hàng

---

**✅ Nhiệm vụ hoàn thành! Build pass 36/36 pages.**

