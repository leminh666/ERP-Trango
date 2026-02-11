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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Customer, CustomerStatus, Project } from '@tran-go-hoang-gia/shared';
import { ArrowLeft, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, FileText, Users, Calendar, Phone, MapPin, Building, Plus, Receipt } from 'lucide-react';
import { useToast } from '@/components/toast-provider';
import { VisualRenderer } from '@/components/visual-selector';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { useDefaultTimeFilter } from '@/lib/hooks';
import { MetricCardTitle, MetricInfo } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { cn, formatCurrency } from '@/lib/utils';
import { AddressSelector } from '@/components/ui/address-selector';

// Related record interfaces
interface CustomerOrder {
  id: string;
  code: string;
  name: string;
  stage: string;
  estimatedTotal: number;
  createdAt: string;
}

interface CustomerTransaction {
  id: string;
  code: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  amount: number;
  categoryName: string | null;
  note: string | null;
  walletName: string | null;
}

interface CustomerSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
  orderCount: number;
  orderTotal: number;
}

// Status colors
const statusColors: Record<CustomerStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-yellow-100 text-yellow-700',
  CONSIDERING: 'bg-orange-100 text-orange-700',
  PRICE_TOO_HIGH: 'bg-red-100 text-red-700',
  APPOINTMENT_SET: 'bg-purple-100 text-purple-700',
  SURVEY_SCHEDULED: 'bg-indigo-100 text-indigo-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<CustomerStatus, string> = {
  NEW: 'Mới',
  CONTACTED: 'Đã liên hệ',
  CONSIDERING: 'Đang xem xét',
  PRICE_TOO_HIGH: 'Chê giá',
  APPOINTMENT_SET: 'Đã hẹn',
  SURVEY_SCHEDULED: 'Hẹn khảo sát',
  WON: 'Đã ký',
  LOST: 'Đã mất',
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
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

  // Fetch customer basic info
  const fetchCustomer = async () => {
    try {
      const data = await apiClient<Customer>(`/customers/${params.id}`);
      setCustomer(data);
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
      console.error('Failed to fetch customer:', error);
      showError('Lỗi', 'Không thể tải thông tin khách hàng');
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

      // Fetch summary
      const summaryData = await apiClient<CustomerSummary>(`/customers/${params.id}/summary?${queryParams.toString()}`);
      setSummary(summaryData);

      // Fetch orders
      const ordersData = await apiClient<CustomerOrder[]>(`/projects?customerId=${params.id}&${queryParams.toString()}`);
      setOrders(ordersData || []);

      // Fetch transactions (via projects)
      const txParams = new URLSearchParams();
      txParams.append('customerId', params.id);
      txParams.append('from', timeFilter.from);
      txParams.append('to', timeFilter.to);
      const txData = await apiClient<any[]>(`/transactions?${txParams.toString()}`);

      const formattedTx = (txData || []).map(tx => ({
        id: tx.id,
        code: tx.code || '',
        type: tx.type,
        date: tx.date,
        amount: Number(tx.amount),
        categoryName: tx.type === 'INCOME' ? tx.incomeCategory?.name : tx.expenseCategory?.name,
        note: tx.note || null,
        walletName: tx.wallet?.name || null,
      }));
      setTransactions(formattedTx);
    } catch (error) {
      console.error('Failed to fetch related data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchCustomer();
      fetchRelatedData();
    }
  }, [params.id, timeFilter]);

  // Handle edit
  const handleUpdate = async () => {
    if (!editForm.name.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập tên khách hàng');
      return;
    }

    try {
      await apiClient(`/customers/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      showSuccess('Thành công', 'Cập nhật khách hàng thành công');
      setShowEditModal(false);
      fetchCustomer();
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra khi cập nhật');
    }
  };

  // Handle delete with constraints check
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient(`/customers/${params.id}`, { method: 'DELETE' });
      showSuccess('Thành công', 'Đã xóa khách hàng');
      router.push('/partners/customers');
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      if (error.message?.includes('cannot') || error.message?.includes('related') || error.status === 400) {
        showError('Không thể xóa', error.message || 'Khách hàng này có dữ liệu liên quan. Vui lòng kiểm tra lại.');
      } else {
        showError('Lỗi', error.message || 'Có lỗi xảy ra khi xóa');
      }
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const openEditModal = () => {
    if (customer) {
      setEditForm({
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        addressLine: customer.addressLine || '',
        region: customer.region || '',
        provinceCode: customer.provinceCode || '',
        provinceName: customer.provinceName || '',
        districtCode: customer.districtCode || '',
        districtName: customer.districtName || '',
        wardCode: customer.wardCode || '',
        wardName: customer.wardName || '',
        note: customer.note || '',
      });
      setShowEditModal(true);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  if (!customer) {
    return <div className="p-8 text-center">Khách hàng không tồn tại</div>;
  }

  return (
    <div>
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push('/partners/customers')} className="mb-4 pl-0">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại danh sách
      </Button>

      {/* Customer Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
              <VisualRenderer
                visualType={customer.visualType || 'ICON'}
                iconKey={customer.iconKey || 'users'}
                imageUrl={customer.imageUrl}
                color="#3b82f6"
                className="w-12 h-12"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {customer.code}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[customer.status]}`}>
                  {statusLabels[customer.status]}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </span>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[customer.address, customer.wardName, customer.districtName, customer.provinceName, customer.region].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>

              {customer.note && (
                <p className="text-gray-600 mt-2 text-sm">{customer.note}</p>
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
              {/* Tổng thu */}
              <div className="text-center p-3 bg-green-50 rounded-lg min-w-[100px]">
                <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-green-700">Tổng thu</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.customer_summary_totalIncome}
                    iconSize={12}
                    iconClassName="text-green-600/70 hover:text-green-700 cursor-help"
                  />
                </div>
                <p className="font-bold text-green-700 text-sm">{formatCurrency(summary?.totalIncome || 0)}</p>
              </div>
              {/* Tổng chi */}
              <div className="text-center p-3 bg-red-50 rounded-lg min-w-[100px]">
                <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-red-700">Tổng chi</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.customer_summary_totalExpense}
                    iconSize={12}
                    iconClassName="text-red-600/70 hover:text-red-700 cursor-help"
                  />
                </div>
                <p className="font-bold text-red-700 text-sm">{formatCurrency(summary?.totalExpense || 0)}</p>
              </div>
              {/* Lợi nhuận */}
              <div className="text-center p-3 bg-blue-50 rounded-lg min-w-[100px]">
                <DollarSign className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-blue-700">Lợi nhuận</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.customer_summary_net}
                    iconSize={12}
                    iconClassName="text-blue-600/70 hover:text-blue-700 cursor-help"
                  />
                </div>
                <p className={cn('font-bold text-sm', (summary?.net || 0) >= 0 ? 'text-blue-700' : 'text-red-700')}>
                  {formatCurrency(summary?.net || 0)}
                </p>
              </div>
              {/* Số đơn hàng */}
              <div className="text-center p-3 bg-gray-50 rounded-lg min-w-[100px]">
                <FileText className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-gray-700">Số đơn</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.customer_summary_orderCount}
                    iconSize={12}
                    iconClassName="text-gray-500/70 hover:text-gray-600 cursor-help"
                  />
                </div>
                <p className="font-bold text-gray-700 text-sm">{summary?.orderCount || 0}</p>
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
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="orders" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Đơn hàng ({orders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Phiếu thu</span>
          </TabsTrigger>
          <TabsTrigger value="expense" className="flex items-center gap-1">
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">Phiếu chi</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Tổng hợp</span>
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Đơn hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có đơn hàng nào</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="p-3 font-medium">Mã</th>
                        <th className="p-3 font-medium">Tên đơn</th>
                        <th className="p-3 font-medium">Giai đoạn</th>
                        <th className="p-3 font-medium text-right">Giá trị</th>
                        <th className="p-3 font-medium text-right">Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                          <td className="p-3 font-medium">{order.code}</td>
                          <td className="p-3">{order.name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{order.stage}</span>
                          </td>
                          <td className="p-3 text-right font-medium">{formatCurrency(order.estimatedTotal)}</td>
                          <td className="p-3 text-right text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('vi-VN')}
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

        {/* Income Tab */}
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Phiếu thu
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : transactions.filter(t => t.type === 'INCOME').length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có phiếu thu nào</p>
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
                      {transactions.filter(t => t.type === 'INCOME').map(tx => (
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

        {/* Expense Tab */}
        <TabsContent value="expense">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Phiếu chi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : transactions.filter(t => t.type === 'EXPENSE').length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có phiếu chi nào</p>
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
                      {transactions.filter(t => t.type === 'EXPENSE').map(tx => (
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
                  <FileText className="h-5 w-5 text-blue-600" />
                  Tổng hợp đơn hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Số đơn hàng</span>
                    <span className="font-bold">{summary?.orderCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tổng giá trị đơn</span>
                    <span className="font-bold text-blue-600">{formatCurrency(summary?.orderTotal || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Tổng hợp tài chính
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tổng thu</span>
                    <span className="font-bold text-green-600">{formatCurrency(summary?.totalIncome || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tổng chi</span>
                    <span className="font-bold text-red-600">{formatCurrency(summary?.totalExpense || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Thuần</span>
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
              <CardTitle>Sửa khách hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="block text-sm font-medium mb-1">Tên khách hàng *</Label>
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
            <AlertDialogTitle>Xác nhận xóa khách hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa khách hàng <strong>{customer.name}</strong>?
              <br /><br />
              Thao tác này sẽ ẩn khách hàng khỏi danh sách. Nếu khách hàng có đơn hàng hoặc giao dịch liên quan, vui lòng liên hệ Admin để xử lý.
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
