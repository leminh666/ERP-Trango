'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { refreshAfterFinancialMutation } from '@/lib/financial-refresh';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Wallet, WalletType, VisualType } from '@tran-go-hoang-gia/shared';
import { ArrowLeft, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, FileText, Upload, RefreshCw, Eye, ArrowRightLeft, Settings, X } from 'lucide-react';
import { IconRenderer } from '@/components/icon-picker';
import { VisualRenderer, VisualSelector } from '@/components/visual-selector';
import { useToast } from '@/components/toast-provider';
import { MoneyInput } from '@/components/common/money-input';
import { MetricSectionTitle, MetricCardTitle, MetricInfo } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';

interface WalletCategorySummary {
  id: string | null;
  name: string;
  totalAmount: number;
  percent: number;
  visualType: VisualType;
  iconKey: string | null;
  imageUrl: string | null;
  color: string;
}

interface WalletTransactionSummary {
  id: string;
  type: string;
  date: string;
  amount: any;
  incomeCategoryName: string | null;
  expenseCategoryName: string | null;
  projectName: string | null;
  projectId: string | null;
  note: string | null;
}

// Interface for transaction list items (Phiếu thu/phiếu chi)
interface WalletTransactionItem {
  id: string;
  code: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  amount: number;
  categoryName: string | null;
  categoryId: string | null;
  note: string | null;
  projectId: string | null;
  projectName: string | null;
  walletId: string;
}

interface WalletUsageSummary {
  walletId: string;
  period: { from: string; to: string };
  incomeTotal: number;
  expenseTotal: number;
  adjustmentsTotal: number;
  net: number;
  incomeByCategory: WalletCategorySummary[];
  expenseByCategory: WalletCategorySummary[];
  recentTransactions: WalletTransactionSummary[];
}

interface AdjustmentRecord {
  id: string;
  walletId: string;
  date: Date;
  amount: number;
  note: string | null;
  createdAt: Date;
  balanceAfter: number;
}

interface TransferRecord {
  id: string;
  date: Date;
  amount: number;
  isOutgoing: boolean;
  counterpartyWalletName: string | null;
  note: string | null;
  balanceAfter: number;
  walletId: string;
  walletToId: string | null;
}

const typeLabels: Record<WalletType, string> = {
  CASH: 'Tiền mặt',
  BANK: 'Ngân hàng',
  OTHER: 'Khác',
};

const typeColors: Record<WalletType, string> = {
  CASH: 'bg-green-100 text-green-700',
  BANK: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const timeFilters = [
  { label: 'Tháng này', value: 'this_month' },
  { label: 'Tháng trước', value: 'last_month' },
  { label: 'Năm này', value: 'this_year' },
  { label: 'Năm trước', value: 'last_year' },
  { label: 'Tất cả', value: 'all' },
];

export default function WalletDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [summary, setSummary] = useState<WalletUsageSummary | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [incomes, setIncomes] = useState<WalletTransactionItem[]>([]);
  const [expenses, setExpenses] = useState<WalletTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIncomes, setLoadingIncomes] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [editingIncome, setEditingIncome] = useState<WalletTransactionItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<WalletTransactionItem | null>(null);
  const [editIncomeForm, setEditIncomeForm] = useState({ date: '', amount: 0, categoryId: '', note: '' });
  const [editExpenseForm, setEditExpenseForm] = useState({ date: '', amount: 0, categoryId: '', note: '' });
  const [showEditIncomeModal, setShowEditIncomeModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState('this_month');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: 'transaction' | 'adjustment' | 'transfer', id: string, label: string } | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<{
    id: string;
    type: string;
    amount: number;
    note: string;
    date: string;
  } | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<{
    id: string;
    amount: number;
    note: string;
    date: string;
    walletId: string;
    walletToId: string;
    isOutgoing: boolean;
  } | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<{
    id: string;
    amount: number;
    note: string;
    date: string;
  } | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    type: WalletType;
    visualType: VisualType;
    iconKey: string;
    imageUrl: string;
    note: string;
  }>({
    name: '',
    type: 'CASH' as WalletType,
    visualType: 'ICON' as VisualType,
    iconKey: 'wallet',
    imageUrl: '',
    note: '',
  });
  const [uploading, setUploading] = useState(false);

  // Wallets list for transfer modal
  const [wallets, setWallets] = useState<Wallet[]>([]);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFormData, setTransferFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    walletId: '',
    walletToId: '',
    amount: '',
    note: '',
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Adjustment modal state
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentFormData, setAdjustmentFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'ADD' as 'ADD' | 'SUBTRACT',
    note: '',
  });
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  // Format VND currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  useEffect(() => {
    if (params.id) {
      fetchWallet();
      fetchWallets();
      fetchSummary();
      fetchAdjustments();
      fetchTransfers();
      fetchIncomes();
      fetchExpenses();
    }
  }, [params.id, timeFilter]);

  const fetchWallet = async () => {
    try {
      const data = await apiClient<Wallet>(`/wallets/${params.id}`);
      setWallet(data);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      setWallet(null);
    }
  };

  const fetchWallets = async () => {
    try {
      const data = await apiClient<Wallet[]>('/wallets');
      setWallets(data);
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const searchParams = new URLSearchParams();
      if (timeFilter !== 'all') {
        const now = new Date();
        let from: Date;
        let to: Date = new Date();

        switch (timeFilter) {
          case 'this_month':
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'last_month':
            from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            to = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
          case 'this_year':
            from = new Date(now.getFullYear(), 0, 1);
            break;
          case 'last_year':
            from = new Date(now.getFullYear() - 1, 0, 1);
            to = new Date(now.getFullYear(), 0, 0);
            break;
          default:
            from = new Date(0);
        }
        searchParams.append('from', from.toISOString());
        searchParams.append('to', to.toISOString());
      }

      const data = await apiClient<WalletUsageSummary>(`/wallets/${params.id}/usage/summary?${searchParams}`);
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjustments = async () => {
    try {
      const data = await apiClient<AdjustmentRecord[]>(`/wallets/${params.id}/adjustments`);
      setAdjustments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch adjustments:', error);
      setAdjustments([]);
    }
  };

  const fetchTransfers = async () => {
    try {
      const data = await apiClient<TransferRecord[]>(`/wallets/${params.id}/transfers`);
      setTransfers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
      setTransfers([]);
    }
  };

  const fetchIncomes = async () => {
    setLoadingIncomes(true);
    try {
      const data = await apiClient<any[]>(`/transactions?walletId=${params.id}&type=INCOME`);
      const formatted = (data || []).map(tx => ({
        id: tx.id,
        code: tx.code || '',
        type: 'INCOME' as const,
        date: tx.date,
        amount: Number(tx.amount),
        categoryName: tx.incomeCategory?.name || '-',
        categoryId: tx.incomeCategoryId || null,
        note: tx.note || null,
        projectId: tx.projectId || null,
        projectName: tx.project?.name || null,
        walletId: tx.walletId,
      }));
      setIncomes(formatted);
    } catch (error) {
      console.error('Failed to fetch incomes:', error);
      setIncomes([]);
    } finally {
      setLoadingIncomes(false);
    }
  };

  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const data = await apiClient<any[]>(`/transactions?walletId=${params.id}&type=EXPENSE`);
      const formatted = (data || []).map(tx => ({
        id: tx.id,
        code: tx.code || '',
        type: 'EXPENSE' as const,
        date: tx.date,
        amount: Number(tx.amount),
        categoryName: tx.expenseCategory?.name || '-',
        categoryId: tx.expenseCategoryId || null,
        note: tx.note || null,
        projectId: tx.projectId || null,
        projectName: tx.project?.name || null,
        walletId: tx.walletId,
      }));
      setExpenses(formatted);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  // Unified refresh function - call this after any mutation (create/edit/delete)
  const refreshWalletDetail = async () => {
    await Promise.all([
      fetchWallet(),
      fetchSummary(),
      fetchAdjustments(),
      fetchTransfers(),
      fetchIncomes(),
      fetchExpenses(),
    ]);
  };

  // ==================== INCOME EDIT/DELETE ====================
  const openEditIncome = (tx: WalletTransactionItem) => {
    setEditingIncome(tx);
    setEditIncomeForm({
      date: new Date(tx.date).toISOString().split('T')[0],
      amount: tx.amount,
      categoryId: tx.categoryId || '',
      note: tx.note || '',
    });
    setShowEditIncomeModal(true);
  };

  const handleUpdateIncome = async () => {
    if (!editingIncome) return;
    try {
      await apiClient(`/transactions/${editingIncome.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: editIncomeForm.date,
          amount: editIncomeForm.amount,
          incomeCategoryId: editIncomeForm.categoryId,
          note: editIncomeForm.note,
        }),
      });
      showSuccess('Thành công', 'Cập nhật phiếu thu thành công');
      setShowEditIncomeModal(false);
      setEditingIncome(null);
      // Optimistic update
      setIncomes(prev => prev.map(tx => 
        tx.id === editingIncome.id 
          ? { ...tx, date: editIncomeForm.date, amount: editIncomeForm.amount, note: editIncomeForm.note }
          : tx
      ));
      // Refresh KPIs
      await refreshAfterFinancialMutation({ walletId: params.id, transactionType: 'INCOME', transactionWalletId: params.id });
    } catch (error: any) {
      console.error('Failed to update income:', error);
      showError('Lỗi', error.message || 'Không thể cập nhật phiếu thu');
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await apiClient(`/transactions/${id}`, { method: 'DELETE' });
      showSuccess('Thành công', 'Đã xóa phiếu thu');
      // Optimistic update
      setIncomes(prev => prev.filter(tx => tx.id !== id));
      // Refresh KPIs
      await refreshAfterFinancialMutation({ walletId: params.id, transactionType: 'INCOME', transactionWalletId: params.id });
    } catch (error: any) {
      console.error('Failed to delete income:', error);
      if (error.message?.includes('không tồn tại') || error.status === 404) {
        showError('Đã xóa trước đó', 'Phiếu thu này đã được xóa');
        setIncomes(prev => prev.filter(tx => tx.id !== id));
      } else {
        showError('Lỗi', error.message || 'Không thể xóa phiếu thu');
      }
    } finally {
      setDeletingIncomeId(null);
    }
  };

  // ==================== EXPENSE EDIT/DELETE ====================
  const openEditExpense = (tx: WalletTransactionItem) => {
    setEditingExpense(tx);
    setEditExpenseForm({
      date: new Date(tx.date).toISOString().split('T')[0],
      amount: tx.amount,
      categoryId: tx.categoryId || '',
      note: tx.note || '',
    });
    setShowEditExpenseModal(true);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;
    try {
      await apiClient(`/transactions/${editingExpense.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: editExpenseForm.date,
          amount: editExpenseForm.amount,
          expenseCategoryId: editExpenseForm.categoryId,
          note: editExpenseForm.note,
        }),
      });
      showSuccess('Thành công', 'Cập nhật phiếu chi thành công');
      setShowEditExpenseModal(false);
      setEditingExpense(null);
      // Optimistic update
      setExpenses(prev => prev.map(tx => 
        tx.id === editingExpense.id 
          ? { ...tx, date: editExpenseForm.date, amount: editExpenseForm.amount, note: editExpenseForm.note }
          : tx
      ));
      // Refresh KPIs
      await refreshAfterFinancialMutation({ walletId: params.id, transactionType: 'EXPENSE', transactionWalletId: params.id });
    } catch (error: any) {
      console.error('Failed to update expense:', error);
      showError('Lỗi', error.message || 'Không thể cập nhật phiếu chi');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await apiClient(`/transactions/${id}`, { method: 'DELETE' });
      showSuccess('Thành công', 'Đã xóa phiếu chi');
      // Optimistic update
      setExpenses(prev => prev.filter(tx => tx.id !== id));
      // Refresh KPIs
      await refreshAfterFinancialMutation({ walletId: params.id, transactionType: 'EXPENSE', transactionWalletId: params.id });
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      if (error.message?.includes('không tồn tại') || error.status === 404) {
        showError('Đã xóa trước đó', 'Phiếu chi này đã được xóa');
        setExpenses(prev => prev.filter(tx => tx.id !== id));
      } else {
        showError('Lỗi', error.message || 'Không thể xóa phiếu chi');
      }
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient(`/wallets/${params.id}`, { method: 'DELETE' });
      showSuccess('Thành công', 'Đã xóa sổ quỹ');
      router.push('/fund/wallets');
    } catch (error: any) {
      console.error('Failed to delete:', error);
      const message = error?.message || 'Có lỗi xảy ra khi xóa';
      showError('Xóa thất bại', message);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setDeletingLoading(true);
    try {
      await apiClient(`/transactions/${id}`, { method: 'DELETE' });
      showSuccess('Thành công', 'Đã xóa giao dịch');
      // Optimistic update - immediately remove from UI
      setSummary(prev => prev ? {
        ...prev,
        recentTransactions: prev.recentTransactions.filter(tx => tx.id !== id)
      } : null);
      // Full refresh to update KPIs
      await refreshWalletDetail();
    } catch (error: any) {
      console.error('Failed to delete transaction:', error);
      if (error.message?.includes('không tồn tại') || error.status === 404) {
        showError('Đã xóa trước đó', 'Giao dịch này đã được xóa');
        await refreshWalletDetail();
      } else {
        showError('Xóa thất bại', error.message || 'Có lỗi xảy ra khi xóa');
      }
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    setDeletingLoading(true);
    try {
      await apiClient(`/adjustments/${id}`, { method: 'DELETE' });
      showSuccess('Thành công', 'Đã xóa điều chỉnh');
      // Optimistic update - immediately remove from UI
      setAdjustments(prev => prev.filter(adj => adj.id !== id));
      // Full refresh to update KPIs and balance
      await refreshWalletDetail();
    } catch (error: any) {
      console.error('Failed to delete adjustment:', error);
      if (error.message?.includes('không tồn tại') || error.status === 404) {
        showError('Đã xóa trước đó', 'Điều chỉnh này đã được xóa');
        await refreshWalletDetail();
      } else {
        showError('Xóa thất bại', error.message || 'Có lỗi xảy ra khi xóa');
      }
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    setDeletingLoading(true);
    try {
      await apiClient(`/transfers/${id}`, { method: 'DELETE' });
      showSuccess('Thành công', 'Đã xóa chuyển khoản');
      // Optimistic update - immediately remove from UI
      setTransfers(prev => prev.filter(tx => tx.id !== id));
      // Full refresh to update KPIs and balance
      await refreshWalletDetail();
    } catch (error: any) {
      console.error('Failed to delete transfer:', error);
      if (error.message?.includes('không tồn tại') || error.status === 404) {
        showError('Đã xóa trước đó', 'Chuyển khoản này đã được xóa');
        await refreshWalletDetail();
      } else {
        showError('Xóa thất bại', error.message || 'Có lỗi xảy ra khi xóa');
      }
    } finally {
      setDeletingLoading(false);
    }
  };

  // ========== TRANSFER HANDLERS ==========
  const handleCreateTransfer = async () => {
    if (!transferFormData.walletToId || !transferFormData.amount) {
      showError('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (!wallet?.id || transferFormData.walletToId === wallet.id) {
      showError('Lỗi', 'Ví nguồn và ví đích phải khác nhau');
      return;
    }
    const amount = parseFloat(transferFormData.amount);
    if (amount <= 0) {
      showError('Lỗi', 'Số tiền phải lớn hơn 0');
      return;
    }

    setTransferSubmitting(true);
    try {
      await apiClient('/transfers', {
        method: 'POST',
        body: JSON.stringify({
          date: transferFormData.date,
          walletId: wallet.id,
          walletToId: transferFormData.walletToId,
          amount: amount,
          note: transferFormData.note,
        }),
      });
      showSuccess('Thành công', 'Chuyển tiền thành công');
      setShowTransferModal(false);
      setTransferFormData({
        date: new Date().toISOString().split('T')[0],
        walletId: wallet?.id || '',
        walletToId: '',
        amount: '',
        note: '',
      });
      // Refresh all data after successful transfer
      fetchWallet();
      fetchWallets();
      fetchSummary();
      fetchAdjustments();
      fetchTransfers();
      fetchIncomes();
      fetchExpenses();
    } catch (error: any) {
      // Error is already handled by API client, no need to show additional toast
      console.error('Transfer error:', error);
    } finally {
      setTransferSubmitting(false);
    }
  };

  // ========== ADJUSTMENT HANDLERS ==========
  const handleCreateAdjustment = async () => {
    if (!adjustmentFormData.amount) {
      showError('Lỗi', 'Vui lòng nhập số tiền');
      return;
    }
    const amount = parseFloat(adjustmentFormData.amount);
    if (amount <= 0) {
      showError('Lỗi', 'Số tiền phải lớn hơn 0');
      return;
    }

    setAdjustmentSubmitting(true);
    try {
      await apiClient('/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          date: adjustmentFormData.date,
          walletId: wallet?.id,
          amount: adjustmentFormData.type === 'SUBTRACT' ? -amount : amount,
          note: adjustmentFormData.note,
        }),
      });
      showSuccess('Thành công', 'Điều chỉnh số dư thành công');
      setShowAdjustmentModal(false);
      setAdjustmentFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        type: 'ADD',
        note: '',
      });
      // Refresh all data after successful adjustment
      fetchWallet();
      fetchSummary();
      fetchAdjustments();
    } catch (error: any) {
      // Error is already handled by API client
      console.error('Adjustment error:', error);
    } finally {
      setAdjustmentSubmitting(false);
    }
  };

  const handleEditTransaction = (tx: WalletTransactionSummary) => {
    setEditingTransaction({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      note: tx.note || '',
      date: new Date(tx.date).toISOString().split('T')[0],
    });
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;
    try {
      await apiClient(`/transactions/${editingTransaction.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount: editingTransaction.amount,
          note: editingTransaction.note,
          date: editingTransaction.date,
        }),
      });
      showSuccess('Thành công', 'Cập nhật giao dịch thành công');
      setEditingTransaction(null);
      fetchSummary();
    } catch (error: any) {
      console.error('Failed to update transaction:', error);
      const message = error?.message || 'Có lỗi xảy ra khi cập nhật';
      showError('Cập nhật thất bại', message);
    }
  };

  const handleEditTransfer = (tx: TransferRecord) => {
    setEditingTransfer({
      id: tx.id,
      amount: tx.amount,
      note: tx.note || '',
      date: new Date(tx.date).toISOString().split('T')[0],
      walletId: tx.walletId,
      walletToId: tx.walletToId || '',
      isOutgoing: tx.isOutgoing,
    });
  };

  const handleUpdateTransfer = async () => {
    if (!editingTransfer) return;
    try {
      await apiClient(`/transfers/${editingTransfer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount: editingTransfer.amount,
          note: editingTransfer.note,
          date: editingTransfer.date,
        }),
      });
      showSuccess('Thành công', 'Cập nhật chuyển khoản thành công');
      setEditingTransfer(null);
      fetchTransfers();
      fetchWallet();
    } catch (error: any) {
      console.error('Failed to update transfer:', error);
      const message = error?.message || 'Có lỗi xảy ra khi cập nhật';
      showError('Cập nhật thất bại', message);
    }
  };

  const handleEditAdjustment = (adj: AdjustmentRecord) => {
    setEditingAdjustment({
      id: adj.id,
      amount: adj.amount,
      note: adj.note || '',
      date: new Date(adj.date).toISOString().split('T')[0],
    });
  };

  const handleUpdateAdjustment = async () => {
    if (!editingAdjustment) return;
    try {
      await apiClient(`/adjustments/${editingAdjustment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount: editingAdjustment.amount,
          note: editingAdjustment.note,
          date: editingAdjustment.date,
        }),
      });
      showSuccess('Thành công', 'Cập nhật điều chỉnh thành công');
      setEditingAdjustment(null);
      fetchAdjustments();
      fetchWallet();
    } catch (error: any) {
      console.error('Failed to update adjustment:', error);
      const message = error?.message || 'Có lỗi xảy ra khi cập nhật';
      showError('Cập nhật thất bại', message);
    }
  };

  const handleUploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setEditFormData((prev) => ({ ...prev, imageUrl: data.url }));
      } else {
        showError('Upload thất bại', data.error || 'Vui lòng thử lại');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      showError('Upload thất bại', 'Có lỗi xảy ra khi tải lên');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editFormData.name.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập tên sổ quỹ');
      return;
    }
    if (editFormData.visualType === 'ICON' && !editFormData.iconKey) {
      showError('Lỗi nhập liệu', 'Vui lòng chọn icon');
      return;
    }
    if (editFormData.visualType === 'IMAGE' && !editFormData.imageUrl) {
      showError('Lỗi nhập liệu', 'Vui lòng tải lên logo');
      return;
    }

    try {
      await apiClient(`/wallets/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData),
      });
      showSuccess('Thành công', 'Cập nhật sổ quỹ thành công');
      setShowEditModal(false);
      fetchWallet();
    } catch (error) {
      console.error('Failed to update:', error);
      showError('Lỗi', 'Có lỗi xảy ra khi cập nhật');
    }
  };

  const openEditModal = () => {
    if (wallet) {
      setEditFormData({
        name: wallet.name,
        type: wallet.type,
        visualType: wallet.visualType,
        iconKey: wallet.iconKey || 'wallet',
        imageUrl: wallet.imageUrl || '',
        note: wallet.note || '',
      });
      setShowEditModal(true);
    }
  };

  const totalIncome = summary?.incomeTotal || 0;
  const totalExpense = summary?.expenseTotal || 0;
  const adjustmentsTotal = summary?.adjustmentsTotal || 0;
  const net = summary?.net || 0;

  if (loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  if (!wallet) {
    return <div className="p-8 text-center">Sổ quỹ không tồn tại</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/fund/wallets')} className="mb-4 pl-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại danh sách
        </Button>
      </div>

      {/* Wallet Info Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
              <VisualRenderer
                visualType={wallet.visualType}
                iconKey={wallet.iconKey || 'wallet'}
                imageUrl={wallet.imageUrl}
                color="#3b82f6"
                className="w-16 h-16"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{wallet.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeColors[wallet.type]}`}>
                  {typeLabels[wallet.type]}
                </span>
              </div>
              <p className="text-gray-500 mt-1">Mã: {wallet.code}</p>
              {wallet.note && <p className="text-gray-600 mt-2">{wallet.note}</p>}
              
              {isAdmin && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Button size="sm" variant="outline" onClick={openEditModal}>
                    <Edit className="h-4 w-4 mr-1" />
                    Sửa
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setShowConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Xóa
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setShowTransferModal(true);
                  }}>
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Chuyển tiền
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAdjustmentModal(true)}>
                    <Settings className="h-4 w-4 mr-1" />
                    Điều chỉnh
                  </Button>
                </div>
              )}
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4 shrink-0">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <MetricCardTitle 
                  label="Tổng thu" 
                  metricKey={METRIC_KEYS.wallet_summary_totalIncome}
                />
                <p className="font-bold text-green-700 mt-1">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <MetricCardTitle 
                  label="Tổng chi" 
                  metricKey={METRIC_KEYS.wallet_summary_totalExpense}
                />
                <p className="font-bold text-red-700 mt-1">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <MetricCardTitle 
                  label="Thuần (Net)" 
                  metricKey={METRIC_KEYS.wallet_summary_net}
                />
                <p className={`font-bold mt-1 ${net >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {formatCurrency(net)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Filter */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          {timeFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={timeFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Phiếu thu */}
        <Card>
          <CardHeader>
            <MetricSectionTitle
              title="Phiếu thu"
              metricKey={METRIC_KEYS.wallet_invoices_incomeList}
              titleClassName="text-green-600"
            />
            <p className="text-sm text-gray-500">Các phiếu thu đã sử dụng ví này</p>
          </CardHeader>
          <CardContent>
            {loadingIncomes ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : incomes.length > 0 ? (
              <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="pb-2 font-medium">Ngày</th>
                      <th className="pb-2 font-medium">Danh mục</th>
                      <th className="pb-2 font-medium">Ghi chú</th>
                      <th className="pb-2 font-medium text-right">Số tiền</th>
                      <th className="pb-2 font-medium w-24 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.slice(0, 8).map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-2 text-gray-600">
                          {new Date(tx.date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-2">{tx.categoryName}</td>
                        <td className="py-2 text-gray-500 truncate max-w-24" title={tx.note || ''}>
                          {tx.note || '-'}
                        </td>
                        <td className="py-2 text-right font-medium text-green-600">
                          +{formatCurrency(tx.amount)}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                              onClick={() => openEditIncome(tx)}
                              title="Sửa"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:bg-red-50"
                              onClick={() => setDeletingIncomeId(tx.id)}
                              title="Xóa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {incomes.length > 8 && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Và {incomes.length - 8} phiếu thu khác...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Chưa có phiếu thu nào sử dụng ví này</p>
            )}
          </CardContent>
        </Card>

        {/* Phiếu chi */}
        <Card>
          <CardHeader>
            <MetricSectionTitle
              title="Phiếu chi"
              metricKey={METRIC_KEYS.wallet_invoices_expenseList}
              titleClassName="text-red-600"
            />
            <p className="text-sm text-gray-500">Các phiếu chi đã sử dụng ví này</p>
          </CardHeader>
          <CardContent>
            {loadingExpenses ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : expenses.length > 0 ? (
              <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="pb-2 font-medium">Ngày</th>
                      <th className="pb-2 font-medium">Danh mục</th>
                      <th className="pb-2 font-medium">Ghi chú</th>
                      <th className="pb-2 font-medium text-right">Số tiền</th>
                      <th className="pb-2 font-medium w-24 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.slice(0, 8).map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-2 text-gray-600">
                          {new Date(tx.date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-2">{tx.categoryName}</td>
                        <td className="py-2 text-gray-500 truncate max-w-24" title={tx.note || ''}>
                          {tx.note || '-'}
                        </td>
                        <td className="py-2 text-right font-medium text-red-600">
                          -{formatCurrency(tx.amount)}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                              onClick={() => openEditExpense(tx)}
                              title="Sửa"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:bg-red-50"
                              onClick={() => setDeletingExpenseId(tx.id)}
                              title="Xóa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {expenses.length > 8 && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Và {expenses.length - 8} phiếu chi khác...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Chưa có phiếu chi nào sử dụng ví này</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transfers Section */}
      <Card className="mt-6">
        <CardHeader>
          <MetricSectionTitle
            title="Chuyển tiền trong quỹ"
            metricKey={METRIC_KEYS.wallet_transfer_list}
            titleClassName="text-blue-600"
          />
        </CardHeader>
        <CardContent>
          {transfers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-2">Ngày</th>
                    <th className="pb-2">Hướng</th>
                    <th className="pb-2">Ví đối ứng</th>
                    <th className="pb-2">Ghi chú</th>
                    <th className="pb-2 text-right w-32 pr-4">Số tiền</th>
                    <th className="pb-2 text-right w-36 pr-4">Số dư cuối</th>
                    <th className="pb-2 w-36 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="py-2">
                        {new Date(tx.date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${tx.isOutgoing ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {tx.isOutgoing ? 'Chuyển đi' : 'Nhận về'}
                        </span>
                      </td>
                      <td className="py-2">{tx.counterpartyWalletName || '-'}</td>
                      <td className="py-2 text-gray-500">{tx.note || '-'}</td>
                      <td className={`py-2 text-right font-medium pr-4 ${tx.isOutgoing ? 'text-red-600' : 'text-green-600'}`}>
                        {tx.isOutgoing ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-2 text-right text-gray-600 pr-4">
                        {formatCurrency(tx.balanceAfter)}
                      </td>
                      <td className="py-2">
                        {isAdmin && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleEditTransfer(tx)}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setDeletingItem({ type: 'transfer', id: tx.id, label: 'chuyển khoản này' })}
                            >
                              Xóa
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Chưa có giao dịch chuyển tiền</p>
          )}
        </CardContent>
      </Card>

      {/* Adjustments Section */}
      <Card className="mt-6">
        <CardHeader>
          <MetricSectionTitle
            title="Điều chỉnh số dư"
            metricKey={METRIC_KEYS.wallet_adjustment_list}
            titleClassName="text-purple-600"
          />
        </CardHeader>
        <CardContent>
          {adjustments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-2">Ngày</th>
                    <th className="pb-2">Loại</th>
                    <th className="pb-2">Ghi chú</th>
                    <th className="pb-2 text-right w-32 pr-4">Số tiền</th>
                    <th className="pb-2 text-right w-36 pr-4">Số dư cuối</th>
                    <th className="pb-2 w-36 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj) => (
                    <tr key={adj.id} className="border-b last:border-0">
                      <td className="py-2">
                        {new Date(adj.date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${adj.amount >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {adj.amount >= 0 ? 'Tăng' : 'Giảm'}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">{adj.note || '-'}</td>
                      <td className={`py-2 text-right font-medium pr-4 ${adj.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {adj.amount >= 0 ? '+' : ''}
                        {formatCurrency(adj.amount)}
                      </td>
                      <td className="py-2 text-right text-gray-600 pr-4">
                        {formatCurrency(adj.balanceAfter)}
                      </td>
                      <td className="py-2">
                        {isAdmin && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleEditAdjustment(adj)}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setDeletingItem({ type: 'adjustment', id: adj.id, label: 'điều chỉnh này' })}
                            >
                              Xóa
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Chưa có điều chỉnh số dư</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Sửa sổ quỹ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="block text-sm font-medium mb-1">Tên sổ quỹ *</Label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập tên sổ quỹ..."
                />
              </div>

              <div>
                <Label className="block text-sm font-medium mb-1">Loại sổ quỹ</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={editFormData.type}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, type: e.target.value as WalletType }))}
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK">Ngân hàng</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">Chọn loại hiển thị</Label>
                <VisualSelector
                  visualType={editFormData.visualType}
                  iconKey={editFormData.iconKey}
                  imageUrl={editFormData.imageUrl}
                  onVisualTypeChange={(vt) => setEditFormData((prev) => ({ ...prev, visualType: vt }))}
                  onIconKeyChange={(ik) => setEditFormData((prev) => ({ ...prev, iconKey: ik }))}
                  onImageUrlChange={(iu) => setEditFormData((prev) => ({ ...prev, imageUrl: iu }))}
                />
              </div>

              <div>
                <Label className="block text-sm font-medium mb-1">Ghi chú</Label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  value={editFormData.note}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Ghi chú thêm..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Hủy</Button>
                <Button onClick={handleUpdate}>Cập nhật</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="py-6 text-center">
              <Trash2 className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa sổ quỹ?</h3>
              <p className="text-gray-500 mb-4">
                Bạn có chắc muốn xóa &quot;{wallet.name}&quot;?
                <br />Sổ quỹ sẽ bị ẩn và có thể khôi phục sau.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowConfirmDelete(false)}>Hủy</Button>
                <Button variant="destructive" onClick={handleDelete}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Sửa giao dịch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Loại</label>
                <div className={`px-3 py-2 rounded-md border ${
                  editingTransaction.type === 'INCOME' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {editingTransaction.type === 'INCOME' ? 'Thu' : 'Chi'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VND)</label>
                <MoneyInput
                  value={editingTransaction.amount}
                  onChange={(val) => setEditingTransaction(prev => prev ? ({
                    ...prev,
                    amount: val
                  }) : null)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ngày</label>
                <Input
                  type="date"
                  value={editingTransaction.date}
                  onChange={(e) => setEditingTransaction(prev => prev ? ({
                    ...prev,
                    date: e.target.value
                  }) : null)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  value={editingTransaction.note}
                  onChange={(e) => setEditingTransaction(prev => prev ? ({
                    ...prev,
                    note: e.target.value
                  }) : null)}
                  placeholder="Ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingTransaction(null)}>Hủy</Button>
                <Button onClick={handleUpdateTransaction}>Lưu</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Transfer Modal */}
      {editingTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Sửa chuyển khoản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Hướng</label>
                <div className={`px-3 py-2 rounded-md border ${
                  editingTransfer.isOutgoing ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {editingTransfer.isOutgoing ? 'Chuyển đi' : 'Nhận về'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VND)</label>
                <MoneyInput
                  value={editingTransfer.amount}
                  onChange={(val) => setEditingTransfer(prev => prev ? ({
                    ...prev,
                    amount: val
                  }) : null)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ngày</label>
                <Input
                  type="date"
                  value={editingTransfer.date}
                  onChange={(e) => setEditingTransfer(prev => prev ? ({
                    ...prev,
                    date: e.target.value
                  }) : null)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  value={editingTransfer.note}
                  onChange={(e) => setEditingTransfer(prev => prev ? ({
                    ...prev,
                    note: e.target.value
                  }) : null)}
                  placeholder="Ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingTransfer(null)}>Hủy</Button>
                <Button onClick={handleUpdateTransfer}>Lưu</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Adjustment Modal */}
      {editingAdjustment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Sửa điều chỉnh số dư</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Loại</label>
                <div className={`px-3 py-2 rounded-md border ${
                  editingAdjustment.amount >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {editingAdjustment.amount >= 0 ? 'Tăng' : 'Giảm'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VND)</label>
                <MoneyInput
                  value={editingAdjustment.amount}
                  onChange={(val) => setEditingAdjustment(prev => prev ? ({
                    ...prev,
                    amount: val
                  }) : null)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ngày</label>
                <Input
                  type="date"
                  value={editingAdjustment.date}
                  onChange={(e) => setEditingAdjustment(prev => prev ? ({
                    ...prev,
                    date: e.target.value
                  }) : null)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  value={editingAdjustment.note}
                  onChange={(e) => setEditingAdjustment(prev => prev ? ({
                    ...prev,
                    note: e.target.value
                  }) : null)}
                  placeholder="Ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingAdjustment(null)}>Hủy</Button>
                <Button onClick={handleUpdateAdjustment}>Lưu</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Transaction/Adjustment/Transfer Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open: boolean) => !deletingLoading && !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa {deletingItem?.label} không?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deletingLoading}
              onClick={() => {
                if (deletingItem) {
                  if (deletingItem.type === 'transaction') {
                    handleDeleteTransaction(deletingItem.id);
                  } else if (deletingItem.type === 'adjustment') {
                    handleDeleteAdjustment(deletingItem.id);
                  } else if (deletingItem.type === 'transfer') {
                    handleDeleteTransfer(deletingItem.id);
                  }
                  setDeletingItem(null);
                }
              }}
            >
              {deletingLoading ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Income Modal */}
      {showEditIncomeModal && editingIncome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Sửa phiếu thu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ngày *</label>
                <Input
                  type="date"
                  value={editIncomeForm.date}
                  onChange={(e) => setEditIncomeForm({ ...editIncomeForm, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VND) *</label>
                <MoneyInput
                  value={editIncomeForm.amount}
                  onChange={(val) => setEditIncomeForm({ ...editIncomeForm, amount: val })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  value={editIncomeForm.note}
                  onChange={(e) => setEditIncomeForm({ ...editIncomeForm, note: e.target.value })}
                  placeholder="Ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowEditIncomeModal(false);
                  setEditingIncome(null);
                }}>Hủy</Button>
                <Button onClick={handleUpdateIncome}>Lưu</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditExpenseModal && editingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Sửa phiếu chi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ngày *</label>
                <Input
                  type="date"
                  value={editExpenseForm.date}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VND) *</label>
                <MoneyInput
                  value={editExpenseForm.amount}
                  onChange={(val) => setEditExpenseForm({ ...editExpenseForm, amount: val })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  value={editExpenseForm.note}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, note: e.target.value })}
                  placeholder="Ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowEditExpenseModal(false);
                  setEditingExpense(null);
                }}>Hủy</Button>
                <Button onClick={handleUpdateExpense}>Lưu</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Income Confirmation */}
      <AlertDialog open={!!deletingIncomeId} onOpenChange={() => setDeletingIncomeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa phiếu thu?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa phiếu thu này không?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingIncomeId(null)}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deletingIncomeId && handleDeleteIncome(deletingIncomeId)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Expense Confirmation */}
      <AlertDialog open={!!deletingExpenseId} onOpenChange={() => setDeletingExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa phiếu chi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa phiếu chi này không?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingExpenseId(null)}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deletingExpenseId && handleDeleteExpense(deletingExpenseId)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Chuyển nội bộ</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowTransferModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Ngày *</Label>
                  <Input
                    type="date"
                    value={transferFormData.date}
                    onChange={(e) => setTransferFormData({ ...transferFormData, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Từ ví *</Label>
                  <Input
                    value={wallet?.name || ''}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Đây là ví hiện tại</p>
                </div>
                <div>
                  <Label>Đến ví *</Label>
                  <Select
                    value={transferFormData.walletToId}
                    onChange={(e) => setTransferFormData({ ...transferFormData, walletToId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Chọn ví đích</option>
                    {wallets
                      .filter((w) => w.id !== transferFormData.walletId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                  </Select>
                </div>
                <div>
                  <Label>Số tiền *</Label>
                  <MoneyInput
                    value={transferFormData.amount ? parseFloat(transferFormData.amount) : 0}
                    onChange={(val) => setTransferFormData({ ...transferFormData, amount: String(val) })}
                    placeholder="Nhập số tiền"
                    required
                  />
                </div>
                <div>
                  <Label>Ghi chú</Label>
                  <Input
                    type="text"
                    value={transferFormData.note}
                    onChange={(e) => setTransferFormData({ ...transferFormData, note: e.target.value })}
                    placeholder="Nhập ghi chú (tùy chọn)"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowTransferModal(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreateTransfer} disabled={transferSubmitting}>
                    {transferSubmitting ? 'Đang tạo...' : 'Tạo chuyển khoản'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Điều chỉnh số dư</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAdjustmentModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Ngày *</Label>
                  <Input
                    type="date"
                    value={adjustmentFormData.date}
                    onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Loại điều chỉnh *</Label>
                  <Select
                    value={adjustmentFormData.type}
                    onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, type: e.target.value as 'ADD' | 'SUBTRACT' })}
                    className="w-full"
                  >
                    <option value="ADD">Cộng tiền (+)</option>
                    <option value="SUBTRACT">Trừ tiền (-)</option>
                  </Select>
                </div>
                <div>
                  <Label>Số tiền *</Label>
                  <MoneyInput
                    value={adjustmentFormData.amount ? parseFloat(adjustmentFormData.amount) : 0}
                    onChange={(val) => setAdjustmentFormData({ ...adjustmentFormData, amount: String(val) })}
                    placeholder="Nhập số tiền"
                    required
                  />
                </div>
                <div>
                  <Label>Ghi chú</Label>
                  <Input
                    type="text"
                    value={adjustmentFormData.note}
                    onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, note: e.target.value })}
                    placeholder="Nhập ghi chú (tùy chọn)"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAdjustmentModal(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreateAdjustment} disabled={adjustmentSubmitting}>
                    {adjustmentSubmitting ? 'Đang tạo...' : 'Tạo điều chỉnh'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

