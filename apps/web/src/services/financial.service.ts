// =============================================================================
// Financial Service - Cashbook, Wallets, and Fund API calls
// =============================================================================
//
// All financial-related API calls should be made through this service.
//
// USAGE:
//   import { financialService } from '@/services/financial.service';
//
//   // Get all wallets
//   const wallets = await financialService.getWallets();
//
// =============================================================================

import { apiClient, get, post, put, patch, del } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type WalletType = 'cash' | 'bank' | 'mobile_money' | 'other';

export interface Transaction {
  id: string;
  walletId: string;
  walletName?: string;
  type: TransactionType;
  categoryId?: string;
  categoryName?: string;
  amount: number;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  transactionDate: string;
  createdAt?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'adjustment';

export interface TransactionCreate {
  walletId: string;
  type: TransactionType;
  categoryId?: string;
  amount: number;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  transactionDate?: string;
}

export interface TransactionUpdate extends Partial<TransactionCreate> {
  id: string;
}

export interface TransferCreate {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  description?: string;
  transactionDate?: string;
}

export interface AdjustmentCreate {
  walletId: string;
  type: 'increase' | 'decrease';
  amount: number;
  reason: string;
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  walletId?: string;
  type?: TransactionType;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CashflowSummary {
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  walletBalances: { walletId: string; name: string; balance: number }[];
}

export interface WalletBalance {
  walletId: string;
  walletName: string;
  balance: number;
}

// =============================================================================
// API Endpoints
// =============================================================================

const ENDPOINTS = {
  // Wallets
  WALLETS: '/fund/wallets',
  WALLET_BY_ID: (id: string) => `/fund/wallets/${id}`,
  WALLET_BALANCES: '/fund/wallets/balances',

  // Transactions
  TRANSACTIONS: '/fund/transactions',
  TRANSACTION_BY_ID: (id: string) => `/fund/transactions/${id}`,
  TRANSACTIONS_INCOME: '/fund/transactions/income',
  TRANSACTIONS_EXPENSE: '/fund/transactions/expense',

  // Cashflow
  CASHFLOW: '/fund/cashflow',

  // Adjustments
  ADJUSTMENTS: '/fund/adjustments',
};

// =============================================================================
// Financial Service
// =============================================================================

export const financialService = {
  // ==================== Wallets ====================

  /**
   * Get all wallets
   */
  async getWallets(params?: { isActive?: boolean }): Promise<Wallet[]> {
    const query = params?.isActive !== undefined 
      ? `?isActive=${params.isActive}` 
      : '';
    return get<Wallet[]>(`${ENDPOINTS.WALLETS}${query}`);
  },

  /**
   * Get wallet by ID
   */
  async getWalletById(id: string): Promise<Wallet> {
    return get<Wallet>(ENDPOINTS.WALLET_BY_ID(id));
  },

  /**
   * Create new wallet
   */
  async createWallet(data: Omit<Wallet, 'id' | 'balance' | 'createdAt' | 'updatedAt'>): Promise<Wallet> {
    return post<Wallet>(ENDPOINTS.WALLETS, data);
  },

  /**
   * Update wallet
   */
  async updateWallet(id: string, data: Partial<Omit<Wallet, 'id' | 'balance'>>): Promise<Wallet> {
    return put<Wallet>(ENDPOINTS.WALLET_BY_ID(id), data);
  },

  /**
   * Delete wallet
   */
  async deleteWallet(id: string): Promise<void> {
    return del(ENDPOINTS.WALLET_BY_ID(id));
  },

  /**
   * Get all wallet balances
   */
  async getBalances(): Promise<WalletBalance[]> {
    return get<WalletBalance[]>(ENDPOINTS.WALLET_BALANCES);
  },

  // ==================== Transactions ====================

  /**
   * Get all transactions with filters
   */
  async getTransactions(params?: TransactionListParams): Promise<Transaction[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.walletId) query.set('walletId', params.walletId);
    if (params?.type) query.set('type', params.type);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    if (params?.minAmount) query.set('minAmount', String(params.minAmount));
    if (params?.maxAmount) query.set('maxAmount', String(params.maxAmount));

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.TRANSACTIONS}${queryString ? `?${queryString}` : ''}`;
    return get<Transaction[]>(endpoint);
  },

  /**
   * Get paginated transactions
   */
  async getTransactionsPaginated(params: TransactionListParams): Promise<PaginatedTransactions> {
    const query = new URLSearchParams();
    query.set('page', String(params.page || 1));
    query.set('limit', String(params.limit || 20));
    if (params.walletId) query.set('walletId', params.walletId);
    if (params.type) query.set('type', params.type);
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);

    const endpoint = `${ENDPOINTS.TRANSACTIONS}/paginated?${query.toString()}`;
    return get<PaginatedTransactions>(endpoint);
  },

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<Transaction> {
    return get<Transaction>(ENDPOINTS.TRANSACTION_BY_ID(id));
  },

  /**
   * Create new transaction
   */
  async createTransaction(data: TransactionCreate): Promise<Transaction> {
    return post<Transaction>(ENDPOINTS.TRANSACTIONS, data);
  },

  /**
   * Update transaction
   */
  async updateTransaction(id: string, data: Partial<TransactionCreate>): Promise<Transaction> {
    return put<Transaction>(ENDPOINTS.TRANSACTION_BY_ID(id), data);
  },

  /**
   * Delete transaction
   */
  async deleteTransaction(id: string): Promise<void> {
    return del(ENDPOINTS.TRANSACTION_BY_ID(id));
  },

  // ==================== Transfers ====================

  /**
   * Transfer between wallets
   */
  async transfer(data: TransferCreate): Promise<{ from: Transaction; to: Transaction }> {
    return post<{ from: Transaction; to: Transaction }>(`${ENDPOINTS.TRANSACTIONS}/transfer`, data);
  },

  // ==================== Adjustments ====================

  /**
   * Create wallet adjustment
   */
  async createAdjustment(data: AdjustmentCreate): Promise<Transaction> {
    return post<Transaction>(ENDPOINTS.ADJUSTMENTS, data);
  },

  // ==================== Cashflow & Reports ====================

  /**
   * Get cashflow summary
   */
  async getCashflowSummary(params?: { fromDate?: string; toDate?: string; walletId?: string }): Promise<CashflowSummary> {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    if (params?.walletId) query.set('walletId', params.walletId);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.CASHFLOW}/summary${queryString ? `?${queryString}` : ''}`;
    return get<CashflowSummary>(endpoint);
  },

  /**
   * Get cashflow report
   */
  async getCashflowReport(params?: { fromDate?: string; toDate?: string; walletId?: string; groupBy?: 'day' | 'week' | 'month' }): Promise<Record<string, CashflowSummary>> {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    if (params?.walletId) query.set('walletId', params.walletId);
    if (params?.groupBy) query.set('groupBy', params.groupBy);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.CASHFLOW}/report${queryString ? `?${queryString}` : ''}`;
    return get<Record<string, CashflowSummary>>(endpoint);
  },
};

// =============================================================================
// Exports
// =============================================================================

// Types already exported above as interfaces/types — no re-export needed

