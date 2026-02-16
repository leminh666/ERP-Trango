'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Supplier } from '@tran-go-hoang-gia/shared';
import { ArrowLeft, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, FileText, Phone, MapPin, Building, Receipt, Wrench } from 'lucide-react';
import { useToast } from '@/components/toast-provider';
import { VisualRenderer } from '@/components/visual-selector';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { useDefaultTimeFilter } from '@/lib/hooks';
import { MetricCardTitle, MetricInfo } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { cn, formatCurrency } from '@/lib/utils';
import { AddressSelector } from '@/components/ui/address-selector';

// Related record interfaces
interface SupplierOrder {
  id: string;
  code: string;
  name: string;
  stage: string;
  createdAt: string;
}

interface SupplierWorkshopJob {
  id: string;
  code: string;
  title: string | null;
  amount: number;
  paidAmount: number;
  debtAmount: number;
  status: string;
  orderId: string | null;
  orderCode: string | null;
  orderName: string | null;
  createdAt: string;
}

interface SupplierTransaction {
  id: string;
  code: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  amount: number;
  categoryName: string | null;
  note: string | null;
  walletName: string | null;
}

interface SupplierSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
  transactionCount: number;
}

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [summary, setSummary] = useState<SupplierSummary | null>(null);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [workshopJobs, setWorkshopJobs] = useState<SupplierWorkshopJob[]>([]);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { timeFilter, setTimeFilter } = useDefaultTimeFilter();
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    addressLine: '',
    region: '',
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    note: '',
  });

  const isAdmin = user?.role === 'ADMIN';

  // Fetch supplier basic info
  const fetchSupplier = async () => {
    try {
      const data = await apiClient<Supplier>(`/suppliers/${params.id}`);
      setSupplier(data);
      setLoading(false);
      setEditForm({
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
        addressLine: data.addressLine || '',
        region: data.region || '',
        provinceCode: data.provinceCode || '',
        provinceName: data.provinceName || '',
        districtCode: data.districtCode || '',
        districtName: data.districtName || '',
        wardCode: data.wardCode || '',
        wardName: data.wardName || '',
        note: data.note || '',
      });
    } catch (error) {
      console.error('Failed to fetch supplier:', error);
      showError('Lỗi', 'Không thể tải thông tin nhà cung cấp');
      setLoading(false);
    }
  };

  // Fetch summary and related data
  const fetchRelatedData = async () => {
    setLoadingData(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('from', timeFilter.from);
      queryParams.append('to', timeFilter.to);

      // Use the new related endpoint
      const relatedData = await apiClient<any>(`/suppliers/${params.id}/related?${queryParams.toString()}`);
      
      // Set orders (may be empty for suppliers)
      setOrders((relatedData.orders || []).map((o: any) => ({
        id: o.id,
        code: o.code,
        name: o.name,
        stage: o.stage,
        createdAt: o.createdAt,
      })));

      // Set workshop jobs
      setWorkshopJobs((relatedData.workshopJobs || []).map((wj: any) => ({
        id: wj.id,
        code: wj.code,
        title: wj.title,
        amount: wj.amount,
        paidAmount: wj.paidAmount,
        debtAmount: wj.debtAmount,
        status: wj.status,
        orderId: wj.orderId,
        orderCode: wj.orderCode,
        orderName: wj.orderName,
        createdAt: wj.createdAt,
      })));

      // Set transactions
      const incomes = (relatedData.incomes || []).map((tx: any) => ({
        id: tx.id,
        code: tx.code || '',
        type: 'INCOME' as const,
        date: tx.date,
        amount: Number(tx.amount),
        categoryName: tx.categoryName || null,
        note: tx.note || null,
        walletName: tx.walletName || null,
      }));
      const expenses = (relatedData.expenses || []).map((tx: any) => ({
        id: tx.id,
        code: tx.code || '',
        type: 'EXPENSE' as const,
        date: tx.date,
        amount: Number(tx.amount),
        categoryName: tx.categoryName || null,
        note: tx.note || null,
        walletName: tx.walletName || null,
      }));
      setTransactions([...incomes, ...expenses]);

      // Set summary
      setSummary({
        totalIncome: relatedData.summary?.totalIncome || 0,
        totalExpense: relatedData.summary?.totalExpense || 0,
        net: relatedData.summary?.net || 0,
        transactionCount: relatedData.summary?.transactionCount || 0,
      });
    } catch (error) {
      console.error('Failed to fetch related data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchSupplier();
      fetchRelatedData();
    }
  }, [params.id, timeFilter]);

  // Handle edit
  const handleUpdate = async () => {
    if (!editForm.name.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập tên nhà cung cấp');
      return;
    }

    try {
      await apiClient(`/suppliers/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      showSuccess('Thành công', 'Cập nhật nhà cung cấp thành công');
      setShowEditModal(false);
      fetchSupplier();
    } catch (error: any) {
      console.error('Failed to update supplier:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra khi cập nhật');
    }
  };

  // Handle delete with constraints check
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient(`/suppliers/${params.id}`, { method: 'DELETE' });
      showSuccess('Thành công', 'Đã xóa nhà cung cấp');
      router.push('/partners/suppliers');
    } catch (error: any) {
      console.error('Failed to delete supplier:', error);
      if (error.message?.includes('cannot') || error.message?.includes('related') || error.status === 400) {
        showError('Không thể xóa', error.message || 'Nhà cung cấp này có dữ liệu liên quan. Vui lòng kiểm tra lại.');
      } else {
        showError('Lỗi', error.message || 'Có lỗi xảy ra khi xóa');
      }
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const openEditModal = () => {
    if (supplier) {
      setEditForm({
        name: supplier.name || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        region: supplier.region || '',
        provinceCode: supplier.provinceCode || '',
        provinceName: supplier.provinceName || '',
        districtCode: supplier.districtCode || '',
        districtName: supplier.districtName || '',
        wardCode: supplier.wardCode || '',
        wardName: supplier.wardName || '',
        note: supplier.note || '',
      });
      setShowEditModal(true);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  if (!supplier) {
    return <div className="p-8 text-center">Nhà cung cấp không tồn tại</div>;
  }

  const incomeTxs = transactions.filter(t => t.type === 'INCOME');
  const expenseTxs = transactions.filter(t => t.type === 'EXPENSE');

  return (
    <div>
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push('/partners/suppliers')} className="mb-4 pl-0">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại danh sách
      </Button>

      {/* Supplier Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
              <VisualRenderer
                visualType={supplier.visualType || 'ICON'}
                iconKey={supplier.iconKey || 'truck'}
                imageUrl={supplier.imageUrl}
                color="#f59e0b"
                className="w-12 h-12"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold">{supplier.name}</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {supplier.code}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {supplier.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {supplier.phone}
                  </span>
                )}
                {supplier.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[supplier.address, supplier.wardName, supplier.districtName, supplier.provinceName, supplier.region].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>

              {supplier.note && (
                <p className="text-gray-600 mt-2 text-sm">{supplier.note}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={openEditModal}>
                  <Edit className="h-4 w-4 mr-1" />
                  Sửa
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Xóa
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              {/* Tổng mua hàng */}
              <div className="text-center p-3 bg-green-50 rounded-lg min-w-[100px]">
                <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-green-700">Tổng mua</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.supplier_summary_totalExpense}
                    iconSize={12}
                    iconClassName="text-green-600/70 hover:text-green-700 cursor-help"
                  />
                </div>
                <p className="font-bold text-green-700 text-sm">{formatCurrency(summary?.totalExpense || 0)}</p>
              </div>
              {/* Tổng bán lại */}
              <div className="text-center p-3 bg-red-50 rounded-lg min-w-[100px]">
                <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-red-700">Bán lại</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.supplier_summary_totalIncome}
                    iconSize={12}
                    iconClassName="text-red-600/70 hover:text-red-700 cursor-help"
                  />
                </div>
                <p className="font-bold text-red-700 text-sm">{formatCurrency(summary?.totalIncome || 0)}</p>
              </div>
              {/* Chênh lệch */}
              <div className="text-center p-3 bg-blue-50 rounded-lg min-w-[100px]">
                <DollarSign className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-blue-700">Chênh lệch</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.supplier_summary_net}
                    iconSize={12}
                    iconClassName="text-blue-600/70 hover:text-blue-700 cursor-help"
                  />
                </div>
                <p className={cn('font-bold text-sm', (summary?.net || 0) >= 0 ? 'text-blue-700' : 'text-red-700')}>
                  {formatCurrency(summary?.net || 0)}
                </p>
              </div>
              {/* Số giao dịch */}
              <div className="text-center p-3 bg-gray-50 rounded-lg min-w-[100px]">
                <Receipt className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-gray-700">Giao dịch</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.supplier_summary_transactionCount}
                    iconSize={12}
                    iconClassName="text-gray-500/70 hover:text-gray-600 cursor-help"
                  />
                </div>
                <p className="font-bold text-gray-700 text-sm">{summary?.transactionCount || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Filter */}
      <div className="mb-4">
        <TimeFilter value={timeFilter} onChange={setTimeFilter} />
      </div>

      {/* Tabs for related data */}
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="workshopJobs" className="flex items-center gap-1">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Phiếu GC ({workshopJobs.length})</span>
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Mua hàng ({expenseTxs.length})</span>
          </TabsTrigger>
          <TabsTrigger value="expense" className="flex items-center gap-1">
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">Bán lại ({incomeTxs.length})</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Tổng hợp</span>
          </TabsTrigger>
        </TabsList>

        {/* Workshop Jobs Tab */}
        <TabsContent value="workshopJobs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600" />
                Phiếu gia công liên quan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : workshopJobs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có phiếu gia công nào</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="p-3 font-medium">Mã phiếu</th>
                        <th className="p-3 font-medium">Đơn hàng</th>
                        <th className="p-3 font-medium">Trạng thái</th>
                        <th className="p-3 font-medium text-right">Tổng tiền</th>
                        <th className="p-3 font-medium text-right">Đã trả</th>
                        <th className="p-3 font-medium text-right">Còn nợ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workshopJobs.map(job => (
                        <tr key={job.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/workshops/jobs/${job.id}`)}>
                          <td className="p-3 font-medium">{job.code}</td>
                          <td className="p-3">
                            <div className="font-medium">{job.orderName || '-'}</div>
                            <div className="text-xs text-gray-500">{job.orderCode || ''}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{job.status}</span>
                          </td>
                          <td className="p-3 text-right font-medium text-blue-600">{formatCurrency(job.amount)}</td>
                          <td className="p-3 text-right text-green-600">{formatCurrency(job.paidAmount)}</td>
                          <td className="p-3 text-right text-red-600">{formatCurrency(job.debtAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Tab (Mua hàng = Expense for supplier) */}
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Mua hàng từ NCC
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : expenseTxs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có giao dịch mua hàng nào</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="p-3 font-medium">Ngày</th>
                        <th className="p-3 font-medium">Mã phiếu</th>
                        <th className="p-3 font-medium">Danh mục</th>
                        <th className="p-3 font-medium">Ví</th>
                        <th className="p-3 font-medium text-right">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseTxs.map(tx => (
                        <tr key={tx.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">
                            {new Date(tx.date).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="p-3 font-medium">{tx.code}</td>
                          <td className="p-3">{tx.categoryName || '-'}</td>
                          <td className="p-3 text-gray-500">{tx.walletName || '-'}</td>
                          <td className="p-3 text-right font-medium text-green-600">
                            +{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Tab (Bán lại = Income for supplier) */}
        <TabsContent value="expense">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Bán lại cho NCC
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : incomeTxs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có giao dịch bán lại nào</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="p-3 font-medium">Ngày</th>
                        <th className="p-3 font-medium">Mã phiếu</th>
                        <th className="p-3 font-medium">Danh mục</th>
                        <th className="p-3 font-medium">Ví</th>
                        <th className="p-3 font-medium text-right">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeTxs.map(tx => (
                        <tr key={tx.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">
                            {new Date(tx.date).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="p-3 font-medium">{tx.code}</td>
                          <td className="p-3">{tx.categoryName || '-'}</td>
                          <td className="p-3 text-gray-500">{tx.walletName || '-'}</td>
                          <td className="p-3 text-right font-medium text-red-600">
                            -{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Tổng hợp mua hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Số giao dịch mua</span>
                    <span className="font-bold">{expenseTxs.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tổng tiền mua</span>
                    <span className="font-bold text-green-600">{formatCurrency(summary?.totalExpense || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  Tổng hợp tài chính
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Mua hàng (Chi)</span>
                    <span className="font-bold text-green-600">{formatCurrency(summary?.totalExpense || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Bán lại (Thu)</span>
                    <span className="font-bold text-red-600">{formatCurrency(summary?.totalIncome || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Chênh lệch</span>
                    <span className={cn('font-bold', (summary?.net || 0) >= 0 ? 'text-blue-600' : 'text-red-600')}>
                      {formatCurrency(summary?.net || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Sửa nhà cung cấp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="block text-sm font-medium mb-1">Tên nhà cung cấp *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nhập tên..."
                />
              </div>
              <div>
                <Label className="block text-sm font-medium mb-1">Số điện thoại</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Nhập SĐT..."
                />
              </div>
              <div>
                <Label className="block text-sm font-medium mb-1">Địa chỉ</Label>
                <AddressSelector
                  provinceCode={editForm.provinceCode}
                  provinceName={editForm.provinceName}
                  districtCode={editForm.districtCode}
                  districtName={editForm.districtName}
                  wardCode={editForm.wardCode}
                  wardName={editForm.wardName}
                  addressLine={editForm.addressLine}
                  onChange={(data) => setEditForm({
                    ...editForm,
                    ...data,
                    // Map addressLine to address for legacy field
                    address: data.addressLine || '',
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="block text-sm font-medium mb-1">Khu vực (Miền)</Label>
                  <Input
                    value={editForm.region}
                    onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                    placeholder="Miền Bắc/Trung/Nam"
                  />
                </div>
              </div>
              <div>
                <Label className="block text-sm font-medium mb-1">Ghi chú</Label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="Ghi chú..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Hủy</Button>
                <Button onClick={handleUpdate}>Lưu</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa nhà cung cấp?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa nhà cung cấp <strong>{supplier.name}</strong>?
              <br /><br />
              Thao tác này sẽ ẩn nhà cung cấp khỏi danh sách. Nếu NCC có giao dịch liên quan, vui lòng liên hệ Admin để xử lý.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

