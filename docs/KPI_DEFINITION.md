# KPI Definition Document - Tran Go Hoang Gia ERP

> **Last Updated**: 2026-02-02
> **Status**: AUDIT IN PROGRESS

## 1. Data Model Overview

### 1.1 Core Tables

| Table | Description | Soft Delete |
|-------|-------------|-------------|
| `Wallet` | Ví/Ngân hàng tiền mặt | `deletedAt` |
| `Transaction` | Giao dịch tài chính (thu/chi/chuyển) | `deletedAt` |
| `WalletAdjustment` | Điều chỉnh số dư (mở ví, adjust) | `deletedAt` |
| `Project` | Đơn hàng/Dự án | `deletedAt` |
| `WorkshopJob` | Phiếu gia công | `deletedAt` |
| `OrderItem` | Hạng mục trong đơn hàng | `deletedAt` |

### 1.2 Transaction Type Enum

```typescript
enum TransactionType {
  INCOME = 'INCOME',    // Phiếu thu
  EXPENSE = 'EXPENSE',  // Phiếu chi
  TRANSFER = 'TRANSFER' // Chuyển tiền nội bộ
}
```

---

## 2. KPI Definitions (AUTHORITATIVE)

### 2.1 Wallet KPIs

**Scope**: All records associated with a specific `walletId`

| KPI | Formula | Included Records | Excluded Records |
|-----|---------|------------------|------------------|
| **Tổng thu (IncomeTotal)** | SUM(`amount`) of INCOME transactions | `type = INCOME`, `walletId = X`, `deletedAt = NULL` | EXPENSE, TRANSFER |
| **Tổng chi (ExpenseTotal)** | SUM(`amount`) of EXPENSE transactions | `type = EXPENSE`, `walletId = X`, `deletedAt = NULL` | INCOME, TRANSFER |
| **Điều chỉnh (AdjustmentsTotal)** | SUM(`amount`) of WalletAdjustment | `walletId = X`, `deletedAt = NULL` | ALL Transaction types |
| **Thuần (Net)** | `IncomeTotal - ExpenseTotal + AdjustmentsTotal` | See above | N/A |

#### Important Notes:
- **TRANSFER transactions are NOT included** in IncomeTotal/ExpenseTotal
- **TRANSFER affects wallet balance** but not the Income/Expense KPIs
- **Adjustments are included in Net** with their signed amount (positive increases, negative decreases)
- **Opening Balance** is stored as a WalletAdjustment with type implicit (amount > 0)

### 2.2 Order/Project KPIs

**Scope**: All transactions with `projectId = X`

| KPI | Formula | Included Records |
|-----|---------|------------------|
| **Tổng thu đơn** | SUM(`amount`) of INCOME with `projectId = X` | `type = INCOME`, `projectId = X`, `deletedAt = NULL` |
| **Tổng chi đơn** | SUM(`amount`) of EXPENSE with `projectId = X` | `type = EXPENSE`, `projectId = X`, `deletedAt = NULL` |
| **Lợi nhuận (Profit)** | `Tổng thu đơn - Tổng chi đơn` | See above |

#### Constraints:
- Expense records linked to order MUST have `projectId` set
- Expense records with `isCommonCost = true` MUST NOT have `projectId`
- When updating an expense with `projectId`, the `projectId` must be preserved

### 2.3 Workshop Job KPIs

**Scope**: All transactions with `workshopJobId = X`

| KPI | Formula | Source |
|-----|---------|--------|
| **Tổng tiền gia công** | `WorkshopJob.amount` | WorkshopJob record |
| **Đã thanh toán** | SUM(`amount`) of EXPENSE with `workshopJobId = X` | Transactions |
| **Còn nợ** | `Tổng tiền gia công - Đã thanh toán` | Calculated |

---

## 3. Relationship Mapping

### 3.1 Transaction Relations

```
Transaction
├── walletId (required) → Wallet
├── walletToId (optional) → Wallet (TRANSFER only)
├── incomeCategoryId (optional) → IncomeCategory (INCOME only)
├── expenseCategoryId (optional) → ExpenseCategory (EXPENSE only)
├── projectId (optional) → Project
├── workshopJobId (optional) → WorkshopJob
└── deletedAt (optional) → Soft delete timestamp
```

### 3.2 WalletAdjustment Relations

```
WalletAdjustment
├── walletId (required) → Wallet
└── deletedAt (optional) → Soft delete timestamp
```

---

## 4. Soft Delete Rules

### 4.1 Universal Rule
**ALL** records with `deletedAt != NULL` must be EXCLUDED from:
- KPI calculations
- List queries
- Summary endpoints
- Balance calculations

### 4.2 Filter Pattern
All queries MUST include:
```prisma
where: {
  deletedAt: null  // Explicit filter required
}
```

---

## 5. Date/Time Handling

### 5.1 Date Field Usage
- **Transaction**: Uses `date` field (transaction date)
- **WalletAdjustment**: Uses `date` field (adjustment date)
- **WorkshopJob**: Uses `createdAt`, `startDate`, `dueDate`

### 5.2 Timezone
- All dates stored in UTC
- Frontend displays in local timezone (Vietnam: UTC+7)
- Filtering uses date comparison without time component

---

## 6. Balance Calculation

### 6.1 Running Balance (balanceAfter)

For transfers and adjustments, `balanceAfter` is calculated as a running total:

```typescript
// Transfers (per wallet)
let balance = 0;
for (const tx of transactions) {
  if (tx.walletId === walletId) {
    balance -= Number(tx.amount);  // Outgoing
  } else {
    balance += Number(tx.amount);  // Incoming
  }
  tx.balanceAfter = balance;
}

// Adjustments
let balance = 0;
for (const adj of adjustments) {
  balance += Number(adj.amount);  // Signed amount
  adj.balanceAfter = balance;
}
```

### 6.2 Current Wallet Balance
```
CurrentBalance = SUM(INCOME) - SUM(EXPENSE) + SUM(Adjustments)
```
Note: TRANSFER transactions do not affect this calculation (they're internal movements).

---

## 7. Source of Truth (Single Truth)

| Metric | Source of Truth | Endpoint |
|--------|-----------------|----------|
| Wallet Income Total | `GET /wallets/:id/usage/summary` | `WalletsService.getUsageSummary()` |
| Wallet Expense Total | `GET /wallets/:id/usage/summary` | `WalletsService.getUsageSummary()` |
| Wallet Adjustments | `GET /wallets/:id/adjustments` | `WalletsService.getAdjustments()` |
| Wallet Transfers | `GET /wallets/:id/transfers` | `WalletsService.getTransfers()` |
| Order Finance | `GET /projects/:id/summary` | `ProjectsService.getSummary()` |
| WorkshopJob Payments | `GET /workshop-jobs/:id/payments` | WorkshopJobService |

**RULE**: Frontend MUST NOT calculate KPIs by summing local state. All KPIs must come from backend endpoints.

---

## 8. Known Issues & Fixes

### 8.1 Fixed Issues
- ✅ `getUsageSummary()` recentTransactions missing `deletedAt` filter → **FIXED**
- ✅ `getAdjustments()` properly filters `deletedAt` → OK
- ✅ `getTransfers()` properly filters `deletedAt` → OK

### 8.2 Known Risks
- ⚠️ Some list queries may not consistently apply `deletedAt` filter
- ⚠️ Frontend may calculate KPIs locally in some places (being migrated to use backend endpoints)

---

## 9. Reconciliation Tool

Use the internal tool at `scripts/reconciliation.js` to verify:

```bash
node scripts/reconciliation.js --walletId=<id> --from=<date> --to=<date>
```

This will output:
- IncomeTotal by source
- ExpenseTotal by source
- AdjustmentsTotal
- Net calculation
- List of all record IDs included
- Warnings for orphan records

---

## 10. Test Cases (Jest)

### 10.1 Wallet Tests
```typescript
describe('Wallet KPI Calculations', () => {
  it('Opening +10.000.000 => net +10.000.000', async () => {
    // Create wallet with opening balance
    // Verify net = 10.000.000
  });
  
  it('Thu +2.000.000, Chi 500.000 => net = opening + 1.500.000', async () => {
    // Create income + expense
    // Verify net calculation
  });
  
  it('Transfer 1.000.000 => income/expense unchanged, balance changes', async () => {
    // Create transfer
    // Verify incomeTotal/expenseTotal unchanged
    // Verify wallet balances updated
  });
  
  it('Adjustment -200.000 => net decreases 200.000', async () => {
    // Create negative adjustment
    // Verify net = previous - 200.000
  });
});
```

### 10.2 Soft Delete Tests
```typescript
it('Deleted record not included in KPI', async () => {
  // Create transaction
  // Verify it's in KPI
  // Soft delete it
  // Verify it's NOT in KPI
});
```

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | System Audit | Initial definition |


