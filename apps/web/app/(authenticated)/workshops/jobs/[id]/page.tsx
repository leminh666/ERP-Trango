'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProductPicker } from '@/components/product-picker';
import { Product, ProductVariant } from '@tran-go-hoang-gia/shared';
import { useToast } from '@/components/toast-provider';
import { KpiTooltip } from '@/components/ui/info-tooltip';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { MetricInfo } from '@/components/ui/metric-info';
import {
  Factory,
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  ArrowUpCircle,
  Calculator,
  Plus,
  Edit,
  Trash2,
  X,
  Package,
  Wrench,
  TrendingUp,
  TrendingDown,
  Building2,
  Percent,
} from 'lucide-react';

import { apiClient, unwrapItems } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';

interface WorkshopJobDetail {
  id: string;
  code: string;
  projectId: string;
  workshopId: string;
  title?: string | null;
  description?: string | null;
  amount: number;
  discountAmount: number; // Chiết khấu cho phiếu gia công
  status: string;
  startDate?: string | null;
  dueDate?: string | null;
  note?: string | null;
  deletedAt?: string | null;
  project: {
    id: string;
    code: string;
    name: string;
  };
  workshop: {
    id: string;
    name: string;
  };
  items?: WorkshopJobItem[];
}

interface WorkshopJobItem {
  id: string;
  productId: string | null;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface WorkshopJobItemInput {
  id?: string;
  product: Product | null;
  variantId: string | null;
  productId: string | null;
  productName: string;
  unit: string;
  qty: string;
  unitPrice: string;
}

interface PaymentItem {
  txId: string;
  date: string;
  amount: number;
  walletName: string;
  expenseCategoryName: string;
  note?: string | null;
  voucherId?: string | null; // Link to expense voucher if available
}

interface PaymentsResponse {
  job: WorkshopJobDetail;
  paidAmount: number;
  debtAmount: number;
  payments: PaymentItem[];
}

interface WalletOption {
  id: string;
  name: string;
}

interface ExpenseCategoryOption {
  id: string;
  name: string;
}

export default function WorkshopJobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { token, user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [job, setJob] = useState<WorkshopJobDetail | null>(null);
  const [paymentsData, setPaymentsData] = useState<PaymentsResponse | null>(null);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Pay modal state (create)
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    walletId: '',
    expenseCategoryId: '',
    note: '',
  });

  // Edit payment modal state
  const [showEditPayModal, setShowEditPayModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);
  const [editPayForm, setEditPayForm] = useState({
    date: '',
    amount: '',
    walletId: '',
    expenseCategoryId: '',
    note: '',
  });

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<PaymentItem | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState('info');

  // Items modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [items, setItems] = useState<WorkshopJobItemInput[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState<WorkshopJobItem | null>(null);

  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    amount: 0,
    discountAmount: 0,
  });

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (id && token) {
      fetchDetail();
      fetchDropdowns();
    }
  }, [id, token]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data: PaymentsResponse = await apiClient<PaymentsResponse>(`/workshop-jobs/${id}/payments`);
      setJob({
        ...data.job,
        amount: Number(data.job.amount || 0),
        discountAmount: Number(data.job.discountAmount || 0),
        items: data.job.items || [],
      });
      setPaymentsData({
        ...data,
        paidAmount: Number(data.paidAmount || 0),
        debtAmount: Number(data.debtAmount || 0),
        payments: (data.payments || []).map((p) => ({
          ...p,
          amount: Number(p.amount || 0),
        })),
      });
    } catch (error) {
      console.error('Failed to fetch workshop job detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [walletsData, expenseData, productsData] = await Promise.all([
        apiClient<any[]>('/wallets'),
        apiClient<any[]>('/expense-categories'),
        apiClient<Product[]>('/products?includeDeleted=false'),
      ]);

      setWallets(walletsData.filter((w: any) => !w.deletedAt).map((w: any) => ({
        id: w.id,
        name: w.name,
      })));

      setExpenseCategories(expenseData.filter((c: any) => !c.deletedAt).map((c: any) => ({
        id: c.id,
        name: c.name,
      })));

      setProducts(unwrapItems(productsData));
    } catch (error) {
      console.error('Failed to fetch dropdowns:', error);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  // ===== ITEMS CRUD =====
  const openAddItem = () => {
    setItems(job?.items?.map(item => ({
      id: item.id,
      product: null,
      variantId: null, // API may not return variantId yet
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      qty: String(item.quantity),
      unitPrice: String(item.unitPrice),
    })) || []);
    setEditingItemIndex(null);
    setShowItemModal(true);
  };

  const addNewItem = () => {
    setItems([...items, {
      product: null,
      variantId: null,
      productId: null,
      productName: '',
      unit: '',
      qty: '0',
      unitPrice: '0',
    }]);
    setEditingItemIndex(items.length);
  };

  const updateItem = (index: number, updates: Partial<WorkshopJobItemInput>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSelectProduct = (value: { product: Product | null; variant: ProductVariant | null }) => {
    const { product, variant } = value;
    if (editingItemIndex !== null && product) {
      updateItem(editingItemIndex, {
        product,
        variantId: variant?.id || null,
        productId: product.id,
        productName: variant?.name || product.name,
        unit: product.unit || '',
        qty: '0', // Reset qty to 0 when selecting product
        unitPrice: variant?.price?.toString() || product.defaultSalePrice?.toString() || '0',
      });
    }
    setShowProductPicker(false);
    setEditingItemIndex(null);
  };

  const calculateItemAmount = useCallback((item: WorkshopJobItemInput) => {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return qty * price;
  }, []);

  const calculateTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + calculateItemAmount(item), 0);
  }, [items, calculateItemAmount]);

  const handleSaveItems = async () => {
    if (!job) return;

    const validItems = items.filter(item => item.productName.trim());
    if (validItems.length === 0) {
      showError('Thiếu thông tin', 'Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    const payloadItems = validItems.map(item => ({
      productId: item.productId || undefined,
      productName: item.productName,
      unit: item.unit,
      quantity: parseFloat(item.qty) || 0,
      unitPrice: parseFloat(item.unitPrice) || 0,
    }));

    try {
      await apiClient(`/workshop-jobs/${job.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          items: payloadItems,
        }),
      });

      showSuccess('Thành công', 'Đã cập nhật danh sách sản phẩm');
      setShowItemModal(false);
      fetchDetail();
    } catch (error: any) {
      console.error('Failed to save items:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra khi lưu sản phẩm');
    }
  };

  // Delete item from job
  const handleDeleteItem = async () => {
    if (!job || !showDeleteItemConfirm) return;

    try {
      // Remove the item from the list (soft delete by not including it in the update)
      const updatedItems = (job.items || [])
        .filter(item => item.id !== showDeleteItemConfirm.id)
        .map(item => ({
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));

      await apiClient(`/workshop-jobs/${job.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          items: updatedItems,
        }),
      });

      showSuccess('Thành công', 'Đã xóa sản phẩm');
      setShowDeleteItemConfirm(null);
      fetchDetail();
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra khi xóa sản phẩm');
    }
  };

  // ===== PAYMENT CRUD =====
  const handleOpenPayModal = () => {
    if (!paymentsData) return;
    setPayForm({
      date: new Date().toISOString().split('T')[0],
      amount: paymentsData.debtAmount > 0 ? String(paymentsData.debtAmount) : '',
      walletId: '',
      expenseCategoryId: '',
      note: '',
    });
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!job) return;

    const amountNumber = parseFloat(payForm.amount || '0');
    if (!amountNumber || amountNumber <= 0) {
      showError('Số tiền không hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0');
      return;
    }
    if (!payForm.walletId) {
      showError('Thiếu thông tin', 'Vui lòng chọn ví thanh toán');
      return;
    }
    if (!payForm.expenseCategoryId) {
      showError('Thiếu thông tin', 'Vui lòng chọn danh mục chi');
      return;
    }

    try {
      const result = await apiClient<{ id: string; code: string }>(`/workshop-jobs/${job.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          ...payForm,
          amount: amountNumber,
        }),
      });

      const walletName = wallets.find(w => w.id === payForm.walletId)?.name || '';
      showSuccess(
        'Tạo phiếu chi thành công',
        `Mã phiếu: ${result.code || 'N/A'} | Số tiền: ${formatCurrency(amountNumber)} | Ví: ${walletName}`
      );
      setShowPayModal(false);
      setActiveTab('payments'); // Stay on payments tab
      fetchDetail();
    } catch (error: any) {
      console.error('Failed to create payment:', error);
      showError('Tạo phiếu chi thất bại', error.message || 'Có lỗi xảy ra khi tạo phiếu chi');
    }
  };

  // Edit payment
  const handleOpenEditPayModal = (payment: PaymentItem) => {
    setEditingPayment(payment);
    setEditPayForm({
      date: new Date(payment.date).toISOString().split('T')[0],
      amount: String(payment.amount),
      walletId: '',
      expenseCategoryId: '',
      note: payment.note || '',
    });
    setShowEditPayModal(true);
  };

  const handleUpdatePayment = async () => {
    if (!job || !editingPayment) return;

    const amountNumber = parseFloat(editPayForm.amount || '0');
    if (!amountNumber || amountNumber <= 0) {
      showError('Số tiền không hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0');
      return;
    }

    try {
      await apiClient(`/workshop-jobs/${job.id}/payments/${editingPayment.txId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount: amountNumber,
          walletId: editPayForm.walletId || undefined,
          expenseCategoryId: editPayForm.expenseCategoryId || undefined,
          date: editPayForm.date,
          note: editPayForm.note || undefined,
        }),
      });

      const walletName = editPayForm.walletId
        ? wallets.find(w => w.id === editPayForm.walletId)?.name
        : '';
      showSuccess(
        'Cập nhật thành công',
        `Đã cập nhật phiếu chi: ${formatCurrency(amountNumber)}${walletName ? ' | Ví: ' + walletName : ''}`
      );
      setShowEditPayModal(false);
      setEditingPayment(null);
      setActiveTab('payments'); // Stay on payments tab
      fetchDetail();
    } catch (error: any) {
      console.error('Failed to update payment:', error);
      showError('Cập nhật thất bại', error.message || 'Có lỗi xảy ra khi cập nhật');
    }
  };

  // Delete payment
  const handleDeletePayment = async () => {
    if (!job || !showDeleteConfirm) return;

    try {
      await apiClient(`/workshop-jobs/${job.id}/payments/${showDeleteConfirm.txId}`, {
        method: 'DELETE',
      });

      showSuccess('Xóa thành công', 'Đã xóa phiếu chi thanh toán');
      setShowDeleteConfirm(null);
      setActiveTab('payments'); // Stay on payments tab
      fetchDetail();
    } catch (error: any) {
      console.error('Failed to delete payment:', error);
      showError('Xóa thất bại', error.message || 'Có lỗi xảy ra khi xóa');
    }
  };

  // ===== DISCOUNT HANDLERS =====
  const openDiscountModal = () => {
    if (!job) return;
    setDiscountForm({
      amount: job.amount,
      discountAmount: job.discountAmount || 0,
    });
    setShowDiscountModal(true);
  };

  const handleUpdateDiscount = async () => {
    if (!job) return;

    const discountAmount = parseFloat(discountForm.discountAmount.toString()) || 0;
    if (discountAmount > discountForm.amount) {
      showError('Số tiền không hợp lệ', 'Chiết khấu không được lớn hơn tổng tiền');
      return;
    }

    try {
      await apiClient(`/workshop-jobs/${job.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          discountAmount,
        }),
      });

      showSuccess('Thành công', 'Đã cập nhật chiết khấu');
      setShowDiscountModal(false);
      fetchDetail();
    } catch (error: any) {
      console.error('Failed to update discount:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra khi lưu chiết khấu');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  if (!job || !paymentsData) {
    return <div className="p-8 text-center">Phiếu gia công không tồn tại</div>;
  }

  const netAmount = Math.max(0, job.amount - (job.discountAmount || 0));
  const isPaidEnough = paymentsData.paidAmount >= netAmount;

  return (
    <div>
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push('/workshops/jobs')} className="mb-4 pl-0">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại danh sách phiếu gia công
      </Button>

      {/* Job Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Job Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <h1 className="text-2xl font-bold">{job.title || `Phiếu gia công ${job.code}`}</h1>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  {job.code}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  job.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {job.status}
                </span>
                {isPaidEnough && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Đã thanh toán đủ
                  </span>
                )}
              </div>

              {/* Related Info */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {job.project.code} - {job.project.name}
                </span>
                <span className="flex items-center gap-1">
                  <Factory className="h-4 w-4" />
                  {job.workshop.name}
                </span>
              </div>

              {/* Dates */}
              {(job.startDate || job.dueDate) && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                  {job.startDate && (
                    <span>
                      Bắt đầu: {formatDate(job.startDate)}
                    </span>
                  )}
                  {job.dueDate && (
                    <span>
                      Dự kiến xong: {formatDate(job.dueDate)}
                    </span>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={handleOpenPayModal}>
                  <DollarSign className="h-4 w-4 mr-1" />
                  Thanh toán
                </Button>
                <Button size="sm" variant="outline" onClick={openDiscountModal}>
                  <Percent className="h-4 w-4 mr-1" />
                  CK
                </Button>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={openAddItem}>
                    <Edit className="h-4 w-4 mr-1" />
                    Chỉnh sửa
                  </Button>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              {/* Tổng tiền GC - HIỂN THỊ SAU CK */}
              <div className="text-center p-3 bg-blue-50 rounded-lg min-w-[100px]">
                <Wrench className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-blue-700">Tổng GC</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.workshopJob_summary_total}
                    iconSize={12}
                    iconClassName="text-blue-600/70 hover:text-blue-700 cursor-help"
                  />
                </div>
                <p className="font-bold text-blue-700 text-sm">
                  {formatCurrency(Math.max(0, job.amount - (job.discountAmount || 0)))}
                </p>
                {job.discountAmount > 0 && (
                  <p className="text-xs text-orange-600">
                    - {formatCurrency(job.discountAmount)} CK
                  </p>
                )}
              </div>
              {/* Đã thanh toán */}
              <div className="text-center p-3 bg-green-50 rounded-lg min-w-[100px]">
                <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-green-700">Đã trả</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.workshopJob_summary_paid}
                    iconSize={12}
                    iconClassName="text-green-600/70 hover:text-green-700 cursor-help"
                  />
                </div>
                <p className="font-bold text-green-700 text-sm">{formatCurrency(paymentsData.paidAmount)}</p>
              </div>
              {/* Công nợ */}
              <div className="text-center p-3 bg-red-50 rounded-lg min-w-[100px]">
                <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-red-700">Công nợ</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.workshopJob_summary_debt}
                    iconSize={12}
                    iconClassName="text-red-600/70 hover:text-red-700 cursor-help"
                  />
                </div>
                <p className="font-bold text-red-700 text-sm">{formatCurrency(paymentsData.debtAmount)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="info">Thông tin phiếu</TabsTrigger>
          <TabsTrigger value="payments">Thanh toán</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Thông tin phiếu gia công</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Mã phiếu</span>
                  <span className="font-medium text-sm">{job.code}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Đơn hàng</span>
                  <span className="font-medium text-sm">
                    {job.project.code} - {job.project.name}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Xưởng gia công</span>
                  <span className="font-medium text-sm">{job.workshop.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Tiêu đề</span>
                  <span className="font-medium text-sm">{job.title || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Ngày bắt đầu</span>
                  <span className="font-medium text-sm">
                    {job.startDate ? formatDate(job.startDate) : '-'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Ngày dự kiến xong</span>
                  <span className="font-medium text-sm">
                    {job.dueDate ? formatDate(job.dueDate) : '-'}
                  </span>
                </div>
                <div className="flex flex-col sm:col-span-3">
                  <span className="text-xs text-muted-foreground">Mô tả</span>
                  <span className="font-medium text-sm">{job.description || '-'}</span>
                </div>
                <div className="flex flex-col sm:col-span-3">
                  <span className="text-xs text-muted-foreground">Ghi chú</span>
                  <span className="font-medium text-sm">{job.note || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Hạng mục/ Sản phẩm
                </CardTitle>
                {isAdmin && (
                  <Button size="sm" onClick={openAddItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Thêm sản phẩm
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!job.items || job.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p>Chưa có sản phẩm nào trong phiếu gia công này</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Sản phẩm</th>
                        <th className="text-left p-3 font-medium">ĐVT</th>
                        <th className="text-right p-3 font-medium">SLNT</th>
                        <th className="text-right p-3 font-medium">Đơn giá</th>
                        <th className="text-right p-3 font-medium">Thành tiền</th>
                        <th className="text-left p-3 font-medium w-20">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.items.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{item.productName}</td>
                          <td className="p-3">{item.unit}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(Number(item.lineTotal))}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  // Open edit modal for this item
                                  setItems(job.items?.filter(i => i.id !== item.id).map(i => ({
                                    id: i.id,
                                    product: null,
                                    variantId: null,
                                    productId: i.productId,
                                    productName: i.productName,
                                    unit: i.unit,
                                    qty: String(i.quantity),
                                    unitPrice: String(i.unitPrice),
                                  })) || []);
                                  setEditingItemIndex(null);
                                  setShowItemModal(true);
                                }}
                                className="h-8 w-8 p-0"
                                title="Sửa"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowDeleteItemConfirm(item)}
                                className="h-8 w-8 p-0 text-red-500"
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="p-3 text-right font-medium">
                          Tổng cộng:
                          {job.discountAmount > 0 && (
                            <span className="text-xs text-gray-500 ml-2">(trước CK)</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-blue-600 text-lg">
                          {formatCurrency(job.amount)}
                        </td>
                      </tr>
                      {job.discountAmount > 0 && (
                        <tr>
                          <td colSpan={4} className="p-3 text-right font-medium text-orange-600">Chiết khấu:</td>
                          <td className="p-3 text-right font-medium text-orange-600">
                            -{formatCurrency(job.discountAmount)}
                          </td>
                        </tr>
                      )}
                      <tr className="bg-blue-50">
                        <td colSpan={4} className="p-3 text-right font-bold">Tổng tiền sau CK:</td>
                        <td className="p-3 text-right font-bold text-blue-700 text-lg">
                          {formatCurrency(Math.max(0, job.amount - (job.discountAmount || 0)))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium">Thanh toán xưởng gia công</span>
              </div>
              {isAdmin && (
                <Button onClick={handleOpenPayModal}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Thanh toán xưởng gia công
                </Button>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lịch sử thanh toán</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsData.payments.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Chưa có phiếu chi thanh toán nào cho phiếu gia công này
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-3 font-medium">Ngày</th>
                          <th className="text-right p-3 font-medium">Số tiền</th>
                          <th className="text-left p-3 font-medium">Ví</th>
                          <th className="text-left p-3 font-medium">Danh mục chi</th>
                          <th className="text-left p-3 font-medium">Ghi chú</th>
                          {isAdmin && <th className="text-left p-3 font-medium w-24">Hành động</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsData.payments.map((p) => (
                          <tr
                            key={p.txId}
                            className={cn(
                              'border-b',
                              p.voucherId ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed'
                            )}
                            onClick={() => {
                              if (p.voucherId) {
                                handleOpenEditPayModal(p);
                              }
                            }}
                            title={p.voucherId ? 'Click để sửa phiếu chi' : 'Không có phiếu chi liên kết'}
                          >
                            <td className="p-3">{formatDate(p.date)}</td>
                            <td className="p-3 text-right font-medium text-red-600">
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="p-3">{p.walletName || '-'}</td>
                            <td className="p-3">{p.expenseCategoryName || '-'}</td>
                            <td className="p-3 text-gray-500">{p.note || '-'}</td>
                            {isAdmin && (
                              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => p.voucherId && handleOpenEditPayModal(p)}
                                    disabled={!p.voucherId}
                                    className="h-8 w-8 p-0"
                                    title={p.voucherId ? 'Sửa' : 'Không thể sửa (không có phiếu chi)'}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowDeleteConfirm(p)}
                                    className="h-8 w-8 p-0 text-red-500"
                                    title="Xóa"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Items Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Chỉnh sửa Hạng mục/ Sản phẩm</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowItemModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={addNewItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm sản phẩm
                </Button>
                <div className="text-sm text-gray-500">
                  Tổng tiền: <span className="font-bold text-blue-600">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border rounded-lg">
                  <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p>Chưa có sản phẩm nào</p>
                  <p className="text-sm">Nhấp "Thêm sản phẩm" để bắt đầu</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium w-10">#</th>
                        <th className="text-left p-3 font-medium">Sản phẩm *</th>
                        <th className="text-left p-3 font-medium w-24">ĐVT *</th>
                        <th className="text-left p-3 font-medium w-24">SLNT</th>
                        <th className="text-left p-3 font-medium w-28">Đơn giá</th>
                        <th className="text-right p-3 font-medium w-32">Thành tiền</th>
                        <th className="text-left p-3 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3 text-gray-500">{index + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingItemIndex(index);
                                  setShowProductPicker(true);
                                }}
                                className="h-8"
                              >
                                <Package className="h-4 w-4 mr-1" />
                                {item.productName || 'Chọn sản phẩm...'}
                              </Button>
                            </div>
                          </td>
                          <td className="p-3">
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(index, { unit: e.target.value })}
                              placeholder="ĐVT"
                              className="h-8"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.qty || '0'}
                              onChange={(e) => updateItem(index, { qty: e.target.value })}
                              placeholder="0"
                              className="h-8"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                              placeholder="0"
                              className="h-8"
                            />
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(calculateItemAmount(item))}
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-500 h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={5} className="p-3 text-right font-medium">Tổng cộng:</td>
                        <td className="p-3 text-right font-bold text-blue-600 text-lg">
                          {formatCurrency(calculateTotal())}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowItemModal(false)}>
                  Hủy
                </Button>
                <Button onClick={handleSaveItems} disabled={items.length === 0}>
                  Lưu thay đổi
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product Picker */}
          {showProductPicker && (
            <ProductPicker
              value={editingItemIndex !== null ? { product: items[editingItemIndex].product || null, variant: null } : { product: null, variant: null }}
              onChange={handleSelectProduct}
              onClose={() => {
                setShowProductPicker(false);
                setEditingItemIndex(null);
              }}
              onCreateNew={() => {
                setShowProductPicker(false);
              }}
            />
          )}
        </div>
      )}

      {/* Create Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Thanh toán xưởng gia công</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-700">
                      {job.project.code} - {job.project.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      Xưởng: {job.workshop.name}
                      {job.discountAmount > 0 && (
                        <> • Tổng: <span className="line-through">{formatCurrency(job.amount)}</span> → <strong>{formatCurrency(netAmount)}</strong> (sau CK)</>
                      )}
                      {!job.discountAmount && <> • Tổng: {formatCurrency(job.amount)}</>}
                      {' '}• Còn: <strong>{formatCurrency(paymentsData.debtAmount)}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ngày *</label>
                <Input
                  type="date"
                  value={payForm.date}
                  onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VND) *</label>
                <Input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ví *</label>
                <Select
                  value={payForm.walletId}
                  onChange={(e) => setPayForm({ ...payForm, walletId: e.target.value })}
                  className="w-full"
                >
                  <option value="">Chọn ví...</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Danh mục chi *</label>
                <Select
                  value={payForm.expenseCategoryId}
                  onChange={(e) =>
                    setPayForm({ ...payForm, expenseCategoryId: e.target.value })
                  }
                  className="w-full"
                >
                  <option value="">Chọn danh mục...</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <Input
                  value={payForm.note}
                  onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                  placeholder="Nhập ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowPayModal(false)}>
                  Hủy
                </Button>
                <Button onClick={handlePay}>Thanh toán</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Payment Modal */}
      {showEditPayModal && editingPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Sửa phiếu chi thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm font-medium text-orange-700">
                  Sửa phiếu chi: {formatCurrency(editingPayment.amount)}
                </p>
                <p className="text-xs text-orange-600">
                  Xưởng: {job.workshop.name} • Còn lại: {formatCurrency(paymentsData.debtAmount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ngày *</label>
                <Input
                  type="date"
                  value={editPayForm.date}
                  onChange={(e) => setEditPayForm({ ...editPayForm, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền (VND) *</label>
                <Input
                  type="number"
                  value={editPayForm.amount}
                  onChange={(e) => setEditPayForm({ ...editPayForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ví</label>
                <Select
                  value={editPayForm.walletId}
                  onChange={(e) => setEditPayForm({ ...editPayForm, walletId: e.target.value })}
                  className="w-full"
                >
                  <option value="">Giữ nguyên...</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Danh mục chi</label>
                <Select
                  value={editPayForm.expenseCategoryId}
                  onChange={(e) =>
                    setEditPayForm({ ...editPayForm, expenseCategoryId: e.target.value })
                  }
                  className="w-full"
                >
                  <option value="">Giữ nguyên...</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <Input
                  value={editPayForm.note}
                  onChange={(e) => setEditPayForm({ ...editPayForm, note: e.target.value })}
                  placeholder="Nhập ghi chú..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowEditPayModal(false);
                  setEditingPayment(null);
                }}>
                  Hủy
                </Button>
                <Button onClick={handleUpdatePayment}>Lưu thay đổi</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {showDeleteItemConfirm && (
        <AlertDialog open={!!showDeleteItemConfirm} onOpenChange={() => setShowDeleteItemConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa sản phẩm</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc muốn xóa sản phẩm <strong>{showDeleteItemConfirm.productName}</strong> khỏi phiếu gia công này?
                <br />
                Thao tác này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteItem} className="bg-red-600 hover:bg-red-700">
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete Payment Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa?</h3>
              <p className="text-gray-500 mb-4">
                Bạn có chắc muốn xóa phiếu chi <strong>{formatCurrency(showDeleteConfirm.amount)}</strong>?
                <br />Thao tác này không thể hoàn tác.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Hủy</Button>
                <Button variant="destructive" onClick={handleDeletePayment}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-orange-600" />
                Chiết khấu phiếu gia công
              </CardTitle>
              <p className="text-sm text-gray-500">Phiếu: {job.code}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-700">Tổng tiền gia công (trước CK):</span>
                  <span className="font-medium text-orange-700">{formatCurrency(discountForm.amount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số tiền chiết khấu (VND)</label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={discountForm.discountAmount?.toString() || '0'}
                  onChange={(e) => setDiscountForm(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tổng tiền sau chiết khấu: <strong>{formatCurrency(Math.max(0, discountForm.amount - (discountForm.discountAmount || 0)))}</strong>
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
    </div>
  );
}
