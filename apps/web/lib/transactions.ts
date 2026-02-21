/**
 * Transaction Payload Builder Helper
 * Ensures consistent Prisma nested format for all transaction create/update operations
 */

// Income payload for POST (create)
export interface IncomeCreateInput {
  type: 'INCOME';
  date: string;
  amount: number | string;
  walletId: string;
  incomeCategoryId: string;
  projectId?: string | null;
  note?: string;
  isCommonCost?: false;
}

// Expense payload for POST (create)
export interface ExpenseCreateInput {
  type: 'EXPENSE';
  date: string;
  amount: number | string;
  walletId: string;
  expenseCategoryId?: string; // Optional for ads
  projectId?: string | null;
  note?: string;
  isCommonCost: boolean;
  isAds?: boolean;
  adsPlatform?: string;
}

// Income payload for PUT (update)
export interface IncomeUpdateInput {
  type?: 'INCOME';
  date?: string;
  amount?: number | string;
  walletId?: string;
  incomeCategoryId?: string;
  projectId?: string | null;
  note?: string;
  isCommonCost?: false;
}

// Expense payload for PUT (update)
export interface ExpenseUpdateInput {
  type?: 'EXPENSE';
  date?: string;
  amount?: number | string;
  walletId?: string;
  expenseCategoryId?: string;
  projectId?: string | null;
  note?: string;
  isCommonCost?: boolean;
  isAds?: boolean;
  adsPlatform?: string;
}

/**
 * Build Prisma nested payload for INCOME create operation
 */
export function buildIncomeCreatePayload(input: IncomeCreateInput) {
  return {
    type: 'INCOME',
    date: input.date,
    amount: typeof input.amount === 'string' ? parseFloat(input.amount) : input.amount,
    wallet: { connect: { id: input.walletId } },
    incomeCategory: { connect: { id: input.incomeCategoryId } },
    note: input.note || null,
    project: input.projectId ? { connect: { id: input.projectId } } : undefined,
    isCommonCost: false,
  };
}

/**
 * Build Prisma nested payload for EXPENSE create operation
 */
export function buildExpenseCreatePayload(input: ExpenseCreateInput) {
  return {
    type: 'EXPENSE',
    date: input.date,
    amount: typeof input.amount === 'string' ? parseFloat(input.amount) : input.amount,
    wallet: { connect: { id: input.walletId } },
    expenseCategory: input.expenseCategoryId ? { connect: { id: input.expenseCategoryId } } : undefined,
    note: input.note || null,
    project: input.projectId && !input.isCommonCost ? { connect: { id: input.projectId } } : undefined,
    isCommonCost: input.isCommonCost === true,
    isAds: input.isAds === true,
    adsPlatform: input.adsPlatform || null,
  };
}

/**
 * Build Prisma nested payload for INCOME update operation
 */
export function buildIncomeUpdatePayload(input: IncomeUpdateInput) {
  const payload: any = {
    type: 'INCOME',
    note: input.note || null,
    isCommonCost: false,
  };

  if (input.date) {
    const d = input.date.includes('T') ? input.date : `${input.date}T00:00:00.000Z`;
    payload.date = d;
  }
  if (input.amount !== undefined) payload.amount = typeof input.amount === 'string' ? parseFloat(input.amount) : input.amount;
  if (input.walletId) payload.wallet = { connect: { id: input.walletId } };
  if (input.incomeCategoryId) payload.incomeCategory = { connect: { id: input.incomeCategoryId } };
  if (input.projectId) payload.project = { connect: { id: input.projectId } };
  else if (input.projectId === null || input.projectId === '') payload.project = { disconnect: true };

  return payload;
}

/**
 * Build Prisma nested payload for EXPENSE update operation
 */
export function buildExpenseUpdatePayload(input: ExpenseUpdateInput) {
  const payload: any = {
    note: input.note || null,
  };

  if (input.type) payload.type = input.type;
  if (input.date) {
    // Always send full ISO string to avoid Prisma "premature end of input" error
    const d = input.date.includes('T') ? input.date : `${input.date}T00:00:00.000Z`;
    payload.date = d;
  }
  if (input.amount !== undefined) payload.amount = typeof input.amount === 'string' ? parseFloat(input.amount) : input.amount;
  if (input.walletId) payload.wallet = { connect: { id: input.walletId } };
  if (input.expenseCategoryId) payload.expenseCategory = { connect: { id: input.expenseCategoryId } };
  else if (input.expenseCategoryId === null || input.expenseCategoryId === '') payload.expenseCategory = { disconnect: true };
  if (input.projectId) payload.project = { connect: { id: input.projectId } };
  else if (input.projectId === null || input.projectId === '') payload.project = { disconnect: true };
  if (input.isCommonCost !== undefined) payload.isCommonCost = input.isCommonCost;
  if (input.isAds !== undefined) payload.isAds = input.isAds;
  if (input.adsPlatform !== undefined) payload.adsPlatform = input.adsPlatform || null;

  return payload;
}

