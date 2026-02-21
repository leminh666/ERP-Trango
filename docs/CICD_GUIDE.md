# CI/CD Pipeline — Hướng dẫn từng bước

File: `.github/workflows/deploy.yml`  
Trigger: Mỗi khi có `git push` vào nhánh `main`

---

## Tổng quan luồng

```
push → main
  │
  ├─ [GitHub Actions Runner]
  │     1. Checkout code (fetch-depth: 2)
  │     2. Detect schema changes
  │     3. Setup Node.js 20.9.0
  │     4. npm ci
  │     5. prisma generate
  │     6. npm run build
  │
  └─ [SSH vào Server]
        7. git pull origin main
        8. npm install
        9. prisma migrate deploy (chỉ khi schema thay đổi)
       10. prisma generate
       11. npm run build
       12. pm2 restart (api + web)
```

---

## Chi tiết từng bước

### Bước 1 — Checkout code
```yaml
uses: actions/checkout@v3
with:
  fetch-depth: 2
```
- Clone repo về runner.
- `fetch-depth: 2` lấy 2 commit gần nhất để bước tiếp theo có thể so sánh diff.

---

### Bước 2 — Detect schema changes
```yaml
id: schema_check
run: |
  if git diff --name-only HEAD~1 HEAD | grep -q "apps/api/prisma/schema.prisma"; then
    echo "changed=true" >> $GITHUB_OUTPUT
  else
    echo "changed=false" >> $GITHUB_OUTPUT
  fi
```
- So sánh danh sách file thay đổi giữa commit hiện tại (`HEAD`) và commit trước (`HEAD~1`).
- Nếu `schema.prisma` nằm trong danh sách → set output `changed=true`.
- Output này được dùng ở bước deploy trên server để quyết định có chạy migration không.

---

### Bước 3 — Setup Node.js
```yaml
uses: actions/setup-node@v3
with:
  node-version: "20.9.0"
```
- Cài Node.js đúng phiên bản trên runner trước khi chạy các lệnh build.

---

### Bước 4 — Install dependencies
```yaml
run: npm ci
```
- `npm ci` (clean install) — nhanh hơn `npm install`, đảm bảo cài đúng theo `package-lock.json`.

---

### Bước 5 — Prisma generate (runner)
```yaml
run: cd apps/api && npm run prisma:generate
```
- Generate Prisma Client từ `schema.prisma` để TypeScript có thể compile đúng type.

---

### Bước 6 — Build project
```yaml
run: npm run build
```
- Build toàn bộ monorepo (NestJS API + Next.js Web).
- Nếu build lỗi → pipeline dừng, không deploy lên server.

---

### Bước 7 — SSH vào server & git pull
```bash
cd /var/www/projects/ERP-Trango/
git pull origin main
npm install
```
- Kết nối SSH bằng secrets đã cấu hình.
- Pull code mới nhất về server.
- `npm install` cập nhật dependencies nếu có thay đổi `package.json`.

---

### Bước 8 — Prisma migrate deploy (có điều kiện)
```bash
if [ "${{ steps.schema_check.outputs.changed }}" = "true" ]; then
  npx prisma migrate deploy
fi
```
- **Chỉ chạy khi `schema.prisma` có thay đổi** (dựa vào output từ bước 2).
- `prisma migrate deploy` áp dụng các migration file trong `prisma/migrations/` lên DB production.
- Không tự tạo migration mới — chỉ apply những file đã có sẵn.
- Nếu không có thay đổi schema → bỏ qua, tiết kiệm thời gian và tránh rủi ro.

---

### Bước 9 — Prisma generate (server)
```bash
npm run prisma:generate
```
- Regenerate Prisma Client trên server sau khi migration xong.

---

### Bước 10 — Build & restart
```bash
npm run build
pm2 restart api-erp.trangohoanggia.com
pm2 restart erp.trangohoanggia.com
```
- Build lại trên server với code mới.
- PM2 restart cả 2 process: API (NestJS) và Web (Next.js).

---

## Secrets cần cấu hình trên GitHub

Vào `Settings → Secrets and variables → Actions` của repo, thêm:

| Secret | Mô tả |
|---|---|
| `SERVER_HOST` | IP hoặc domain của server |
| `SERVER_USER` | Username SSH (thường là `root`) |
| `SERVER_KEY` | Private key SSH (nội dung file `~/.ssh/id_rsa`) |
| `SERVER_PORT` | Port SSH (thường là `22`) |

---

## Lưu ý quan trọng

- Trước khi push schema mới, phải tạo migration file local bằng `prisma migrate dev --name <tên>` rồi commit file migration vào repo.
- `prisma migrate deploy` chỉ apply migration đã có — **không tự tạo migration**.
- Nếu là lần đầu deploy DB mới, cần chạy `prisma migrate deploy` thủ công trên server một lần.

