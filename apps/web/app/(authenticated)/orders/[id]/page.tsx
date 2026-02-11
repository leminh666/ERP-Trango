'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderItem, Product, ProductVariant, ProjectSummary, Transaction, Wallet, ExpenseCategory, IncomeCategory, VisualType } from '@tran-go-hoang-gia/shared';
import { Plus, Edit, Trash2, RotateCcw, AlertCircle, Image as ImageIcon, Calculator, DollarSign, Building2, ArrowDownCircle, ArrowUpCircle, Factory, ShoppingCart, X, ArrowLeft, TrendingUp, TrendingDown, ClipboardCheck, Percent } from 'lucide-react';
import { ProductPicker } from '@/components/product-picker';
import { VisualRenderer } from '@/components/visual-selector';
import { WorkOrdersTable } from '@/components/work-orders-table';
import { PurchaseOrdersSummary } from '@/components/purchase-orders-summary';
import { MoneyInput } from '@/components/common/money-input';
import { buildIncomeCreatePayload, buildExpenseCreatePayload } from '@/lib/transactions';
import { apiClient, fetchJson, resolveProductImage, getToken } from '@/lib/api';
import { useToast } from '@/components/toast-provider';
import { KpiTooltip } from '@/components/ui/info-tooltip';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { MetricInfo } from '@/components/ui/metric-info';
import { cn, formatCurrency } from '@/lib/utils';

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [workshopJobs, setWorkshopJobs] = useState<any[]>([]); // Workshop jobs for this order
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [workshops, setWorkshops] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<OrderItem | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountForm, setDiscountForm] = useState({ discountAmount: '0' });
  // Workshop Job Discount state
  const [showWorkshopJobDiscountModal, setShowWorkshopJobDiscountModal] = useState(false);
  const [workshopJobDiscountForm, setWorkshopJobDiscountForm] = useState({
    jobId: '',
    jobCode: '',
    amount: 0,
    discountAmount: 0,
  });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [confirmDeleteTransaction, setConfirmDeleteTransaction] = useState<Transaction | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showWorkshopJobModal, setShowWorkshopJobModal] = useState(false);
  const [showWorkshopProductPicker, setShowWorkshopProductPicker] = useState(false);
  const [workshopJobItemIndex, setWorkshopJobItemIndex] = useState<number | null>(null);

  // Acceptance state
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [acceptanceItems, setAcceptanceItems] = useState<Array<{
    orderItemId: string;
    productName: string;
    productCode: string | null;
    unit: string;
    qty: number;
    unitPrice: number; // Original unit price from order item
    amount: number;
    acceptedQty: number;
    unitPriceOverride: number | null; // Override from acceptance (if edited)
    note: string | null;
  }>>([]);
  const [deletedAcceptanceIds, setDeletedAcceptanceIds] = useState<Set<string>>(new Set());
  const [acceptanceLoading, setAcceptanceLoading] = useState(false);
  const [savingAcceptance, setSavingAcceptance] = useState(false);

  // Item form state
  const [formData, setFormData] = useState<{
    product: Product | null;
    variant: ProductVariant | null;
    name: string;
    unit: string;
    qty: string;
    unitPrice: string;
    note: string;
  }>({
    product: null,
    variant: null,
    name: '',
    unit: '',
    qty: '0',
    unitPrice: '0',
    note: '',
  });

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    walletId: '',
    expenseCategoryId: '',
    note: '',
  });

  // Income form state
  const [incomeForm, setIncomeForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    walletId: '',
    incomeCategoryId: '',
    note: '',
  });

  // Edit Income form state
  const [editIncomeForm, setEditIncomeForm] = useState({
    date: '',
    amount: '',
    walletId: '',
    incomeCategoryId: '',
    note: '',
  });

  // Edit Expense form state
  const [editExpenseForm, setEditExpenseForm] = useState({
    date: '',
    amount: '',
    walletId: '',
    expenseCategoryId: '',
    note: '',
  });

  const [workshopJobForm, setWorkshopJobForm] = useState({
    workshopId: '',
    amount: '',
    title: '',
    note: '',
    startDate: new Date().toISOString().split('T')[0], // Default to today
  });

  // Workshop job items state (for prefill from order items)
  const [workshopJobItems, setWorkshopJobItems] = useState<Array<{
    name: string;
    unit: string;
    qty: string;
    unitPrice: string;
  }>>([]);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchItems();
      fetchTransactions();
      fetchWorkshopJobs();
      fetchDropdowns();
    }
  }, [id, showDeleted]);

  const fetchProject = async () => {
    try {
      const data = await apiClient<any>(`/projects/${id}`);
      setProject(data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const data = await apiClient<OrderItem[]>(`/projects/${id}/items?includeDeleted=${showDeleted}`);
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await apiClient<any>(`/projects/${id}/summary`);
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  useEffect(() => {
    // Only fetch summary when id changes or after significant updates
    // Avoid refetching on every items change to prevent lag
    if (id) {
      fetchSummary();
    }
  }, [id]);

  const fetchTransactions = async () => {
    try {
      const data = await apiClient<Transaction[]>(`/transactions?projectId=${id}`);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const fetchWorkshopJobs = async () => {
    try {
      const data = await apiClient<any[]>(`/workshop-jobs?projectId=${id}`);
      setWorkshopJobs(data);
    } catch (error) {
      console.error('Failed to fetch workshop jobs:', error);
    }
  };

  // Handle update discount
  const handleUpdateDiscount = async () => {
    const discountAmount = parseFloat(discountForm.discountAmount) || 0;
    if (discountAmount < 0) {
      showError('Lỗi', 'Chiết khấu không được âm');
      return;
    }

    try {
      await apiClient(`/projects/${id}/discount`, {
        method: 'PUT',
        body: JSON.stringify({ discountAmount }),
      });

      // Update local project state
      setProject((prev: any) => ({
        ...prev,
        discountAmount,
      }));
      setShowDiscountModal(false);
      showSuccess('Thành công', 'Cập nhật chiết khấu thành công!');
    } catch (error) {
      console.error('Failed to update discount:', error);
      showError('Lỗi', 'Không thể cập nhật chiết khấu');
    }
  };

  // Handle update workshop job discount
  const handleUpdateWorkshopJobDiscount = async () => {
    const discountAmount = parseFloat(workshopJobDiscountForm.discountAmount?.toString() || '0') || 0;
    if (discountAmount < 0) {
      showError('Lỗi', 'Chiết khấu không được âm');
      return;
    }
    if (discountAmount > workshopJobDiscountForm.amount) {
      showError('Lỗi', 'Chiết khấu không được lớn hơn tổng tiền');
      return;
    }

    try {
      await apiClient(`/workshop-jobs/${workshopJobDiscountForm.jobId}`, {
        method: 'PUT',
        body: JSON.stringify({ discountAmount }),
      });

      // Refresh workshop jobs to get updated data
      const jobsData = await apiClient<any[]>(`/workshop-jobs?projectId=${id}`);
      setWorkshopJobs(jobsData);
      setShowWorkshopJobDiscountModal(false);
      showSuccess('Thành công', 'Cập nhật chiết khấu phiếu gia công thành công!');
    } catch (error) {
      console.error('Failed to update workshop job discount:', error);
      showError('Lỗi', 'Không thể cập nhật chiết khấu');
    }
  };

  // Open workshop job discount modal
  const openWorkshopJobDiscountModal = (job: { id: string; code: string; amount: number; discountAmount: number }) => {
    setWorkshopJobDiscountForm({
      jobId: job.id,
      jobCode: job.code,
      amount: job.amount,
      discountAmount: job.discountAmount,
    });
    setShowWorkshopJobDiscountModal(true);
  };

  // Open discount modal
  const openDiscountModal = () => {
    setDiscountForm({
      discountAmount: (project?.discountAmount || 0).toString(),
    });
    setShowDiscountModal(true);
  };

  const fetchDropdowns = async () => {
    try {
      const walletData = await apiClient<Wallet[]>('/wallets');
      setWallets(walletData.filter((w: Wallet) => !w.deletedAt));

      const expenseData = await apiClient<ExpenseCategory[]>('/expense-categories');
      setExpenseCategories(expenseData.filter((c: ExpenseCategory) => !c.deletedAt));

      const incomeData = await apiClient<IncomeCategory[]>('/income-categories');
      setIncomeCategories(incomeData.filter((c: IncomeCategory) => !c.deletedAt));

      const workshopData = await apiClient<any[]>('/workshops');
      setWorkshops(
        workshopData
          .filter((w: any) => !w.deletedAt)
          .map((w: any) => ({ id: w.id, name: w.name })),
      );
    } catch (error) {
      console.error('Failed to fetch dropdowns:', error);
    }
  };

  // Acceptance functions
  const fetchAcceptance = async () => {
    setAcceptanceLoading(true);
    try {
      const data = await apiClient<any[]>(`/projects/${id}/acceptance`);
      // Initialize with existing acceptance data or defaults
      const mappedData = items
        .filter(item => !item.deletedAt)
        .map((item) => {
          const acceptance = data.find((a) => a.orderItemId === item.id);
          const acceptedQty = acceptance ? Number(acceptance.acceptedQty) : 0;
          const unitPriceOverride = acceptance?.unitPriceOverride !== undefined && acceptance?.unitPriceOverride !== null
            ? Number(acceptance.unitPriceOverride)
            : null;
          return {
            orderItemId: item.id,
            productName: item.name,
            productCode: item.product?.code || null,
            unit: item.unit,
            qty: Number(item.qty),
            unitPrice: Number(item.unitPrice),
            amount: Number(item.amount),
            // Acceptance data
            acceptedQty: acceptedQty,
            rawAcceptedQty: acceptedQty === 0 ? '0' : acceptedQty.toString(), // Raw string for editing
            unitPriceOverride: unitPriceOverride,
            rawUnitPrice: unitPriceOverride === null ? '' : unitPriceOverride.toString(), // Raw string for VND input
            note: acceptance?.note || null,
          };
        });
      setAcceptanceItems(mappedData);
      return mappedData;
    } catch (error) {
      console.error('Failed to fetch acceptance data:', error);
      showError('Lỗi', 'Không thể tải dữ liệu nghiệm thu');
      return null;
    } finally {
      setAcceptanceLoading(false);
    }
  };

  const openAcceptanceModal = async () => {
    setDeletedAcceptanceIds(new Set()); // Reset deleted IDs
    await fetchAcceptance();
    setShowAcceptanceModal(true);
  };

  // Calculate computed amount for an acceptance item
  const computeAcceptedAmount = (acceptedQty: number, unitPriceOverride: number | null, originalUnitPrice: number) => {
    const effectiveUnitPrice = unitPriceOverride !== null ? unitPriceOverride : originalUnitPrice;
    return acceptedQty * effectiveUnitPrice;
  };

  // Calculate line total for an order item based on acceptance data
  // If acceptedQty exists, use it instead of qty
  // If acceptedUnitPrice exists, use it instead of unitPrice
  const computeLineTotal = useCallback((item: OrderItem) => {
    const effectiveQty = item.acceptedQty !== null ? item.acceptedQty : item.qty;
    const effectivePrice = item.acceptedUnitPrice !== null ? item.acceptedUnitPrice : item.unitPrice;
    return effectiveQty * effectivePrice;
  }, []);

  // Calculate effective unit price for display
  const computeEffectiveUnitPrice = useCallback((item: OrderItem) => {
    return item.acceptedUnitPrice !== null ? item.acceptedUnitPrice : item.unitPrice;
  }, []);

  // Handle delete/restore acceptance item
  const handleDeleteAcceptanceItem = (index: number) => {
    const newItems = [...acceptanceItems];
    const deletedId = newItems[index].orderItemId;
    newItems.splice(index, 1);
    setAcceptanceItems(newItems);
    setDeletedAcceptanceIds(prev => new Set(prev).add(deletedId));
  };

  const handleRestoreAcceptanceItem = (index: number) => {
    // This would require storing deleted items, but for simplicity we'll just reload
    // A more complete implementation would store deleted items in state
  };

  // Handle acceptance field changes (store raw string for decimal editing)
  const handleAcceptanceChange = (index: number, field: 'acceptedQty' | 'unitPriceOverride' | 'note', value: string | number | null) => {
    const newItems = [...acceptanceItems];
    if (field === 'acceptedQty') {
      // Store raw string value to preserve user input (e.g., "13," or "13.1")
      const strValue = (value as string) || '0';
      // Sanitize: only allow digits, dots, and commas
      const sanitized = strValue.replace(/[^\d.,]/g, '');
      newItems[index] = { ...newItems[index], rawAcceptedQty: sanitized };
    } else if (field === 'unitPriceOverride') {
      // Store raw string for VND input (preserve dots for display)
      const strValue = (value as string) || '';
      // Sanitize: allow digits, dots, and commas
      const sanitized = strValue.replace(/[^\d.,]/g, '');
      newItems[index] = { ...newItems[index], rawUnitPrice: sanitized };
    } else {
      newItems[index] = { ...newItems[index], note: value as string };
    }
    setAcceptanceItems(newItems);
  };

  // Handle acceptance blur (normalize and convert to number)
  const handleAcceptanceBlur = (index: number, field: 'acceptedQty' | 'unitPriceOverride', value: string) => {
    const newItems = [...acceptanceItems];
    if (field === 'acceptedQty') {
      const rawValue = value || '0';
      // Normalize: replace commas with dots, limit to 2 decimal places
      const normalized = rawValue.replace(/,/g, '.');
      const parts = normalized.split('.');
      let finalValue = parts[0];
      if (parts[1] && parts[1].length > 0) {
        finalValue += '.' + parts[1].slice(0, 2); // Max 2 decimal places
      }
      const numValue = parseFloat(finalValue) || 0;
      // Update both raw (for display) and number (for saving)
      newItems[index] = {
        ...newItems[index],
        acceptedQty: numValue,
        rawAcceptedQty: numValue === 0 ? '0' : numValue.toString()
      };
    } else if (field === 'unitPriceOverride') {
      // Parse VND format: remove all dots/commas and convert to number
      const rawValue = value || '0';
      const cleaned = rawValue.replace(/[.,]/g, '');
      const numValue = parseFloat(cleaned) || 0;
      newItems[index] = {
        ...newItems[index],
        unitPriceOverride: numValue > 0 ? numValue : null,
        rawUnitPrice: numValue > 0 ? numValue.toString() : ''
      };
    }
    setAcceptanceItems(newItems);
  };

  const handleSaveAcceptance = async () => {
    // Validate: SL_NT is required and >= 0
    const validationErrors: Record<number, string> = {};
    for (let i = 0; i < acceptanceItems.length; i++) {
      const item = acceptanceItems[i];
      if (item.acceptedQty < 0) {
        validationErrors[i] = 'Số lượng nghiệm thu không được âm';
      }
      // Validate unitPriceOverride if provided
      if (item.unitPriceOverride !== null && item.unitPriceOverride < 0) {
        validationErrors[i] = 'Đơn giá không được âm';
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      showError('Lỗi dữ liệu', Object.values(validationErrors)[0]);
      return;
    }

    // Optional: Validate acceptedQty <= qty (can be removed if business doesn't require)
    // const hasError = acceptanceItems.some(item => item.acceptedQty > item.qty);
    // if (hasError) {
    //   showError('Lỗi dữ liệu', 'Số lượng nghiệm thu không được vượt quá số lượng kế hoạch');
    //   return;
    // }

    setSavingAcceptance(true);
    try {
      // Normalize all acceptedQty before saving (handle cases where user typed but didn't blur)
      const normalizedItems = acceptanceItems.map(item => {
        const rawValue = item.rawAcceptedQty || item.acceptedQty.toString();
        const normalized = rawValue.replace(/,/g, '.');
        const parts = normalized.split('.');
        let finalValue = parts[0];
        if (parts[1] && parts[1].length > 0) {
          finalValue += '.' + parts[1].slice(0, 2);
        }
        return {
          ...item,
          acceptedQty: parseFloat(finalValue) || 0,
        };
      });

      const payload = {
        items: normalizedItems.map(item => ({
          orderItemId: item.orderItemId,
          acceptedQty: item.acceptedQty,
          unitPrice: item.unitPriceOverride,
          note: item.note || undefined,
        })),
      };

      await apiClient(`/projects/${id}/acceptance`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      showSuccess('Thành công', 'Đã lưu nghiệm thu');
      setShowAcceptanceModal(false);
      // Refetch acceptance data and update main items state with acceptedQty
      const acceptanceData = await fetchAcceptance();
      if (acceptanceData) {
        // Update main items state with acceptedQty from acceptance data
        setItems((prevItems: OrderItem[]) =>
          prevItems.map((item) => {
            const acceptance = acceptanceData.find((a: any) => a.orderItemId === item.id);
            return acceptance
              ? {
                  ...item,
                  acceptedQty: Number(acceptance.acceptedQty) || 0,
                  acceptedUnitPrice: acceptance.unitPriceOverride !== null ? Number(acceptance.unitPriceOverride) : null,
                }
              : item;
          })
        );
      }
    } catch (error: any) {
      console.error('Failed to save acceptance:', error);
      showError('Lỗi', error.message || 'Không thể lưu nghiệm thu');
    } finally {
      setSavingAcceptance(false);
    }
  };

  const handleSelectProduct = (value: { product: Product | null; variant: ProductVariant | null }) => {
    const { product, variant } = value;
    if (product) {
      setFormData({
        ...formData,
        product: product,
        variant: variant || null,
        name: variant?.name || product.name,
        unit: product.unit,
        qty: '0', // Reset qty to 0 when selecting product
        unitPrice: variant?.price?.toString() || product.defaultSalePrice?.toString() || '0',
      });
    } else {
      setFormData({
        ...formData,
        product: null,
        variant: null,
        name: '',
        unit: '',
        qty: '0',
        unitPrice: '0',
      });
    }
    setShowProductPicker(false);
  };

  // Handle selecting product for workshop job
  const handleWorkshopSelectProduct = (value: { product: Product | null; variant: ProductVariant | null }) => {
    const { product, variant } = value;
    if (product && workshopJobItemIndex !== null) {
      const newItems = [...workshopJobItems];
      newItems[workshopJobItemIndex] = {
        name: variant?.name || product.name,
        unit: product.unit,
        unitPrice: variant?.price?.toString() || product.defaultSalePrice?.toString() || '0',
        qty: newItems[workshopJobItemIndex]?.qty || '0',
      };
      setWorkshopJobItems(newItems);
    } else if (product && workshopJobItemIndex === null) {
      // Add as new item
      setWorkshopJobItems([...workshopJobItems, {
        name: variant?.name || product.name,
        unit: product.unit,
        unitPrice: variant?.price?.toString() || product.defaultSalePrice?.toString() || '0',
        qty: '0',
      }]);
    }
    setShowWorkshopProductPicker(false);
    setWorkshopJobItemIndex(null);
  };

  const handleSaveItem = async () => {
    if (!formData.name.trim()) {
      showError('Thiếu thông tin', 'Vui lòng nhập tên hạng mục/sản phẩm');
      return;
    }
    if (!formData.unit.trim()) {
      showError('Thiếu thông tin', 'Vui lòng nhập đơn vị tính');
      return;
    }
    const qty = parseFloat(formData.qty) || 0;
    const unitPrice = parseFloat(formData.unitPrice);
    if (unitPrice < 0) {
      showError('Lỗi dữ liệu', 'Đơn giá không được âm');
      return;
    }

    try {
      const url = editingItem
        ? `/projects/${id}/items/${editingItem.id}`
        : `/projects/${id}/items`;
      const method = editingItem ? 'PUT' : 'POST';

      await apiClient(url, {
        method,
        body: JSON.stringify({
          productId: formData.product?.id || null,
          variantId: formData.variant?.id || null,
          name: formData.name,
          unit: formData.unit,
          qty: qty,
          unitPrice: unitPrice,
          note: formData.note,
        }),
      });

      setShowModal(false);
      resetForm();
      fetchItems();
      fetchSummary();
      showSuccess('Thành công', editingItem ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
    } catch (error) {
      console.error('Failed to save:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  const handleSaveExpense = async () => {
    const errors: string[] = [];
    if (!expenseForm.walletId) errors.push('Ví');
    if (!expenseForm.expenseCategoryId) errors.push('Danh mục chi');
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) errors.push('Số tiền');
    if (errors.length > 0) {
      showError('Thiếu thông tin', 'Vui lòng nhập: ' + errors.join(', '));
      return;
    }

    try {
      const payload = buildExpenseCreatePayload({
        type: 'EXPENSE',
        date: expenseForm.date,
        amount: expenseForm.amount,
        walletId: expenseForm.walletId,
        expenseCategoryId: expenseForm.expenseCategoryId,
        projectId: id,
        note: expenseForm.note,
        isCommonCost: false,
      });

      const data = await apiClient('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowExpenseModal(false);
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        walletId: '',
        expenseCategoryId: '',
        note: '',
      });
      fetchTransactions();
      showSuccess('Thành công', 'Tạo phiếu chi thành công!');
    } catch (error) {
      console.error('Failed to save expense:', error);
      showError('Lỗi', 'Không thể tạo phiếu chi');
    }
  };

  const handleSaveIncome = async () => {
    const errors: string[] = [];
    if (!incomeForm.walletId) errors.push('Ví');
    if (!incomeForm.incomeCategoryId) errors.push('Danh mục thu');
    if (!incomeForm.amount || parseFloat(incomeForm.amount) <= 0) errors.push('Số tiền');
    if (errors.length > 0) {
      showError('Thiếu thông tin', 'Vui lòng nhập: ' + errors.join(', '));
      return;
    }

    try {
      const payload = buildIncomeCreatePayload({
        type: 'INCOME',
        date: incomeForm.date,
        amount: incomeForm.amount,
        walletId: incomeForm.walletId,
        incomeCategoryId: incomeForm.incomeCategoryId,
        projectId: id,
        note: incomeForm.note,
        isCommonCost: false,
      });

      const data = await apiClient('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowIncomeModal(false);
      setIncomeForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        walletId: '',
        incomeCategoryId: '',
        note: '',
      });
      fetchTransactions();
      showSuccess('Thành công', 'Tạo phiếu thu thành công!');
    } catch (error) {
      console.error('Failed to save income:', error);
      showError('Lỗi', 'Không thể tạo phiếu thu');
    }
  };

  const handleUpdateIncome = async () => {
    if (!editingTransaction) return;

    const errors: string[] = [];
    if (!editIncomeForm.walletId) errors.push('Ví');
    if (!editIncomeForm.incomeCategoryId) errors.push('Danh mục thu');
    if (!editIncomeForm.amount || parseFloat(editIncomeForm.amount) <= 0) errors.push('Số tiền');
    if (errors.length > 0) {
      showError('Thiếu thông tin', 'Vui lòng nhập: ' + errors.join(', '));
      return;
    }

    try {
      const payload: any = {
        date: editIncomeForm.date,
        amount: parseFloat(editIncomeForm.amount),
        walletId: editIncomeForm.walletId,
        incomeCategoryId: editIncomeForm.incomeCategoryId,
        note: editIncomeForm.note,
      };

      await apiClient(`/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setEditingTransaction(null);
      setShowIncomeModal(false);
      fetchTransactions();
      showSuccess('Thành công', 'Cập nhật phiếu thu thành công!');
    } catch (error: any) {
      console.error('Failed to update income:', error);
      showError('Lỗi', error.message || 'Không thể cập nhật phiếu thu');
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingTransaction) return;

    const errors: string[] = [];
    if (!editExpenseForm.walletId) errors.push('Ví');
    if (!editExpenseForm.expenseCategoryId) errors.push('Danh mục chi');
    if (!editExpenseForm.amount || parseFloat(editExpenseForm.amount) <= 0) errors.push('Số tiền');
    if (errors.length > 0) {
      showError('Thiếu thông tin', 'Vui lòng nhập: ' + errors.join(', '));
      return;
    }

    try {
      const payload: any = {
        date: editExpenseForm.date,
        amount: parseFloat(editExpenseForm.amount),
        walletId: editExpenseForm.walletId,
        expenseCategoryId: editExpenseForm.expenseCategoryId,
        note: editExpenseForm.note,
      };

      await apiClient(`/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setEditingTransaction(null);
      setShowExpenseModal(false);
      fetchTransactions();
      showSuccess('Thành công', 'Cập nhật phiếu chi thành công!');
    } catch (error: any) {
      console.error('Failed to update expense:', error);
      showError('Lỗi', error.message || 'Không thể cập nhật phiếu chi');
    }
  };

  const handleDeleteTransaction = async () => {
    if (!confirmDeleteTransaction) return;

    try {
      await apiClient(`/transactions/${confirmDeleteTransaction.id}`, {
        method: 'DELETE',
      });

      setConfirmDeleteTransaction(null);
      fetchTransactions();
      showSuccess('Thành công', 'Xóa phiếu giao dịch thành công!');
    } catch (error: any) {
      console.error('Failed to delete transaction:', error);
      showError('Lỗi', error.message || 'Không thể xóa phiếu giao dịch');
    }
  };

  const openEditIncome = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditIncomeForm({
      date: new Date(tx.date).toISOString().split('T')[0],
      amount: tx.amount.toString(),
      walletId: tx.walletId,
      incomeCategoryId: tx.incomeCategoryId || '',
      note: tx.note || '',
    });
    setShowIncomeModal(true);
  };

  const openEditExpense = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditExpenseForm({
      date: new Date(tx.date).toISOString().split('T')[0],
      amount: tx.amount.toString(),
      walletId: tx.walletId,
      expenseCategoryId: tx.expenseCategoryId || '',
      note: tx.note || '',
    });
    setShowExpenseModal(true);
  };

  const handleDelete = async (item: OrderItem) => {
    try {
      await apiClient(`/projects/${id}/items/${item.id}`, { method: 'DELETE' });
      setShowConfirmDelete(null);
      fetchItems();
      fetchSummary();
      showSuccess('Thành công', 'Xóa thành công!');
    } catch (error) {
      console.error('Failed to delete:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  const handleRestore = async (itemId: string) => {
    try {
      await apiClient(`/projects/${id}/items/${itemId}/restore`, { method: 'POST' });
      fetchItems();
      fetchSummary();
      showSuccess('Thành công', 'Khôi phục thành công!');
    } catch (error) {
      console.error('Failed to restore:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  const openCreateItem = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: OrderItem) => {
    setEditingItem(item);
    setFormData({
      product: item.product || null,
      variant: null, // OrderItem may have variant in future
      name: item.name,
      unit: item.unit,
      qty: Number(item.qty) === 0 ? '0' : item.qty.toString(),
      unitPrice: Number(item.unitPrice) === 0 ? '0' : item.unitPrice.toString(),
      note: item.note || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      product: null,
      variant: null,
      name: '',
      unit: '',
      qty: '0',
      unitPrice: '0',
      note: '',
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateAmount = () => {
    const qty = parseFloat(formData.qty) || 0;
    const unitPrice = parseFloat(formData.unitPrice) || 0;
    return qty * unitPrice;
  };

  // Safe array access with fallback to empty array
  const transactionsArray = Array.isArray(transactions) ? transactions : [];
  const itemsArray = Array.isArray(items) ? items : [];
  const workshopJobsArray = Array.isArray(workshopJobs) ? workshopJobs : [];

  const incomeTransactions = transactionsArray.filter(t => t.type === 'INCOME' && !t.deletedAt);
  
  // Calculate total income from transactions (for income section display and KPI)
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Calculate totals for new KPI formula:
  // - Tổng ĐH = Σ(SLNT × Đơn giá) - Chiết khấu
  // - Tổng chi ĐH = Tổng phiếu gia công + Phiếu chi gắn đơn (KHÔNG bao gồm phiếu chi gia công)
  // - Lợi nhuận = Tổng ĐH - Tổng chi ĐH
  // - Đã thanh toán = Σ Phiếu thu gắn đơn (hợp lệ)
  // - Công nợ KH = Tổng ĐH - Đã thanh toán (clamp về 0 nếu âm)

  // Memoize items total calculation to avoid recalculating on every render
  const itemsTotal = useMemo(() => {
    return itemsArray.filter(i => !i.deletedAt).reduce((sum, i) => sum + computeLineTotal(i), 0);
  }, [itemsArray, computeLineTotal]);

  const discountAmount = useMemo(() => Number(project?.discountAmount) || 0, [project?.discountAmount]);
  const orderTotal = useMemo(() => Math.max(0, itemsTotal - discountAmount), [itemsTotal, discountAmount]);

  // Memoize workshop jobs total calculation
  const workshopJobTotal = useMemo(() => {
    return workshopJobsArray.filter(j => !j.deletedAt).reduce((sum, j) => {
      const jobAmount = Number(j.amount || 0);
      const jobDiscount = Number(j.discountAmount || 0);
      return sum + Math.max(0, jobAmount - jobDiscount);
    }, 0);
  }, [workshopJobsArray]);

  // Calculate expenses for this order EXCLUDING workshop payments (phiếu chi gia công)
  // "Phiếu chi gia công" = expenses with workshopJobId set
  // We only want: expenses with projectId AND WITHOUT workshopJobId
  const nonWorkshopExpenses = transactionsArray.filter(t => 
    t.type === 'EXPENSE' && 
    !t.deletedAt &&
    t.projectId && // gắn đơn hàng
    !t.workshopJobId // KHÔNG phải phiếu chi gia công
  );

  // Calculate total expense = workshop jobs (after discount) + expenses excluding workshop payments - This is "Tổng chi ĐH"
  const totalExpense = workshopJobTotal + nonWorkshopExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Calculate profit = orderTotal - totalExpense
  const profit = orderTotal - totalExpense;

  // Calculate paid amount = sum of income transactions for this order - This is "Đã thanh toán"
  const totalPaid = totalIncome;

  // Calculate customer debt = orderTotal - totalPaid (clamp to 0 if negative)
  const customerDebt = Math.max(0, orderTotal - totalPaid);

  // Render

  const handleCreateWorkshopJob = async () => {
    const errors: string[] = [];
    if (!workshopJobForm.workshopId) errors.push('Xưởng gia công');
    if (!workshopJobForm.amount || parseFloat(workshopJobForm.amount) <= 0) errors.push('Số tiền');

    if (errors.length > 0) {
      showError('Thiếu thông tin', 'Vui lòng nhập: ' + errors.join(', '));
      return;
    }

    try {
      const created = await apiClient('/workshop-jobs', {
        method: 'POST',
        body: {
          projectId: id,
          workshopId: workshopJobForm.workshopId,
          amount: parseFloat(workshopJobForm.amount),
          title: workshopJobForm.title || undefined,
          note: workshopJobForm.note || undefined,
          startDate: new Date(workshopJobForm.startDate).toISOString(), // Use form's startDate
        },
      });

      showSuccess('Thành công', 'Đã tạo phiếu gia công thành công!');
      setShowWorkshopJobModal(false);
      setWorkshopJobForm({
        workshopId: '',
        amount: '',
        title: '',
        note: '',
        startDate: new Date().toISOString().split('T')[0], // Reset to today
      });
      router.push(`/workshops/jobs/${(created as any).id}`);
      fetchWorkshopJobs(); // Refresh workshop jobs list for KPI
    } catch (error: any) {
      console.error('Failed to create workshop job:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra khi tạo phiếu gia công');
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Chi tiết đơn hàng" description="Đang tải..." />
        <Card><CardContent className="py-8 text-center">Đang tải...</CardContent></Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <PageHeader title="Chi tiết đơn hàng" description="Không tìm thấy dự án" />
        <Card><CardContent className="py-8 text-center">Dự án không tồn tại</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push('/orders/list')} className="mb-3 pl-0 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Quay lại danh sách đơn hàng</span>
        <span className="sm:hidden">Quay lại</span>
      </Button>

      {/* Order Header */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-4 sm:p-6">
          {/* Grid layout: Mobile 1 col, Tablet 2 cols (order-first), Desktop 1fr 1.2fr */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1.2fr] gap-4 lg:gap-6">
            {/* Order Info - First on mobile/tablet, Left on desktop */}
            <div className="order-1 md:order-1 lg:order-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-center gap-2 flex-wrap mb-2 sm:mb-3">
                <h1 className="text-lg sm:text-2xl font-bold truncate">{project.name || 'Chi tiết đơn hàng'}</h1>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium shrink-0">
                  {project.code}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                  project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                  project.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {project.status}
                </span>
              </div>

              {/* Customer Info */}
              {project.customer && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">{project.customer.name}</span>
                  </span>
                  {project.customer.phone && (
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400">|</span>
                      {project.customer.phone}
                    </span>
                  )}
                </div>
              )}

              {/* Address & Deadline */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                {project.address && (
                  <span className="flex items-center gap-1 truncate">
                    {project.address}
                  </span>
                )}
                {project.deadline && (
                  <span className="flex items-center gap-1 text-blue-600 shrink-0">
                    Hẹn: {formatDate(project.deadline)}
                  </span>
                )}
              </div>

              {/* Action Buttons - Wrap on mobile, horizontal scroll on iPad */}
              <div className="flex flex-wrap gap-2 md:flex-nowrap md:overflow-x-auto md:whitespace-nowrap md:pb-1">
                {/* Thu - Green (success) */}
                <Button size="sm" onClick={() => setShowIncomeModal(true)} className="shrink-0 h-9 px-3 bg-green-600 hover:bg-green-700 border-green-600">
                  <ArrowDownCircle className="h-4 w-4 mr-1" />
                  <span className="hidden xs:inline">+ Phiếu thu</span>
                  <span className="xs:hidden">Thu</span>
                </Button>
                {/* Chi - Red (danger) */}
                <Button size="sm" onClick={() => setShowExpenseModal(true)} className="shrink-0 h-9 px-3 bg-red-600 hover:bg-red-700 border-red-600">
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  <span className="hidden xs:inline">+ Phiếu chi</span>
                  <span className="xs:hidden">Chi</span>
                </Button>
                {/* Chiết khấu - Purple */}
                <Button size="sm" variant="outline" onClick={openDiscountModal} className="shrink-0 h-9 px-3 border-purple-300 text-purple-700 hover:bg-purple-50">
                  <Percent className="h-4 w-4 mr-1" />
                  <span className="hidden xs:inline">Chiết khấu</span>
                  <span className="xs:hidden">CK</span>
                </Button>
                {/* GC - Purple/Indigo (distinct) */}
                <Button size="sm" variant="outline" onClick={() => setShowWorkshopJobModal(true)} className="shrink-0 h-9 px-3 border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                  <Factory className="h-4 w-4 mr-1" />
                  <span className="hidden xs:inline">+ Phiếu GC</span>
                  <span className="xs:hidden">GC</span>
                </Button>
              </div>
            </div>

            {/* KPI Cards - 5 KPIs grid - Responsive layout */}
            {/* Order 2 on mobile/tablet, Right on desktop */}
            <div className="order-2 md:order-2 lg:order-2 min-w-0">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3 w-full">
              {/* KPI 1: Tổng ĐH */}
              <div className="flex flex-col h-full text-center p-2 sm:p-2.5 bg-green-50 rounded-lg overflow-hidden">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mx-auto mb-1 shrink-0" />
                <div className="flex items-center justify-center gap-1 flex-nowrap min-h-[18px]">
                  <p className="text-[10px] sm:text-xs text-green-700 font-medium truncate">Tổng ĐH</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.order_summary_totalIncome}
                    iconSize={10}
                    iconClassName="text-green-600/70 hover:text-green-700 cursor-help shrink-0"
                  />
                </div>
                <p className="font-bold text-green-700 text-[10px] sm:text-xs break-words leading-tight my-1 flex-1">{formatCurrency(orderTotal)}</p>
                {discountAmount > 0 && (
                  <p className="text-[9px] sm:text-[10px] text-gray-500 shrink-0">- {formatCurrency(discountAmount)} CK</p>
                )}
              </div>
              {/* KPI 2: Tổng chi ĐH */}
              <div className="flex flex-col h-full text-center p-2 sm:p-2.5 bg-red-50 rounded-lg overflow-hidden">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mx-auto mb-1 shrink-0" />
                <div className="flex items-center justify-center gap-1 flex-nowrap min-h-[18px]">
                  <p className="text-[10px] sm:text-xs text-red-700 font-medium truncate">Tổng chi ĐH</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.order_summary_totalExpense}
                    iconSize={10}
                    iconClassName="text-red-600/70 hover:text-red-700 cursor-help shrink-0"
                  />
                </div>
                <p className="font-bold text-red-700 text-[10px] sm:text-xs break-words leading-tight my-1 flex-1">{formatCurrency(totalExpense)}</p>
              </div>
              {/* KPI 3: Lợi nhuận ĐH */}
              <div className="flex flex-col h-full text-center p-2 sm:p-2.5 bg-blue-50 rounded-lg overflow-hidden">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mx-auto mb-1 shrink-0" />
                <div className="flex items-center justify-center gap-1 flex-nowrap min-h-[18px]">
                  <p className="text-[10px] sm:text-xs text-blue-700 font-medium truncate">Lợi nhuận ĐH</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.order_summary_profit}
                    iconSize={10}
                    iconClassName="text-blue-600/70 hover:text-blue-700 cursor-help shrink-0"
                  />
                </div>
                <p className={cn('font-bold text-[10px] sm:text-xs break-words leading-tight my-1 flex-1', profit >= 0 ? 'text-blue-700' : 'text-red-700')}>
                  {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                </p>
              </div>
              {/* KPI 4: Đã thanh toán */}
              <div className="flex flex-col h-full text-center p-2 sm:p-2.5 bg-emerald-50 rounded-lg overflow-hidden">
                <ArrowDownCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mx-auto mb-1 shrink-0" />
                <div className="flex items-center justify-center gap-1 flex-nowrap min-h-[18px]">
                  <p className="text-[10px] sm:text-xs text-emerald-700 font-medium truncate">Đã thanh toán</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.order_summary_paid}
                    iconSize={10}
                    iconClassName="text-emerald-600/70 hover:text-emerald-700 cursor-help shrink-0"
                  />
                </div>
                <p className="font-bold text-emerald-700 text-[10px] sm:text-xs break-words leading-tight my-1 flex-1">{formatCurrency(totalPaid)}</p>
              </div>
              {/* KPI 5: Công nợ khách hàng */}
              <div className="flex flex-col h-full text-center p-2 sm:p-2.5 bg-orange-50 rounded-lg overflow-hidden">
                <ArrowUpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 mx-auto mb-1 shrink-0" />
                <div className="flex items-center justify-center gap-1 flex-nowrap min-h-[18px]">
                  <p className="text-[10px] sm:text-xs text-orange-700 font-medium truncate">Công nợ KH</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.order_summary_customerDebt}
                    iconSize={10}
                    iconClassName="text-orange-600/70 hover:text-orange-700 cursor-help shrink-0"
                  />
                </div>
                <p className={cn('font-bold text-[10px] sm:text-xs break-words leading-tight my-1 flex-1', customerDebt >= 0 ? 'text-orange-700' : 'text-red-700')}>
                  {formatCurrency(customerDebt)}
                </p>
              </div>
            </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs with horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:overflow-visible md:px-0 md:mx-0">
        <Tabs defaultValue="info" className="w-full min-w-0">
          <TabsList className="mb-4 inline-flex h-10 w-auto min-w-full md:w-auto md:inline-flex whitespace-nowrap">
            <TabsTrigger value="info" className="px-3 py-2">Thông tin chung</TabsTrigger>
            <TabsTrigger value="production" className="px-3 py-2">Sản xuất</TabsTrigger>
            <TabsTrigger value="purchase" className="px-3 py-2">Mua hàng</TabsTrigger>
            <TabsTrigger value="income" className="px-3 py-2">Phiếu thu</TabsTrigger>
            <TabsTrigger value="expense" className="px-3 py-2">Phiếu chi</TabsTrigger>
          </TabsList>

        <TabsContent value="info">
          <div className="space-y-4">
            {/* Basic Project Info - Compact Layout */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Thông tin dự án</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Mã dự án</span>
                    <span className="font-medium text-sm">{project.code}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Trạng thái</span>
                    <span className="font-medium text-sm">{project.status}</span>
                  </div>
                  {project.customer ? (
                    <>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Khách hàng</span>
                        <span className="font-medium text-sm">{project.customer.name}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Điện thoại</span>
                        <span className="font-medium text-sm">{project.customer.phone || '-'}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Địa chỉ thi công</span>
                    <span className="font-medium text-sm">{project.address || 'Chưa có'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Lịch hẹn thi công</span>
                    <span className="font-medium text-sm">{formatDate(project.deadline)}</span>
                  </div>
                  <div className="flex flex-col sm:col-span-3">
                    <span className="text-xs text-muted-foreground">Ghi chú</span>
                    <span className="font-medium text-sm">{project.note || 'Không có'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Summary - Moved to Thông tin chung */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Hạng mục/ Sản phẩm
                </CardTitle>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDeleted}
                      onChange={(e) => setShowDeleted(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Hiện đã xóa</span>
                  </label>
                  <Button onClick={openCreateItem}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    <span className="hidden xs:inline">Thêm SP</span>
                    <span className="xs:hidden">SP</span>
                  </Button>
                  {/* Nghiệm thu - Teal/Green (distinct from primary) */}
                  <Button variant="outline" onClick={openAcceptanceModal} className="h-9 px-3 border-teal-300 text-teal-700 hover:bg-teal-50 shrink-0">
                    <ClipboardCheck className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">NT</span>
                    <span className="xs:hidden">NT</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {items.filter(i => !i.deletedAt).length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    Chưa có hạng mục nào. Nhấp "Thêm SP" để bắt đầu.
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 px-4 md:overflow-visible md:mx-0 md:px-0">
                    {/* Mobile: Card view - hidden on desktop */}
                    <div className="md:hidden space-y-3">
                      {items.filter(i => !i.deletedAt).map((item) => (
                        <div key={item.id} className="bg-white border rounded-lg p-3 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.product?.imageUrl ? (
                                <img
                                  src={resolveProductImage(item.product.imageUrl)}
                                  alt={item.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-8 h-8 object-contain rounded border shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                  <span className="text-sm">📦</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{item.name}</p>
                                {item.product && (
                                  <p className="text-xs text-gray-500">{item.product.code}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(item); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-gray-50 rounded p-2">
                              <span className="text-gray-500 block">ĐVT</span>
                              <span className="font-medium">{item.unit}</span>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <span className="text-gray-500 block">SLNT</span>
                              <span className="font-medium">
                                {item.acceptedQty !== null ? (
                                  <span className="text-green-700">{Number(item.acceptedQty).toLocaleString()}</span>
                                ) : (
                                  Number(item.qty).toLocaleString()
                                )}
                              </span>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <span className="text-gray-500 block">Thành tiền</span>
                              <span className="font-medium text-blue-600">{formatCurrency(computeLineTotal(item))}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table - hidden on mobile */}
                    <table className="hidden md:table w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-3 font-medium">Sản phẩm / Hạng mục</th>
                          <th className="text-left p-3 font-medium">ĐVT</th>
                          <th className="text-right p-3 font-medium">SLNT</th>
                          <th className="text-right p-3 font-medium">Đơn giá</th>
                          <th className="text-right p-3 font-medium">Thành tiền</th>
                          <th className="text-left p-3 font-medium">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className={`border-b ${item.deletedAt ? 'opacity-50 bg-gray-50' : ''}`}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {item.product?.imageUrl ? (
                                  <img
                                    src={resolveProductImage(item.product.imageUrl)}
                                    alt={item.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-6 h-6 object-contain rounded border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                    }}
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                                    <span className="text-xs">📦</span>
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  {item.product && (
                                    <p className="text-xs text-gray-500">{item.product.code}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">{item.unit}</td>
                            <td className="p-3 text-right">
                              {item.acceptedQty !== null ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-medium text-green-700">{Number(item.acceptedQty).toLocaleString()}</span>
                                  {Number(item.acceptedQty) !== item.qty && (
                                    <span className="text-xs text-gray-400 line-through">
                                      {Number(item.qty).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span>{item.qty}</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {item.acceptedUnitPrice !== null && item.acceptedUnitPrice !== item.unitPrice ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-medium text-blue-600">{formatCurrency(computeEffectiveUnitPrice(item))}</span>
                                  <span className="text-xs text-gray-400 line-through">
                                    {formatCurrency(item.unitPrice)}
                                  </span>
                                </div>
                              ) : (
                                <span>{formatCurrency(item.unitPrice)}</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {formatCurrency(computeLineTotal(item))}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                {item.deletedAt ? (
                                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }}>
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(item); }}>
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td colSpan={4} className="p-3 text-right font-medium">
                            Tổng cộng (trước CK):
                            {Number(project?.discountAmount) > 0 && (
                              <span className="text-xs text-gray-500 ml-2">(SLNT × Đơn giá)</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-blue-600">
                            {formatCurrency(items.filter(i => !i.deletedAt).reduce((sum, i) => sum + computeLineTotal(i), 0))}
                          </td>
                          <td></td>
                        </tr>
                        {Number(project?.discountAmount) > 0 && (
                          <tr className="bg-orange-50/50">
                            <td colSpan={4} className="p-3 text-right font-medium text-orange-600">
                              Chiết khấu:
                            </td>
                            <td className="p-3 text-right font-medium text-orange-600">
                              -{formatCurrency(Number(project.discountAmount))}
                            </td>
                            <td></td>
                          </tr>
                        )}
                        <tr className="bg-blue-50">
                          <td colSpan={4} className="p-3 text-right font-bold text-blue-700">
                            Tổng tiền sau CK:
                          </td>
                          <td className="p-3 text-right font-bold text-blue-700">
                            {formatCurrency(Math.max(0, items.filter(i => !i.deletedAt).reduce((sum, i) => sum + computeLineTotal(i), 0) - Number(project?.discountAmount || 0)))}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Sản xuất - Hiển thị phiếu gia công */}
        <TabsContent value="production">
          <WorkOrdersTable
            projectId={id}
            projectCode={project?.code || ''}
            projectName={project?.name || ''}
            workshops={workshops}
            orderItems={items}
            onEditDiscount={openWorkshopJobDiscountModal}
          />
        </TabsContent>

        {/* Tab Mua hàng - Hiển thị chứng từ mua hàng */}
        <TabsContent value="purchase">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Mua hàng / Vật tư</span>
            </div>
            <PurchaseOrdersSummary projectId={id} token={getToken() || ''} />
          </div>
        </TabsContent>

        {/* Tab Phiếu thu - Thu tiền từ khách */}
        <TabsContent value="income">
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={() => setShowIncomeModal(true)}>
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                + Phiếu thu
              </Button>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-green-600">Thu khách</CardTitle>
                {incomeTransactions.length > 0 && (
                  <span className="text-sm font-medium text-green-600">
                    Tổng: {formatCurrency(totalIncome)}
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {incomeTransactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Chưa có phiếu thu nào</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-3 text-sm font-medium">Ngày</th>
                          <th className="text-left p-3 text-sm font-medium">Số tiền</th>
                          <th className="text-left p-3 text-sm font-medium">Ví</th>
                          <th className="text-left p-3 text-sm font-medium">Danh mục</th>
                          <th className="text-left p-3 text-sm font-medium">Ghi chú</th>
                          <th className="text-left p-3 text-sm font-medium w-24">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incomeTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/transactions/${tx.id}`)}>
                            <td className="p-3">{formatDate(tx.date)}</td>
                            <td className="p-3 font-medium text-green-600">{formatCurrency(Number(tx.amount))}</td>
                            <td className="p-3">{tx.wallet?.name || '-'}</td>
                            <td className="p-3">{tx.incomeCategory?.name || '-'}</td>
                            <td className="p-3 text-gray-500">{tx.note || '-'}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="ghost" onClick={() => openEditIncome(tx)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteTransaction(tx)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-green-50">
                          <td colSpan={3} className="p-3 text-right font-medium">Tổng thu:</td>
                          <td colSpan={3} className="p-3 font-bold text-green-600 text-right">
                            {formatCurrency(totalIncome)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Phiếu chi - Chi phí công trình */}
        <TabsContent value="expense">
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={() => setShowExpenseModal(true)}>
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                + Phiếu chi
              </Button>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-red-600">Chi phí công trình</CardTitle>
                {nonWorkshopExpenses.length > 0 && (
                  <span className="text-sm font-medium text-red-600">
                    Tổng: {formatCurrency(totalExpense)}
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {nonWorkshopExpenses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Chưa có phiếu chi nào</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-3 text-sm font-medium">Ngày</th>
                          <th className="text-left p-3 text-sm font-medium">Số tiền</th>
                          <th className="text-left p-3 text-sm font-medium">Ví</th>
                          <th className="text-left p-3 text-sm font-medium">Danh mục</th>
                          <th className="text-left p-3 text-sm font-medium">Ghi chú</th>
                          <th className="text-left p-3 text-sm font-medium w-24">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nonWorkshopExpenses.map((tx) => (
                          <tr key={tx.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/transactions/${tx.id}`)}>
                            <td className="p-3">{formatDate(tx.date)}</td>
                            <td className="p-3 font-medium text-red-600">{formatCurrency(Number(tx.amount))}</td>
                            <td className="p-3">{tx.wallet?.name || '-'}</td>
                            <td className="p-3">{tx.expenseCategory?.name || '-'}</td>
                            <td className="p-3 text-gray-500">{tx.note || '-'}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="ghost" onClick={() => openEditExpense(tx)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteTransaction(tx)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-red-50">
                          <td colSpan={3} className="p-3 text-right font-medium">Tổng chi:</td>
                          <td colSpan={3} className="p-3 font-bold text-red-600 text-right">
                            {formatCurrency(totalExpense)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>

      {/* Add/Edit Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{editingItem ? 'Sửa hạng mục' : 'Thêm hạng mục mới'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Loại</label>
                <div
                  className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowProductPicker(true)}
                >
                  {formData.product ? (
                    <div className="flex items-center gap-2">
                      {formData.product.imageUrl && (
                        <img
                          src={resolveProductImage(formData.product.imageUrl)}
                          alt={formData.product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-8 h-8 object-contain rounded border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-product.png';
                          }}
                        />
                      )}
                      <div>
                        <p className="font-medium">{formData.product.name}</p>
                        <p className="text-xs text-gray-500">{formData.product.unit}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                        <span className="text-lg">✏️</span>
                      </div>
                      <p className="text-gray-500">Nhấp để chọn sản phẩm hoặc nhập tùy chỉnh</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tên hạng mục *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Đơn vị tính *</label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="m2, cái, bộ..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Số lượng</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.qty || '0'}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Đơn giá (VND)</label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.unitPrice || '0'}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">Thành tiền (ước tính):</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(calculateAmount())}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <Input
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Nhập ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                <Button onClick={handleSaveItem}>
                  {editingItem ? 'Cập nhật' : 'Thêm mới'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Picker Modal */}
      {showProductPicker && (
        <ProductPicker
          value={{ product: formData.product, variant: formData.variant || null }}
          onChange={handleSelectProduct}
          onClose={() => setShowProductPicker(false)}
        />
      )}

      {/* Create/Edit Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{editingTransaction ? 'Sửa phiếu chi' : 'Tạo phiếu chi cho đơn hàng'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-700">
                      {editingTransaction ? 'Đơn hàng gắn với phiếu chi' : 'Đơn hàng hiện tại'}
                    </p>
                    <p className="text-sm text-blue-600">{project.code} - {project.name}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ngày *</label>
                <Input
                  type="date"
                  value={editingTransaction ? editExpenseForm.date : expenseForm.date}
                  onChange={(e) => editingTransaction
                    ? setEditExpenseForm({ ...editExpenseForm, date: e.target.value })
                    : setExpenseForm({ ...expenseForm, date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VND) *</label>
                <Input
                  type="number"
                  value={editingTransaction ? editExpenseForm.amount : expenseForm.amount}
                  onChange={(e) => editingTransaction
                    ? setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })
                    : setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ví *</label>
                <Select
                  value={editingTransaction ? editExpenseForm.walletId : expenseForm.walletId}
                  onChange={(e) => editingTransaction
                    ? setEditExpenseForm({ ...editExpenseForm, walletId: e.target.value })
                    : setExpenseForm({ ...expenseForm, walletId: e.target.value })
                  }
                  className="w-full"
                >
                  <option value="">Chọn ví...</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Danh mục chi *</label>
                <Select
                  value={editingTransaction ? editExpenseForm.expenseCategoryId : expenseForm.expenseCategoryId}
                  onChange={(e) => editingTransaction
                    ? setEditExpenseForm({ ...editExpenseForm, expenseCategoryId: e.target.value })
                    : setExpenseForm({ ...expenseForm, expenseCategoryId: e.target.value })
                  }
                  className="w-full"
                >
                  <option value="">Chọn danh mục...</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <Input
                  value={editingTransaction ? editExpenseForm.note : expenseForm.note}
                  onChange={(e) => editingTransaction
                    ? setEditExpenseForm({ ...editExpenseForm, note: e.target.value })
                    : setExpenseForm({ ...expenseForm, note: e.target.value })
                  }
                  placeholder="Nhập ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowExpenseModal(false);
                  setEditingTransaction(null);
                }}>Hủy</Button>
                <Button onClick={editingTransaction ? handleUpdateExpense : handleSaveExpense}>
                  {editingTransaction ? 'Cập nhật' : 'Tạo phiếu chi'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{editingTransaction ? 'Sửa phiếu thu' : 'Tạo phiếu thu cho đơn hàng'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editingTransaction && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-700">Đơn hàng hiện tại</p>
                      <p className="text-sm text-green-600">{project.code} - {project.name}</p>
                    </div>
                  </div>
                </div>
              )}

              {editingTransaction && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-700">Phiếu thu gắn với đơn hàng</p>
                      <p className="text-sm text-blue-600">{project.code} - {project.name}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Ngày *</label>
                <Input
                  type="date"
                  value={editingTransaction ? editIncomeForm.date : incomeForm.date}
                  onChange={(e) => editingTransaction
                    ? setEditIncomeForm({ ...editIncomeForm, date: e.target.value })
                    : setIncomeForm({ ...incomeForm, date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VND) *</label>
                <Input
                  type="number"
                  value={editingTransaction ? editIncomeForm.amount : incomeForm.amount}
                  onChange={(e) => editingTransaction
                    ? setEditIncomeForm({ ...editIncomeForm, amount: e.target.value })
                    : setIncomeForm({ ...incomeForm, amount: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ví *</label>
                <Select
                  value={editingTransaction ? editIncomeForm.walletId : incomeForm.walletId}
                  onChange={(e) => editingTransaction
                    ? setEditIncomeForm({ ...editIncomeForm, walletId: e.target.value })
                    : setIncomeForm({ ...incomeForm, walletId: e.target.value })
                  }
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
                  value={editingTransaction ? editIncomeForm.incomeCategoryId : incomeForm.incomeCategoryId}
                  onChange={(e) => editingTransaction
                    ? setEditIncomeForm({ ...editIncomeForm, incomeCategoryId: e.target.value })
                    : setIncomeForm({ ...incomeForm, incomeCategoryId: e.target.value })
                  }
                  className="w-full"
                >
                  <option value="">Chọn danh mục...</option>
                  {incomeCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <Input
                  value={editingTransaction ? editIncomeForm.note : incomeForm.note}
                  onChange={(e) => editingTransaction
                    ? setEditIncomeForm({ ...editIncomeForm, note: e.target.value })
                    : setIncomeForm({ ...incomeForm, note: e.target.value })
                  }
                  placeholder="Nhập ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowIncomeModal(false);
                  setEditingTransaction(null);
                }}>Hủy</Button>
                <Button onClick={editingTransaction ? handleUpdateIncome : handleSaveIncome}>
                  {editingTransaction ? 'Cập nhật' : 'Tạo phiếu thu'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Delete Transaction Modal */}
      {confirmDeleteTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="py-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa?</h3>
              <p className="text-gray-500 mb-4">
                Bạn có chắc muốn xóa phiếu {confirmDeleteTransaction.type === 'INCOME' ? 'thu' : 'chi'} này?
                <br />
                Số tiền: {formatCurrency(Number(confirmDeleteTransaction.amount))}
                <br />
                Giao dịch sẽ bị ẩn và có thể khôi phục sau.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setConfirmDeleteTransaction(null)}>Hủy</Button>
                <Button variant="destructive" onClick={handleDeleteTransaction}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Delete Item Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="py-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa?</h3>
              <p className="text-gray-500 mb-4">
                Bạn có chắc muốn xóa hạng mục <strong>{showConfirmDelete.name}</strong>?
                <br />
                Hạng mục sẽ bị ẩn và có thể khôi phục sau.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Hủy</Button>
                <Button variant="destructive" onClick={() => handleDelete(showConfirmDelete)}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Workshop Job Modal */}
      {showWorkshopJobModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Tạo phiếu gia công cho đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-700">Đơn hàng hiện tại</p>
                    <p className="text-sm text-orange-600">
                      {project.code} - {project.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Products Table - Prefilled from order items */}
              {items.filter(i => !i.deletedAt).length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Sản phẩm/Hạng mục gia công</label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2 font-medium w-48">Hạng mục</th>
                          <th className="text-left p-2 font-medium w-20">ĐVT</th>
                          <th className="text-left p-2 font-medium w-24">Đơn giá</th>
                          <th className="text-left p-2 font-medium w-24">SLNT</th>
                          <th className="text-left p-2 font-medium w-28">Thành tiền</th>
                          <th className="text-left p-2 font-medium w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {workshopJobItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-gray-500">
                              Chưa có sản phẩm. Nhấp "Chọn từ danh mục" hoặc "Nhập tay".
                            </td>
                          </tr>
                        ) : (
                          workshopJobItems.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setWorkshopJobItemIndex(index);
                                      setShowWorkshopProductPicker(true);
                                    }}
                                    className="h-8 w-8 p-0"
                                    title="Chọn từ danh mục"
                                  >
                                    <span className="text-lg">📦</span>
                                  </Button>
                                  <Input
                                    value={item.name}
                                    onChange={(e) => {
                                      const newItems = [...workshopJobItems];
                                      newItems[index].name = e.target.value;
                                      setWorkshopJobItems(newItems);
                                    }}
                                    placeholder="Tên hạng mục"
                                    className="h-8"
                                  />
                                </div>
                              </td>
                              <td className="p-2">
                                <Input
                                  value={item.unit}
                                  onChange={(e) => {
                                    const newItems = [...workshopJobItems];
                                    newItems[index].unit = e.target.value;
                                    setWorkshopJobItems(newItems);
                                  }}
                                  placeholder="ĐVT"
                                  className="h-8"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const newItems = [...workshopJobItems];
                                    newItems[index].unitPrice = e.target.value;
                                    setWorkshopJobItems(newItems);
                                  }}
                                  placeholder="0"
                                  className="h-8"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.qty || '0'}
                                  onChange={(e) => {
                                    const newItems = [...workshopJobItems];
                                    newItems[index].qty = e.target.value;
                                    setWorkshopJobItems(newItems);
                                  }}
                                  placeholder="0"
                                  className="h-8"
                                />
                              </td>
                              <td className="p-2 text-right font-medium">
                                {((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                              </td>
                              <td className="p-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setWorkshopJobItems(workshopJobItems.filter((_, i) => i !== index));
                                  }}
                                  className="text-red-500 p-1 h-8 w-8"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="p-2 border-t bg-gray-50">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setWorkshopJobItemIndex(null);
                            setShowWorkshopProductPicker(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Chọn từ danh mục
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setWorkshopJobItems([...workshopJobItems, { name: '', unit: '', qty: '0', unitPrice: '0' }]);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Nhập tay
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Xưởng gia công *</label>
                <Select
                  value={workshopJobForm.workshopId}
                  onChange={(e) =>
                    setWorkshopJobForm({ ...workshopJobForm, workshopId: e.target.value })
                  }
                  className="w-full"
                >
                  <option value="">Chọn xưởng...</option>
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={workshopJobForm.startDate}
                  onChange={(e) =>
                    setWorkshopJobForm({ ...workshopJobForm, startDate: e.target.value })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền gia công (VND) *</label>
                <Input
                  type="number"
                  value={workshopJobForm.amount}
                  onChange={(e) =>
                    setWorkshopJobForm({ ...workshopJobForm, amount: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tiêu đề</label>
                <Input
                  value={workshopJobForm.title}
                  onChange={(e) =>
                    setWorkshopJobForm({ ...workshopJobForm, title: e.target.value })
                  }
                  placeholder="Ví dụ: Gia công trần gỗ tầng 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <Input
                  value={workshopJobForm.note}
                  onChange={(e) =>
                    setWorkshopJobForm({ ...workshopJobForm, note: e.target.value })
                  }
                  placeholder="Nhập ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowWorkshopJobModal(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreateWorkshopJob}>Tạo phiếu gia công</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Picker for Workshop Job */}
      {showWorkshopProductPicker && (
        <ProductPicker
          value={{ product: null, variant: null }}
          onChange={handleWorkshopSelectProduct}
          onClose={() => {
            setShowWorkshopProductPicker(false);
            setWorkshopJobItemIndex(null);
          }}
          onCreateNew={() => {
            // For now, just close and let user add manually
            setShowWorkshopProductPicker(false);
          }}
        />
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-purple-600" />
                Chiết khấu đơn hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-700">Tổng tiền hàng:</span>
                  <span className="font-medium text-purple-700">{formatCurrency(itemsTotal)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền chiết khấu (VND)</label>
                <MoneyInput
                  value={discountForm.discountAmount}
                  onChange={(val) => setDiscountForm({ discountAmount: val.toString() })}
                  max={itemsTotal}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tổng tiền sau chiết khấu: <strong>{formatCurrency(Math.max(0, itemsTotal - (parseFloat(discountForm.discountAmount) || 0)))}</strong>
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDiscountModal(false)}>
                  Hủy
                </Button>
                <Button onClick={handleUpdateDiscount}>
                  Lưu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workshop Job Discount Modal */}
      {showWorkshopJobDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-orange-600" />
                Chiết khấu phiếu gia công
              </CardTitle>
              <p className="text-sm text-gray-500">Phiếu: {workshopJobDiscountForm.jobCode}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-700">Tổng tiền gia công:</span>
                  <span className="font-medium text-orange-700">{formatCurrency(workshopJobDiscountForm.amount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền chiết khấu (VND)</label>
                <MoneyInput
                  value={workshopJobDiscountForm.discountAmount?.toString() || '0'}
                  onChange={(val) => setWorkshopJobDiscountForm(prev => ({ ...prev, discountAmount: val }))}
                  max={workshopJobDiscountForm.amount}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tổng tiền sau chiết khấu: <strong>{formatCurrency(Math.max(0, workshopJobDiscountForm.amount - (workshopJobDiscountForm.discountAmount || 0)))}</strong>
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowWorkshopJobDiscountModal(false)}>
                  Hủy
                </Button>
                <Button onClick={handleUpdateWorkshopJobDiscount}>
                  Lưu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Acceptance Modal - Full screen on mobile, modal on iPad/desktop */}
      {showAcceptanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <Card className={`
            w-full sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col
            sm:rounded-lg rounded-t-2xl sm:min-h-auto min-h-[85vh]
          `}>
            {/* Header */}
            <CardHeader className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">Nghiệm thu {project?.code}</CardTitle>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Nhập số liệu nghiệm thu</p>
                </div>
                <button
                  onClick={() => setShowAcceptanceModal(false)}
                  className="sm:hidden p-2 -mr-2 -mt-2 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
              {acceptanceLoading ? (
                <div className="py-8 text-center text-gray-500">Đang tải...</div>
              ) : (
                <div className="flex-1 overflow-auto p-4 sm:p-6">
                  {/* Mobile: Card rows */}
                  <div className="sm:hidden space-y-3">
                    {acceptanceItems.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p>Không có hạng mục nào</p>
                      </div>
                    ) : (
                      acceptanceItems.map((item, index) => {
                        const computedAmount = computeAcceptedAmount(
                          item.acceptedQty,
                          item.unitPriceOverride,
                          item.unitPrice
                        );
                        return (
                          <div key={item.orderItemId} className="bg-white border rounded-lg p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{item.productName}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  {item.productCode && <span>{item.productCode}</span>}
                                  <span>•</span>
                                  <span>ĐVT: {item.unit}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteAcceptanceItem(index)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0 ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">SL NT (*)</label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.rawAcceptedQty || '0'}
                                  onChange={(e) => handleAcceptanceChange(index, 'acceptedQty', e.target.value)}
                                  onBlur={(e) => handleAcceptanceBlur(index, 'acceptedQty', e.target.value)}
                                  placeholder="0"
                                  className="h-10 text-center font-medium"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Đơn giá (đ)</label>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={item.rawUnitPrice !== undefined ? item.rawUnitPrice : (item.unitPriceOverride !== null ? item.unitPriceOverride.toString() : '')}
                                  onChange={(e) => handleAcceptanceChange(index, 'unitPriceOverride', e.target.value)}
                                  onBlur={(e) => handleAcceptanceBlur(index, 'unitPriceOverride', e.target.value)}
                                  placeholder={formatCurrency(item.unitPrice)}
                                  className="h-10 text-right font-medium"
                                />
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t flex justify-end">
                              <span className="text-sm">
                                <span className="text-gray-500">Thành tiền: </span>
                                <span className="font-semibold text-green-700">{formatCurrency(computedAmount)}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Desktop: Table view */}
                  <div className="hidden sm:block border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-3 font-medium w-72">Sản phẩm / Hạng mục</th>
                          <th className="text-center p-3 font-medium w-24 bg-blue-50/50">SL NT (*)</th>
                          <th className="text-left p-3 font-medium w-32">Đơn giá (đ)</th>
                          <th className="text-right p-3 font-medium w-32">Thành tiền</th>
                          <th className="text-center p-3 font-medium w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {acceptanceItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="h-8 w-8 text-gray-300" />
                                <p>Không có hạng mục nào để nghiệm thu</p>
                                <p className="text-xs text-gray-400">Tất cả đã được loại khỏi danh sách</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          acceptanceItems.map((item, index) => {
                            const computedAmount = computeAcceptedAmount(
                              item.acceptedQty,
                              item.unitPriceOverride,
                              item.unitPrice
                            );
                            return (
                              <tr key={item.orderItemId} className="border-b group hover:bg-gray-50/50">
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium">{item.productName}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      {item.productCode && (
                                        <span>{item.productCode}</span>
                                      )}
                                      <span className="text-gray-300">•</span>
                                      <span>ĐVT: {item.unit}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 bg-blue-50/30">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={item.rawAcceptedQty || '0'}
                                    onChange={(e) => handleAcceptanceChange(index, 'acceptedQty', e.target.value)}
                                    onBlur={(e) => handleAcceptanceBlur(index, 'acceptedQty', e.target.value)}
                                    placeholder="0"
                                    className="h-9 w-24 text-center mx-auto font-medium"
                                  />
                                </td>
                                <td className="p-3">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={item.rawUnitPrice !== undefined ? item.rawUnitPrice : (item.unitPriceOverride !== null ? item.unitPriceOverride.toString() : '')}
                                    onChange={(e) => handleAcceptanceChange(index, 'unitPriceOverride', e.target.value)}
                                    onBlur={(e) => handleAcceptanceBlur(index, 'unitPriceOverride', e.target.value)}
                                    placeholder={formatCurrency(item.unitPrice)}
                                    className="h-9 text-right font-medium"
                                  />
                                  {item.unitPriceOverride !== null && item.unitPriceOverride !== item.unitPrice && (
                                    <p className="text-xs text-gray-400 mt-1 text-right">
                                      gốc: {formatCurrency(item.unitPrice)}
                                    </p>
                                  )}
                                </td>
                                <td className="p-3 text-right font-semibold text-green-700">
                                  {formatCurrency(computedAmount)}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => handleDeleteAcceptanceItem(index)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Loại khỏi danh sách nghiệm thu"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Undo Section - Show when there are deleted items */}
                  {deletedAcceptanceIds.size > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Đã loại bỏ {deletedAcceptanceIds.size} hạng mục khỏi danh sách nghiệm thu
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-700 hover:bg-amber-100"
                        onClick={() => {
                          // Reload acceptance data to restore deleted items
                          setDeletedAcceptanceIds(new Set());
                          openAcceptanceModal();
                        }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Hoàn tác
                      </Button>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-end gap-6 text-sm">
                      <span className="text-gray-600">Tổng SL NT:</span>
                      <span className="font-medium w-24 text-right">
                        {acceptanceItems.reduce((sum, item) => sum + item.acceptedQty, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-end gap-6 text-sm mt-2">
                      <span className="text-gray-600">Tổng thành tiền:</span>
                      <span className="font-bold text-lg text-green-700 w-36 text-right">
                        {formatCurrency(
                          acceptanceItems.reduce((sum, item) =>
                            sum + computeAcceptedAmount(item.acceptedQty, item.unitPriceOverride, item.unitPrice), 0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="shrink-0 p-4 border-t bg-white sticky bottom-0">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAcceptanceModal(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleSaveAcceptance} disabled={savingAcceptance}>
                    {savingAcceptance ? 'Đang lưu...' : 'Lưu nghiệm thu'}
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
