# API Mapping - Frontend to Backend

This document maps frontend API calls to backend endpoints.

## Frontend → Backend Mapping

| Page/Component | Frontend Call | Backend Endpoint | Status |
|----------------|---------------|------------------|--------|
| **Auth** |
| Login page | `apiClient('/auth/login')` | POST /auth/login | ✅ Fixed |
| Forgot password | `apiClient('/auth/forgot-password')` | POST /auth/forgot-password | ✅ Fixed |
| Reset password | `apiClient('/auth/reset-password')` | POST /auth/reset-password | ✅ Fixed |
| AuthContext | `fetchJson('/settings')` | GET /settings | ✅ Fixed |
| **Users** |
| Settings/Users list | `apiClient('/users')` | GET /users | ✅ Fixed |
| Settings/Users create | `apiClient('/users', { method: 'POST' })` | POST /users | ✅ Fixed |
| Settings/Users update | `apiClient('/users/:id', { method: 'PUT' })` | PUT /users/:id | ✅ Fixed |
| Settings/Users delete | `apiClient('/users/:id', { method: 'DELETE' })` | DELETE /users/:id | ✅ Fixed |
| Settings/Users restore | `apiClient('/users/:id/restore', { method: 'POST' })` | POST /users/:id/restore | ✅ Fixed |
| Settings/Users reset password | `apiClient('/users/:id/reset-password', { method: 'POST' })` | POST /users/:id/reset-password | ✅ Fixed |
| Settings/Users permissions | `apiClient('/users/:id/permissions', { method: 'PUT' })` | PUT /users/:id/permissions | ✅ Fixed |
| **Wallets** |
| Fund/Wallets list | `apiClient('/wallets')` | GET /wallets | ✅ Fixed |
| Fund/Wallets create | `apiClient('/wallets', { method: 'POST' })` | POST /wallets | ✅ Fixed |
| Fund/Wallets update | `apiClient('/wallets/:id', { method: 'PUT' })` | PUT /wallets/:id | ✅ Fixed |
| Fund/Wallets delete | `apiClient('/wallets/:id', { method: 'DELETE' })` | DELETE /wallets/:id | ✅ Fixed |
| Fund/Wallets restore | `apiClient('/wallets/:id/restore', { method: 'POST' })` | POST /wallets/:id/restore | ✅ Fixed |
| **Income Categories** |
| Catalog/Income list | `apiClient('/income-categories')` | GET /income-categories | ✅ Fixed |
| Catalog/Income create | `apiClient('/income-categories', { method: 'POST' })` | POST /income-categories | ✅ Fixed |
| Catalog/Income update | `apiClient('/income-categories/:id', { method: 'PUT' })` | PUT /income-categories/:id | ✅ Fixed |
| Catalog/Income delete | `apiClient('/income-categories/:id', { method: 'DELETE' })` | DELETE /income-categories/:id | ✅ Fixed |
| Catalog/Income restore | `apiClient('/income-categories/:id/restore', { method: 'POST' })` | POST /income-categories/:id/restore | ✅ Fixed |
| Catalog/Income detail usage | `apiClient('/income-categories/:id/usage')` | GET /income-categories/:id/usage | ✅ Fixed |
| **Expense Categories** |
| Catalog/Expense list | `apiClient('/expense-categories')` | GET /expense-categories | ✅ Fixed |
| Catalog/Expense create | `apiClient('/expense-categories', { method: 'POST' })` | POST /expense-categories | ✅ Fixed |
| Catalog/Expense update | `apiClient('/expense-categories/:id', { method: 'PUT' })` | PUT /expense-categories/:id | ✅ Fixed |
| Catalog/Expense delete | `apiClient('/expense-categories/:id', { method: 'DELETE' })` | DELETE /expense-categories/:id | ✅ Fixed |
| Catalog/Expense restore | `apiClient('/expense-categories/:id/restore', { method: 'POST' })` | POST /expense-categories/:id/restore | ✅ Fixed |
| Catalog/Expense detail usage | `apiClient('/expense-categories/:id/usage')` | GET /expense-categories/:id/usage | ✅ Fixed |
| **Workshop Jobs** |
| Workshops/Jobs list | `apiClient('/workshop-jobs')` | GET /workshop-jobs | ✅ Fixed |
| Workshops/Jobs summary | `apiClient('/workshop-jobs/summary')` | GET /workshop-jobs/summary | ✅ Fixed |
| Workshops/Jobs detail | `apiClient('/workshop-jobs/:id/payments')` | GET /workshop-jobs/:id/payments | ✅ Fixed |
| Workshops/Jobs pay | `apiClient('/workshop-jobs/:id/pay', { method: 'POST' })` | POST /workshop-jobs/:id/pay | ✅ Fixed |
| **Orders Pipeline** |
| Pipeline customers | `apiClient('/customers')` | GET /customers | ✅ Fixed |
| Pipeline kanban | `apiClient('/projects/kanban')` | GET /projects/kanban | ✅ Fixed |
| Pipeline update stage | `apiClient('/projects/:id/stage', { method: 'POST' })` | POST /projects/:id/stage | ✅ Fixed |
| **Reports** |
| Income report | `apiClient('/reports/income-summary')` | GET /reports/income-summary | ✅ Fixed |
| **Audit Logs** |
| Settings/Audit list | `apiClient('/audit-logs')` | GET /audit-logs | ✅ Fixed |
| Settings/Audit detail | `apiClient('/audit-logs/:id')` | GET /audit-logs/:id | ✅ Fixed |

## File Upload

| Page/Component | Frontend Call | Backend Endpoint | Status |
|----------------|---------------|------------------|--------|
| Settings/Users avatar | `uploadFile('/files/upload', file)` | POST /files/upload | ✅ Fixed |
| Wallets logo | `uploadFile('/files/upload', file)` | POST /files/upload | ✅ Fixed |

## Rules

### ✅ CORRECT Usage
```typescript
import { apiClient, uploadFile } from '@/lib/api';

// GET request
const data = await apiClient<User[]>('/users');

// POST request
await apiClient('/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'John' }),
});

// File upload
const result = await uploadFile('/files/upload', file);
```

### ❌ WRONG Usage (DO NOT USE)
```typescript
// ❌ Do NOT use /api prefix
fetch('/api/users')

// ❌ Do NOT use direct fetch
fetch('http://localhost:4000/users')

// ❌ Do NOT manually set Authorization header
fetch('/users', { headers: { Authorization: `Bearer ${token}` } })
```

## Backend Routes Without /api Prefix

All backend routes are served directly at the root:
- `GET /users` (not `/api/users`)
- `GET /wallets` (not `/api/wallets`)
- `GET /income-categories` (not `/api/income-categories`)
- etc.

## Generated At
${new Date().toISOString()}

