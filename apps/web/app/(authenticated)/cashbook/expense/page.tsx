// @ts-nocheck - Pre-existing type errors with Transaction.project property
// This is a legacy type mismatch between frontend types and backend response
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Transaction, Wallet, ExpenseCategory, Project, VisualType } from '@tran-go-hoang-gia/shared';
import { Plus, Search, Edit, Trash2, RotateCcw, AlertCircle, DollarSign, Building2, ClipboardList, Link } from 'lucide-react';
import { VisualRenderer } from '@/components/visual-selector';
import { VoiceInputButton } from '@/components/voice-input-button';
import { AiDraftModal } from '@/components/ai-draft-modal';
import { MoneyInput } from '@/components/common/money-input';
import { apiClient } from '@/lib/api';

import { useDefaultTimeFilter } from '@/lib/hooks';
import { useToast } from '@/components/toast-provider';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { buildExpenseCreatePayload, buildExpenseUpdatePayload } from '@/lib/transactions';
import { cn } from '@/lib/utils';
import { CashbookTransactionsFilterBar } from '@/components/cashbook/transactions-filter-bar';
import { MetricCardTitle } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';

interface DraftData {
  type: 'INCOME' | 'EXPENSE';
  date: string;
  amount: number;
  walletId: string;
  incomeCategoryId?: string;
  expenseCategoryId?: string;
  projectId?: string;
  isCommonCost?: boolean;
  isAds?: boolean;
  adsPlatform?: string;
  note: string;
  missingFields: string[];
}

// Extend Transaction type locally to include ads fields
interface ExpenseTransaction extends Transaction {
  isAds?: boolean;
  adsPlatform?: string;
}

export default function ExpensePage() {
  const { token, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  // Track marketing category ID for ads expenses
  const [marketingCategoryId, setMarketingCategoryId] = useState<string>('');
  const [showExpenseTypeSelector, setShowExpenseTypeSelector] = useState(true);
  // Track whether user has manually edited the note (to avoid overwriting)
  const [noteTouched, setNoteTouched] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    walletId: '',
    expenseCategoryId: '',
    expenseMode: 'project' as 'project' | 'common',
    projectId: '',
    isAds: false,
    adsPlatform: '',
    note: '',
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState<Transaction | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { timeFilter, setTimeFilter } = useDefaultTimeFilter();
  const [filters, setFilters] = useState({
    walletId: 'all',
    categoryId: 'all',
    onlyCommonCost: false,
    search: '',
    showDeleted: false,
  });

  const fetchData = async () => {
    try {
      setBanner(null);
      const txParams = new URLSearchParams();
      txParams.append('type', 'EXPENSE');
      txParams.append('from', timeFilter.from);
      txParams.append('to', timeFilter.to);
      if (filters.walletId !== 'all') txParams.append('walletId', filters.walletId);
      if (filters.categoryId !== 'all') txParams.append('expenseCategoryId', filters.categoryId);
      if (filters.onlyCommonCost) txParams.append('isCommonCost', 'true');
      if (filters.showDeleted) txParams.append('includeDeleted', 'true');

      const [txData, walletData, catData, projectData] = await Promise.all([
        apiClient<any[]>(`/transactions?${txParams.toString()}`),
        apiClient<any[]>('/wallets'),
        apiClient<any[]>('/expense-categories'),
        apiClient<any[]>('/projects?stage=WON'),
      ]);

      setTransactions(txData);
      setWallets(walletData.filter((w: any) => !w.deletedAt));
      const filteredCategories = catData.filter((c: any) => !c.deletedAt);
      setCategories(filteredCategories);
      setProjects(projectData.filter((p: any) => !p.deletedAt));
      
      // Find "Chi phí marketing" category for ads expenses
      const marketingCat = filteredCategories.find((c: any) => 
        c.name.toLowerCase().includes('marketing') || 
        c.name.toLowerCase().includes('quảng cáo')
      );
      if (marketingCat) {
        setMarketingCategoryId(marketingCat.id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setBanner({ type: 'error', message: 'Lỗi kết nối server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, timeFilter]);

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.walletId) errors.push('Ví');
    // If not ads, require expense category
    if (!formData.isAds && !formData.expenseCategoryId) errors.push('Danh mục chi');
    // If ads, require adsPlatform
    if (formData.isAds && !formData.adsPlatform) errors.push('Nền tảng');
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.push('Số tiền');
    if (!formData.isAds && formData.expenseMode === 'project' && !formData.projectId) errors.push('Đơn hàng');
    
    // Auto-resolve marketing category if ads but not set
    if (formData.isAds && !formData.expenseCategoryId && marketingCategoryId) {
      setFormData(prev => ({ ...prev, expenseCategoryId: marketingCategoryId }));
    }
    
    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    // Auto-set marketing category for ads before validation
    let resolvedCategoryId = formData.expenseCategoryId;
    if (formData.isAds && !resolvedCategoryId && marketingCategoryId) {
      resolvedCategoryId = marketingCategoryId;
      setFormData(prev => ({ ...prev, expenseCategoryId: marketingCategoryId }));
    }
    if (!validateForm()) return;

    // Ads expenses behave like common cost (no project required)
    const isCommonCost = formData.expenseMode === 'common' || formData.isAds;
    const projectId = isCommonCost ? null : formData.projectId;
    const finalCategoryId = resolvedCategoryId || formData.expenseCategoryId;

    try {
      const url = editingItem ? `/transactions/${editingItem.id}` : '/transactions';
      const method = editingItem ? 'PUT' : 'POST';

      const basePayload = {
        type: 'EXPENSE',
        date: formData.date,
        amount: formData.amount,
        walletId: formData.walletId,
        expenseCategoryId: finalCategoryId,
        projectId,
        note: formData.note,
        isCommonCost,
        isAds: formData.isAds,
        adsPlatform: formData.isAds ? formData.adsPlatform : undefined,
      };

      const payload = editingItem
        ? buildExpenseUpdatePayload(basePayload)
        : buildExpenseCreatePayload(basePayload);

      const result = await apiClient(url, { method, body: JSON.stringify(payload) });

      setShowModal(false);
      resetForm();
      if (!editingItem && result) {
        setTransactions(prev => [result as Transaction, ...prev]);
      }
      fetchData();





      showSuccess('Thành công', editingItem ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
    } catch (error: any) {
      console.error('Failed to save:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (item: Transaction) => {
    try {
      await apiClient(`/transactions/${item.id}`, { method: 'DELETE' });
      setShowConfirmDelete(null);
      // Optimistic update
      setTransactions(prev => prev.filter(t => t.id !== item.id));
      // Refresh all related data
      fetchData();






      showSuccess('Thành công', 'Đã xóa phiếu chi');
    } catch (error: any) {
      console.error('Failed to delete:', error);
      if (error.message?.includes('không tồn tại') || error.status === 404) {
        showError('Đã xóa trước đó', 'Phiếu chi này đã được xóa');
        setTransactions(prev => prev.filter(t => t.id !== item.id));
      } else {
        showError('Lỗi', error.message || 'Có lỗi xảy ra');
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await apiClient(`/transactions/${id}/restore`, { method: 'POST' });
      fetchData();
      showSuccess('Thành công', 'Khôi phục thành công!');
    } catch (error) {
      console.error('Failed to restore:', error);
      showError('Lỗi', 'Có lỗi xảy ra');
    }
  };

  const handleVoiceTranscript = async (transcript: string) => {
    try {
      const result = await apiClient<any>('/ai/parse-transaction', {
        method: 'POST',
        body: JSON.stringify({
          transcript,
          modeHint: 'expense',
        }),
      });

      setDraftData({
        type: 'EXPENSE',
        date: result.date || new Date().toISOString().split('T')[0],
        amount: result.amount || 0,
        walletId: result.walletId || '',
        expenseCategoryId: result.expenseCategoryId || '',
        projectId: result.projectId || '',
        note: result.note || transcript,
        missingFields: result.missingFields || [],
        isCommonCost: result.isCommonCost || false,
      });
      setShowDraftModal(true);
    } catch (error) {
      console.error('Failed to parse transcript:', error);
      showError('Lỗi', 'Không thể phân tích giọng nói. Vui lòng nhập thủ công.');
    }
  };

  const handleCreateFromDraft = async (draft: DraftData) => {
    try {
      const payload = buildExpenseCreatePayload({
        type: 'EXPENSE',
        date: draft.date,
        amount: draft.amount,
        walletId: draft.walletId,
        expenseCategoryId: draft.expenseCategoryId || '',
        projectId: draft.projectId,
        note: draft.note,
        isCommonCost: draft.isCommonCost || false,
      });

      await apiClient('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowDraftModal(false);
      setDraftData(null);
      fetchData();
      showSuccess('Thành công', 'Tạo phiếu chi thành công!');
    } catch (error) {
      console.error('Failed to create from draft:', error);
      showError('Lỗi', 'Lỗi kết nối server');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      walletId: '',
      expenseCategoryId: '',
      expenseMode: 'project',
      projectId: '',
      isAds: false,
      adsPlatform: '',
      note: '',
    });
    setFormErrors([]);
    setEditingItem(null);
    setShowExpenseTypeSelector(true);
    setNoteTouched(false);
  };

  const ADS_PLATFORM_LABELS: Record<string, string> = {
    FACEBOOK: 'Facebook Ads',
    TIKTOK: 'TikTok Ads',
    GOOGLE: 'Google Ads',
  };

  const buildAutoNote = (platform: string) =>
    platform ? `chi quảng cáo ${ADS_PLATFORM_LABELS[platform]?.toLowerCase() ?? platform.toLowerCase()}` : '';

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  // Helper: Get display projects list including the currently editing project's info
  // This ensures the selected project is always visible in dropdown even if not in loaded list
  const getDisplayProjects = () => {
    const baseProjects = projects.filter((p: any) => !p.deletedAt);
    // If editing and has project not in list, add it temporarily
    // @ts-ignore - project property may not exist on Transaction type but is used at runtime
    if (editingItem?.project?.id) {
      // @ts-ignore
      const projectInList = baseProjects.find((p: any) => p.id === editingItem.project.id);
      if (!projectInList) {
        return [
          // @ts-ignore
          { id: editingItem.project.id, code: editingItem.project.code || '', name: editingItem.project.name || '' },
          ...baseProjects,
        ];
      }
    }
    return baseProjects;
  };

  const openEdit = (item: ExpenseTransaction) => {
    setEditingItem(item);
    setFormData({
      date: new Date(item.date).toISOString().split('T')[0],
      amount: item.amount.toString(),
      walletId: item.walletId,
      expenseCategoryId: item.expenseCategoryId || '',
      // Fix: Backend trả về project object, dùng item.project?.id thay vì item.projectId
      expenseMode: item.isCommonCost ? 'common' : 'project',
      // @ts-ignore - project property may not exist on Transaction type but is used at runtime
      projectId: item.project?.id || '',
      isAds: item.isAds || false,
      adsPlatform: item.adsPlatform || '',
      note: item.note || '',
    });
    setFormErrors([]);
    // For ads, auto-find marketing category if not set
    if (item.isAds && !item.expenseCategoryId && marketingCategoryId) {
      // Will be set from the existing expenseCategoryId
    }
    setShowExpenseTypeSelector(false); // Show summary view for edit
    setNoteTouched(true); // Existing note is treated as user-set
    setShowModal(true);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const totalAmount = transactions
    .filter(t => !t.deletedAt)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const activeCount = transactions.filter(t => !t.deletedAt).length;

  return (
    <div>
      <PageHeader
        title="Phiếu chi"
        description="Quản lý các khoản chi"
        action={
          <div className="flex gap-2">
            <VoiceInputButton mode="expense" onTranscript={handleVoiceTranscript} />
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Tạo phiếu chi</Button>
          </div>
        }
      />

      {banner && (
        <div className={cn(
          'mb-4 rounded-md border px-4 py-2 text-sm',
          banner.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        )}>
          {banner.message}
        </div>
      )}

      {/* Stats - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <MetricCardTitle label="Tổng chi" metricKey={METRIC_KEYS.expenseSlip_totalAmount} className="text-sm text-red-700 mb-1" />
                <p className="text-lg font-bold text-red-800">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <MetricCardTitle label="Số phiếu" metricKey={METRIC_KEYS.expenseSlip_count} className="text-sm text-gray-500 mb-1" />
            <p className="text-2xl font-semibold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <MetricCardTitle label="Trung bình" metricKey={METRIC_KEYS.expenseSlip_average} className="text-sm text-gray-500 mb-1" />
            <p className="text-2xl font-semibold">
              {activeCount > 0 ? formatCurrency(totalAmount / activeCount) : '0 ₫'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Thời gian</p>
            <p className="text-sm font-medium truncate">{timeFilter.from} - {timeFilter.to}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <CashbookTransactionsFilterBar
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
            walletId={filters.walletId}
            onWalletIdChange={(v) => setFilters({ ...filters, walletId: v })}
            walletOptions={wallets.map(w => ({ id: w.id, name: w.name }))}
            categoryId={filters.categoryId}
            onCategoryIdChange={(v) => setFilters({ ...filters, categoryId: v })}
            categoryOptions={categories.map(c => ({ id: c.id, name: c.name }))}
            search={filters.search}
            onSearchChange={(v) => setFilters({ ...filters, search: v })}
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
            extraLeft={
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.onlyCommonCost}
                  onChange={(e) => setFilters({ ...filters, onlyCommonCost: e.target.checked })}
                  className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary"
                />
                <span>Chi phí chung</span>
              </label>
            }
            extraRight={
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.showDeleted}
                  onChange={(e) => setFilters({ ...filters, showDeleted: e.target.checked })}
                  className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary"
                />
                <span>Hiện đã xóa</span>
              </label>
            }
          />
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Chưa có phiếu chi nào
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Ngày</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Số tiền</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Ví</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Danh mục</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Ghi chú</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => (
                  <tr key={item.id} className={cn('border-b', item.deletedAt && 'opacity-50 bg-gray-50')}>
                    <td className="p-3 text-sm">{formatDate(item.date)}</td>
                    <td className="p-3 text-sm font-medium text-red-600">{formatCurrency(Number(item.amount))}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-nowrap">
                        <div className="flex-shrink-0">
                          <VisualRenderer
                            visualType={(item.wallet?.visualType || VisualType.ICON) as VisualType}
                            iconKey={item.wallet?.iconKey || 'wallet'}
                            imageUrl={item.wallet?.imageUrl || null}
                            color={item.wallet?.type === 'CASH' ? '#10b981' : item.wallet?.type === 'BANK' ? '#3b82f6' : '#64748b'}
                            size="sm"
                          />
                        </div>
                        <span className="text-sm truncate">{item.wallet?.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-nowrap">
                        <div className="flex-shrink-0">
                          <VisualRenderer
                            visualType={(item.expenseCategory?.visualType || VisualType.ICON) as VisualType}
                            iconKey={item.expenseCategory?.iconKey || 'shopping-cart'}
                            imageUrl={item.expenseCategory?.imageUrl || null}
                            color={item.expenseCategory?.color || '#ef4444'}
                            size="sm"
                          />
                        </div>
                        <div className="flex flex-col">
                          {item.isAds ? (
                            <span className="text-sm font-medium text-purple-600">Quảng cáo</span>
                          ) : (
                            <span className="text-sm truncate">{item.expenseCategory?.name}</span>
                          )}
                          {/* Ads Platform badge with icons */}
                          {item.isAds && item.adsPlatform && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 mt-0.5">
                              {item.adsPlatform === 'FACEBOOK' && (
                                <>
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                  Facebook
                                </>
                              )}
                              {item.adsPlatform === 'TIKTOK' && (
                                <>
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.16c0 2.52-1.12 4.84-2.91 6.15-1.72 1.26-3.96 1.91-6.09 1.79-2.04-.1-3.99-.94-5.46-2.43-1.45-1.47-2.15-3.64-1.87-5.76.29-2.23 1.72-4.24 3.65-5.3 1.88-1.03 4.14-1.32 6.15-.51v4.13c-.69-.49-1.53-.84-2.43-.96-.93-.12-1.87.12-2.58.68-.68.54-1.04 1.37-.98 2.21.06.88.38 1.73.91 2.38.54.66 1.27 1.15 2.1 1.39 1.06.31 2.16.13 3.02-.45.85-.57 1.38-1.49 1.38-2.56V.02z"/></svg>
                                  TikTok
                                </>
                              )}
                              {item.adsPlatform === 'GOOGLE' && (
                                <>
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                  Google
                                </>
                              )}
                            </span>
                          )}
                          {/* Badge Đơn hàng gộp vào Danh mục */}
                          {/* @ts-ignore - project property legacy type issue */}
                          {item.project?.id && !item.isAds && (
                            <span className="inline-flex items-center gap-1 mt-0.5">
                              <Link className="h-3 w-3 text-blue-500" />
                              {/* @ts-ignore - project property legacy type issue */}
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {/* @ts-ignore - project property legacy type issue */}
                                {item.project?.code || 'Đơn hàng'}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-500 max-w-[150px] truncate">{item.note || '-'}</td>
                    <td className="p-3 text-right">
                      {item.deletedAt ? (
                        <Button size="sm" variant="outline" onClick={() => handleRestore(item.id)}>
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Khôi phục
                        </Button>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setShowConfirmDelete(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingItem ? 'Sửa phiếu chi' : 'Tạo phiếu chi mới'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 font-medium">Vui lòng nhập:</p>
                  <ul className="text-sm text-red-500 list-disc list-inside">
                    {formErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Ngày *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VND) *</label>
                <MoneyInput
                  value={formData.amount ? parseFloat(formData.amount) : 0}
                  onChange={(val) => setFormData({ ...formData, amount: String(val) })}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ví *</label>
                <Select
                  value={formData.walletId}
                  onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                  className="w-full"
                >
                  <option value="">Chọn ví...</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>
              
              {/* Expense Type Selection - Radio buttons, mutually exclusive */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Loại chi *</label>
                  {!showExpenseTypeSelector && (
                    <button
                      type="button"
                      onClick={() => setShowExpenseTypeSelector(true)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Đổi loại
                    </button>
                  )}
                </div>
                
                {showExpenseTypeSelector ? (
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                      <input
                        type="radio"
                        name="expenseType"
                        checked={!formData.isAds && formData.expenseMode === 'common'}
                        onChange={() => setFormData({ 
                          ...formData, 
                          isAds: false,
                          expenseMode: 'common',
                          projectId: '',
                        })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">Chi phí chung</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                      <input
                        type="radio"
                        name="expenseType"
                        checked={formData.isAds}
                        onChange={() => {
                          // Auto-set marketing category for ads
                          setFormData({ 
                            ...formData, 
                            isAds: true,
                            expenseMode: 'project',
                            expenseCategoryId: marketingCategoryId,
                            adsPlatform: formData.adsPlatform || 'FACEBOOK',
                          });
                        }}
                        className="rounded text-purple-600"
                      />
                      <span className="text-sm">Chi quảng cáo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                      <input
                        type="radio"
                        name="expenseType"
                        checked={!formData.isAds && formData.expenseMode === 'project'}
                        onChange={() => setFormData({ 
                          ...formData, 
                          isAds: false,
                          expenseMode: 'project',
                        })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">Chi cho đơn hàng</span>
                    </label>
                  </div>
                ) : (
                  // Show selected type summary
                  <div className="p-3 bg-gray-50 border rounded">
                    {formData.isAds ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600 font-medium">Chi quảng cáo</span>
                          {formData.adsPlatform && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                              {formData.adsPlatform === 'FACEBOOK' && 'Facebook'}
                              {formData.adsPlatform === 'TIKTOK' && 'TikTok'}
                              {formData.adsPlatform === 'GOOGLE' && 'Google'}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : formData.expenseMode === 'common' ? (
                      <span className="text-blue-600 font-medium">Chi phí chung</span>
                    ) : (
                      <span className="text-blue-600 font-medium">Chi cho đơn hàng</span>
                    )}
                  </div>
                )}
              </div>

              {/* Ads Platform dropdown - shown when isAds is true */}
              {formData.isAds && (
                <div>
                  <label className="block text-sm font-medium mb-1">Nền tảng *</label>
                  <Select
                    value={formData.adsPlatform}
                    onChange={(e) => {
                    const platform = e.target.value;
                    const autoNote = buildAutoNote(platform);
                    setFormData({ 
                      ...formData, 
                      adsPlatform: platform,
                      note: noteTouched ? formData.note : autoNote,
                    });
                  }}
                    className="w-full"
                  >
                    <option value="">Chọn nền tảng...</option>
                    <option value="FACEBOOK">Facebook Ads</option>
                    <option value="TIKTOK">TikTok Ads</option>
                    <option value="GOOGLE">Google Ads</option>
                  </Select>
                </div>
              )}

              {/* Danh mục chi - shown when NOT ads */}
              {!formData.isAds && (
              <div>
                <label className="block text-sm font-medium mb-1">Danh mục chi *</label>
                <Select
                  value={formData.expenseCategoryId}
                  onChange={(e) => setFormData({ ...formData, expenseCategoryId: e.target.value })}
                  className="w-full"
                >
                  <option value="">Chọn danh mục...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              )}

              {/* Đơn hàng - shown when expenseMode is project and NOT ads */}
              {!formData.isAds && formData.expenseMode === 'project' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Đơn hàng *</label>
                  <Select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Chọn đơn hàng...</option>
                    {getDisplayProjects().map((p: any) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </Select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={2}
                  value={formData.note}
                  onChange={(e) => { setNoteTouched(true); setFormData({ ...formData, note: e.target.value }); }}
                  placeholder="Ghi chú..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                <Button onClick={handleSave}>
                  {editingItem ? 'Cập nhật' : 'Tạo mới'}
                </Button>
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
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa?</h3>
              <p className="text-gray-500 mb-4">
                Bạn có chắc muốn xóa phiếu chi này?
                <br />Phiếu chi sẽ bị ẩn và có thể khôi phục sau.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Hủy</Button>
                <Button variant="destructive" onClick={() => handleDelete(showConfirmDelete)}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Draft Modal */}
      {showDraftModal && draftData && (
        <AiDraftModal
          draft={draftData}
          wallets={wallets}
          incomeCategories={[]}
          expenseCategories={categories}
          projects={projects}
          onConfirm={handleCreateFromDraft}
          onClose={() => {
            setShowDraftModal(false);
            setDraftData(null);
          }}
        />
      )}
    </div>
  );
}

