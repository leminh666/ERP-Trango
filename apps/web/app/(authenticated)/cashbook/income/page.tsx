// @ts-nocheck - Pre-existing type errors with Transaction.project property
// This is a legacy type mismatch between frontend types and backend response
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/common/date-input';
import { Select } from '@/components/ui/select';
import { Transaction, Wallet, IncomeCategory, TransactionType, VisualType, Project } from '@tran-go-hoang-gia/shared';
import { Plus, Search, Edit, Trash2, RotateCcw, AlertCircle, Calendar, DollarSign, Mic, Filter, Link } from 'lucide-react';
import { VisualRenderer } from '@/components/visual-selector';
import { VoiceInputButton } from '@/components/voice-input-button';
import { AiDraftModal } from '@/components/ai-draft-modal';
import { MoneyInput } from '@/components/common/money-input';
import { apiClient } from '@/lib/api';
import { useDefaultTimeFilter } from '@/lib/hooks';
import { useToast } from '@/components/toast-provider';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { buildIncomeCreatePayload, buildIncomeUpdatePayload } from '@/lib/transactions';
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
  note: string;
  missingFields: string[];
}

export default function IncomePage() {
  const { token, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    walletId: '',
    incomeCategoryId: '',
    note: '',
    hasProject: false,
    projectId: '',
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState<Transaction | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const { timeFilter, setTimeFilter } = useDefaultTimeFilter();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState({
    walletId: 'all',
    categoryId: 'all',
    search: '',
    showDeleted: false,
  });

  const fetchData = async () => {
    try {
      setBanner(null);
      const txParams = new URLSearchParams();
      txParams.append('type', 'INCOME');
      txParams.append('from', timeFilter.from);
      txParams.append('to', timeFilter.to);
      if (filters.walletId !== 'all') txParams.append('walletId', filters.walletId);
      if (filters.categoryId !== 'all') txParams.append('incomeCategoryId', filters.categoryId);
      if (filters.showDeleted) txParams.append('includeDeleted', 'true');

      const txData = await apiClient<any[]>(`/transactions?${txParams.toString()}`);
      setTransactions(txData);

      const walletData = await apiClient<any[]>('/wallets');
      setWallets(walletData.filter((w: any) => !w.deletedAt));

      const catData = await apiClient<any[]>('/income-categories');
      setCategories(catData.filter((c: any) => !c.deletedAt));

      const projectData = await apiClient<any[]>('/projects?stage=WON');
      setProjects(projectData.filter((p: any) => !p.deletedAt));
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
    if (!formData.incomeCategoryId) errors.push('Danh mục thu');
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.push('Số tiền');
    if (formData.hasProject && !formData.projectId) errors.push('Đơn hàng');
    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const url = editingItem
        ? `/transactions/${editingItem.id}`
        : '/transactions';
      const method = editingItem ? 'PUT' : 'POST';

      const payload = editingItem
        ? buildIncomeUpdatePayload({
            type: 'INCOME',
            date: formData.date,
            amount: formData.amount,
            walletId: formData.walletId,
            incomeCategoryId: formData.incomeCategoryId,
            projectId: formData.hasProject ? formData.projectId : null,
            note: formData.note,
            isCommonCost: false,
          })
        : buildIncomeCreatePayload({
            type: 'INCOME',
            date: formData.date,
            amount: formData.amount,
            walletId: formData.walletId,
            incomeCategoryId: formData.incomeCategoryId,
            projectId: formData.hasProject ? formData.projectId : null,
            note: formData.note,
            isCommonCost: false,
          });

      const result = await apiClient(url, {
        method,
        body: JSON.stringify(payload),
      });

      setShowModal(false);
      resetForm();
      // Optimistic update for new items
      if (!editingItem && result) {
        setTransactions(prev => [result as Transaction, ...prev]);
      }
      // Refresh all related data
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
      showSuccess('Thành công', 'Đã xóa phiếu thu');
    } catch (error: any) {
      console.error('Failed to delete:', error);
      if (error.message?.includes('không tồn tại') || error.status === 404) {
        showError('Đã xóa trước đó', 'Phiếu thu này đã được xóa');
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
          modeHint: 'income',
        }),
      });

      setDraftData({
        type: 'INCOME',
        date: result.date || new Date().toISOString().split('T')[0],
        amount: result.amount || 0,
        walletId: result.walletId || '',
        incomeCategoryId: result.incomeCategoryId || '',
        projectId: result.projectId || '',
        note: result.note || transcript,
        missingFields: result.missingFields || [],
      });
      setShowDraftModal(true);
    } catch (error) {
      console.error('Failed to parse transcript:', error);
      showError('Lỗi', 'Không thể phân tích giọng nói. Vui lòng nhập thủ công.');
    }
  };

  const handleCreateFromDraft = async (draft: DraftData) => {
    try {
      const payload = buildIncomeCreatePayload({
        type: 'INCOME',
        date: draft.date,
        amount: draft.amount,
        walletId: draft.walletId,
        incomeCategoryId: draft.incomeCategoryId || '',
        projectId: draft.projectId,
        note: draft.note,
        isCommonCost: false,
      });

      await apiClient('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowDraftModal(false);
      setDraftData(null);
      fetchData();
      showSuccess('Thành công', 'Tạo phiếu thu thành công!');
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
      incomeCategoryId: '',
      note: '',
      hasProject: false,
      projectId: '',
    });
    setFormErrors([]);
    setEditingItem(null);
  };

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
    if (editingItem?.project?.id) {
      const projectInList = baseProjects.find((p: any) => p.id === editingItem.project.id);
      if (!projectInList) {
        return [
          { id: editingItem.project.id, code: editingItem.project.code || '', name: editingItem.project.name || '' },
          ...baseProjects,
        ];
      }
    }
    return baseProjects;
  };

  const openEdit = (item: Transaction) => {
    setEditingItem(item);
    setFormData({
      date: new Date(item.date).toISOString().split('T')[0],
      amount: item.amount.toString(),
      walletId: item.walletId,
      incomeCategoryId: item.incomeCategoryId || '',
      note: item.note || '',
      // Fix: Backend trả về project object, dùng item.project?.id thay vì item.projectId
      hasProject: !!item.project?.id,
      projectId: item.project?.id || '',
    });
    setFormErrors([]);
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
        title="Phiếu thu"
        description="Quản lý các khoản thu"
        action={
          <div className="flex gap-2">
            <VoiceInputButton mode="income" onTranscript={handleVoiceTranscript} />
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Tạo phiếu thu</Button>
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
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <MetricCardTitle label="Tổng thu" metricKey={METRIC_KEYS.incomeSlip_totalAmount} className="text-sm text-green-700 mb-1" />
                <p className="text-lg font-bold text-green-800">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <MetricCardTitle label="Số phiếu" metricKey={METRIC_KEYS.incomeSlip_count} className="text-sm text-gray-500 mb-1" />
            <p className="text-2xl font-semibold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <MetricCardTitle label="Trung bình" metricKey={METRIC_KEYS.incomeSlip_average} className="text-sm text-gray-500 mb-1" />
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
            Chưa có phiếu thu nào
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
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
                    <td className="p-3 text-sm font-medium text-green-600">{formatCurrency(Number(item.amount))}</td>
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
                            visualType={(item.incomeCategory?.visualType || VisualType.ICON) as VisualType}
                            iconKey={item.incomeCategory?.iconKey || 'trending-up'}
                            imageUrl={item.incomeCategory?.imageUrl || null}
                            color={item.incomeCategory?.color || '#10b981'}
                            size="sm"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm truncate">{item.incomeCategory?.name}</span>
                          {/* Badge Đơn hàng gộp vào Danh mục */}
                          {item.project?.id && (
                            <span className="inline-flex items-center gap-1 mt-0.5">
                              <Link className="h-3 w-3 text-blue-500" />
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
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
              <CardTitle>{editingItem ? 'Sửa phiếu thu' : 'Tạo phiếu thu mới'}</CardTitle>
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
                <DateInput
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
              <div>
                <label className="block text-sm font-medium mb-1">Danh mục thu *</label>
                <Select
                  value={formData.incomeCategoryId}
                  onChange={(e) => setFormData({ ...formData, incomeCategoryId: e.target.value })}
                  className="w-full"
                >
                  <option value="">Chọn danh mục...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasProject}
                    onChange={(e) => setFormData({ ...formData, hasProject: e.target.checked, projectId: '' })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Gắn đơn hàng</span>
                </label>
              </div>
              {formData.hasProject && (
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
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
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
                Bạn có chắc muốn xóa phiếu thu này?
                <br />Phiếu thu sẽ bị ẩn và có thể khôi phục sau.
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
          incomeCategories={categories}
          expenseCategories={[]}
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

