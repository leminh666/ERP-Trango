import { apiClient } from './api';

/**
 * Global Financial Data Refresh Helper
 * 
 * This module provides a centralized mechanism for refreshing financial data across the entire system.
 * Use this after any mutation (create/update/delete) to ensure KPIs and lists update immediately.
 */

// Refresh all wallet-related data
export async function refreshWalletData(walletId: string) {
  await Promise.all([
    // Wallet details
    apiClient(`/wallets/${walletId}`),
    // Wallet summary/KPIs
    apiClient(`/wallets/${walletId}/usage/summary`),
    // Wallet adjustments
    apiClient(`/wallets/${walletId}/adjustments`),
    // Wallet transfers
    apiClient(`/wallets/${walletId}/transfers`),
    // Wallet income transactions
    apiClient(`/transactions?walletId=${walletId}&type=INCOME`),
    // Wallet expense transactions
    apiClient(`/transactions?walletId=${walletId}&type=EXPENSE`),
  ]);
}

// Refresh order finance data (thu/chi + KPIs)
export async function refreshOrderFinance(orderId: string) {
  await Promise.all([
    // Order transactions (thu + chi)
    apiClient(`/transactions?projectId=${orderId}`),
    // Order summary
    apiClient(`/projects/${orderId}/summary`),
  ]);
}

// Refresh workshop job payments data
export async function refreshWorkshopJobPayments(workshopJobId: string) {
  await Promise.all([
    // Workshop job details
    apiClient(`/workshop-jobs/${workshopJobId}`),
    // Workshop job payments/expenses
    apiClient(`/workshop-jobs/${workshopJobId}/payments`),
    // Workshop job summary
    apiClient(`/workshop-jobs/${workshopJobId}/summary`),
  ]);
}

// Refresh cashbook lists (income/expense)
export async function refreshCashbookList(type: 'INCOME' | 'EXPENSE', filters?: {
  walletId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  params.append('type', type);
  if (filters?.walletId) params.append('walletId', filters.walletId);
  if (filters?.categoryId) params.append(type === 'INCOME' ? 'incomeCategoryId' : 'expenseCategoryId', filters.categoryId);
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);
  
  await apiClient(`/transactions?${params.toString()}`);
}

// Comprehensive refresh after any financial mutation
// Call this after create/update/delete of: income, expense, transfer, adjustment, payment
export async function refreshAfterFinancialMutation(params: {
  walletId?: string;
  orderId?: string;
  workshopJobId?: string;
  transactionId?: string;
  transactionType?: 'INCOME' | 'EXPENSE';
  transactionWalletId?: string;
}) {
  const promises: Promise<any>[] = [];

  // Always refresh the transaction list for the affected wallet/type if we know it
  if (params.transactionWalletId && params.transactionType) {
    promises.push(
      apiClient(`/transactions?walletId=${params.transactionWalletId}&type=${params.transactionType}`)
    );
  } else if (params.transactionId) {
    // If we have transaction ID but not walletId/type, fetch the transaction first
    // This is a fallback - ideally pass walletId and type directly
    promises.push(
      apiClient(`/transactions/${params.transactionId}`).catch(() => null)
    );
  }

  // Refresh related data
  if (params.walletId) {
    promises.push(refreshWalletData(params.walletId));
  }

  if (params.orderId) {
    promises.push(refreshOrderFinance(params.orderId));
  }

  if (params.workshopJobId) {
    promises.push(refreshWorkshopJobPayments(params.workshopJobId));
  }

  // Wait for all refreshes to complete
  await Promise.allSettled(promises);
}

