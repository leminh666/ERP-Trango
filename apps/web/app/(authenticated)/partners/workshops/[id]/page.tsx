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
import { Workshop } from '@tran-go-hoang-gia/shared';
import { ArrowLeft, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, FileText, Phone, MapPin, Factory, Wrench, Receipt } from 'lucide-react';
import { useToast } from '@/components/toast-provider';
import { VisualRenderer } from '@/components/visual-selector';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { useDefaultTimeFilter } from '@/lib/hooks';
import { MetricCardTitle, MetricInfo } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { cn, formatCurrency } from '@/lib/utils';
import { AddressSelector } from '@/components/ui/address-selector';

// Related record interfaces
interface WorkshopOrder {
  id: string;
  code: string;
  name: string;
  stage: string;
  status: string;
  deadline: string | null;
  createdAt: string;
}

interface WorkshopJob {
  id: string;
  code: string;
  title: string | null;
  amount: number;
  paidAmount: number;
  debtAmount: number;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  projectName: string;
  projectCode: string;
}

interface WorkshopTransaction {
  id: string;
  code: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  amount: number;
  categoryName: string | null;
  note: string | null;
  walletName: string | null;
}

interface WorkshopSummary {
  totalJobAmount: number;
  totalPaidAmount: number;
  totalDebtAmount: number;
  totalIncome: number;
  totalExpense: number;
  net: number;
  jobCount: number;
}

export default function WorkshopDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [summary, setSummary] = useState<WorkshopSummary | null>(null);
  const [orders, setOrders] = useState<WorkshopOrder[]>([]);
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [transactions, setTransactions] = useState<WorkshopTransaction[]>([]);
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
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    note: '',
  });

  const isAdmin = user?.role === 'ADMIN';

  // Fetch workshop basic info
  const fetchWorkshop = async () => {
    try {
      const data = await apiClient<Workshop>(`/workshops/${params.id}`);
      setWorkshop(data);
      setLoading(false);
      setEditForm({
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
        addressLine: data.addressLine || '',
        provinceCode: data.provinceCode || '',
        provinceName: data.provinceName || '',
        districtCode: data.districtCode || '',
        districtName: data.districtName || '',
        wardCode: data.wardCode || '',
        wardName: data.wardName || '',
        note: data.note || '',
      });
    } catch (error) {
      console.error('Failed to fetch workshop:', error);
      showError('Lỗi', 'Không thể tải thông tin xưởng gia công');
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
      const relatedData = await apiClient<any>(`/workshops/${params.id}/related?${queryParams.toString()}`);
      
      // Set orders
      setOrders((relatedData.orders || []).map((o: any) => ({
        id: o.id,
        code: o.code,
        name: o.name,
        stage: o.stage,
        status: o.status,
        deadline: o.deadline,
        createdAt: o.createdAt,
      })));

      // Set jobs
      setJobs((relatedData.workshopJobs || []).map((wj: any) => ({
        id: wj.id,
        code: wj.code,
        title: wj.title,
        amount: wj.amount,
        paidAmount: wj.paidAmount,
        debtAmount: wj.debtAmount,
        status: wj.status,
        startDate: null,
        dueDate: null,
        projectName: wj.orderName || '-',
        projectCode: wj.orderCode || '',
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
        totalJobAmount: relatedData.summary?.totalJobAmount || 0,
        totalPaidAmount: relatedData.summary?.totalPaidAmount || 0,
        totalDebtAmount: relatedData.summary?.totalDebtAmount || 0,
        totalIncome: relatedData.summary?.totalIncome || 0,
        totalExpense: relatedData.summary?.totalExpense || 0,
        net: relatedData.summary?.net || 0,
        jobCount: relatedData.summary?.workshopJobCount || 0,
      });
    } catch (error) {
      console.error('Failed to fetch related data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchWorkshop();
      fetchRelatedData();
    }
  }, [params.id, timeFilter]);

  // Handle edit
  const handleUpdate = async () => {
    if (!editForm.name.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập tên xưởng');
      return;
    }

    try {
      await apiClient(`/workshops/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      showSuccess('Thành công', 'Cập nhật xưởng gia công thành công');
      setShowEditModal(false);
      fetchWorkshop();
    } catch (error: any) {
      console.error('Failed to update workshop:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra khi cập nhật');
    }
  };

  // Handle delete with constraints check
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient(`/workshops/${params.id}`, { method: 'DELETE' });
      showSuccess('Thành công', 'Đã xóa xưởng gia công');
      router.push('/partners/workshops');
    } catch (error: any) {
      console.error('Failed to delete workshop:', error);
      if (error.message?.includes('cannot') || error.message?.includes('related') || error.status === 400) {
        showError('Không thể xóa', error.message || 'Xưởng này có dữ liệu liên quan. Vui lòng kiểm tra lại.');
      } else {
        showError('Lỗi', error.message || 'Có lỗi xảy ra khi xóa');
      }
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const openEditModal = () => {
    if (workshop) {
      setEditForm({
        name: workshop.name || '',
        phone: workshop.phone || '',
        address: workshop.address || '',
        addressLine: workshop.addressLine || '',
        provinceCode: workshop.provinceCode || '',
        provinceName: workshop.provinceName || '',
        districtCode: workshop.districtCode || '',
        districtName: workshop.districtName || '',
        wardCode: workshop.wardCode || '',
        wardName: workshop.wardName || '',
        note: workshop.note || '',
      });
      setShowEditModal(true);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  if (!workshop) {
    return <div className="p-8 text-center">Xưởng gia công không tồn tại</div>;
  }

  const incomeTxs = transactions.filter(t => t.type === 'INCOME');
  const expenseTxs = transactions.filter(t => t.type === 'EXPENSE');

  return (
    <div>
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push('/partners/workshops')} className="mb-4 pl-0">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại danh sách
      </Button>

      {/* Workshop Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
              <VisualRenderer
                visualType={workshop.visualType || 'ICON'}
                iconKey={workshop.iconKey || 'factory'}
                imageUrl={workshop.imageUrl}
                color="#f97316"
                className="w-12 h-12"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold">{workshop.name}</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {workshop.code}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {workshop.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {workshop.phone}
                  </span>
                )}
                {workshop.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[workshop.address, workshop.wardName, workshop.districtName, workshop.provinceName].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>

              {workshop.note && (
                <p className="text-gray-600 mt-2 text-sm">{workshop.note}</p>
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
              {/* Tổng gia công */}
              <div className="text-center p-3 bg-blue-50 rounded-lg min-w-[100px]">
                <Wrench className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-blue-700">Tổng GC</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.workshop_summary_totalJobAmount}
                    iconSize={12}
                    iconClassName="text-blue-600/70 hover:text-blue-700 cursor-help"
                  />
                </div>
                <p className="font-bold text-blue-700 text-sm">{formatCurrency(summary?.totalJobAmount || 0)}</p>
              </div>
              {/* Đã thanh toán */}
              <div className="text-center p-3 bg-green-50 rounded-lg min-w-[100px]">
                <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-green-700">Đã trả</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.workshop_summary_totalPaidAmount}
                    iconSize={12}
                    iconClassName="text-green-600/70 hover:text-green-700 cursor-help"
                  />
                </div>
                <p className="font-bold text-green-700 text-sm">{formatCurrency(summary?.totalPaidAmount || 0)}</p>
              </div>
              {/* Công nợ */}
              <div className="text-center p-3 bg-red-50 rounded-lg min-w-[100px]">
                <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-red-700">Công nợ</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.workshop_summary_totalDebtAmount}
                    iconSize={12}
                    iconClassName="text-red-600/70 hover:text-red-700 cursor-help"
                  />
                </div>
                <p className="font-bold text-red-700 text-sm">{formatCurrency(summary?.totalDebtAmount || 0)}</p>
              </div>
              {/* Số phiếu GC */}
              <div className="text-center p-3 bg-gray-50 rounded-lg min-w-[100px]">
                <Receipt className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-gray-700">Số phiếu</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.workshop_summary_jobCount}
                    iconSize={12}
                    iconClassName="text-gray-500/70 hover:text-gray-600 cursor-help"
                  />
                </div>
                <p className="font-bold text-gray-700 text-sm">{summary?.jobCount || 0}</p>
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
      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="orders" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Đơn hàng ({orders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-1">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Phiếu GC ({jobs.length})</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Thanh toán</span>
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Thu khác</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-1">
            <Factory className="h-4 w-4" />
            <span className="hidden sm:inline">Tổng hợp</span>
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Đơn hàng liên quan
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
                        <th className="p-3 font-medium text-right">Hạn thi công</th>
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
                          <td className="p-3 text-right text-gray-500">
                            {order.deadline ? new Date(order.deadline).toLocaleDateString('vi-VN') : '-'}
                          </td>
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

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600" />
                Phiếu gia công
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
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
                      {jobs.map(job => (
                        <tr key={job.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/workshops/jobs/${job.id}`)}>
                          <td className="p-3 font-medium">{job.code}</td>
                          <td className="p-3">
                            <div className="font-medium">{job.projectName}</div>
                            <div className="text-xs text-gray-500">{job.projectCode}</div>
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

        {/* Payments Tab (Transactions for this workshop) */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Thanh toán cho xưởng
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có giao dịch nào</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="p-3 font-medium">Ngày</th>
                        <th className="p-3 font-medium">Mã phiếu</th>
                        <th className="p-3 font-medium">Loại</th>
                        <th className="p-3 font-medium">Ví</th>
                        <th className="p-3 font-medium text-right">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-600">
                            {new Date(tx.date).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="p-3 font-medium">{tx.code}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${tx.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {tx.type === 'INCOME' ? 'Thu' : 'Chi'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500">{tx.walletName || '-'}</td>
                          <td className={cn('p-3 text-right font-medium', tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600')}>
                            {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
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

        {/* Income from workshop Tab */}
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Thu nhập khác từ xưởng
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
                <p className="text-gray-500 text-center py-8">Chưa có thu nhập nào</p>
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

        {/* Summary Tab */}
        <TabsContent value="summary">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  Tổng hợp gia công
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Số phiếu GC</span>
                    <span className="font-bold">{jobs.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tổng tiền gia công</span>
                    <span className="font-bold text-blue-600">{formatCurrency(summary?.totalJobAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Đã thanh toán</span>
                    <span className="font-bold text-green-600">{formatCurrency(summary?.totalPaidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Còn nợ</span>
                    <span className="font-bold text-red-600">{formatCurrency(summary?.totalDebtAmount || 0)}</span>
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
                    <span className="text-gray-600">Chi thanh toán</span>
                    <span className="font-bold text-red-600">{formatCurrency(summary?.totalExpense || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Thu nhập khác</span>
                    <span className="font-bold text-green-600">{formatCurrency(summary?.totalIncome || 0)}</span>
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
              <CardTitle>Sửa xưởng gia công</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="block text-sm font-medium mb-1">Tên xưởng *</Label>
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
                    provinceCode: data.provinceCode || '',
                    provinceName: data.provinceName || '',
                    districtCode: data.districtCode || '',
                    districtName: data.districtName || '',
                    wardCode: data.wardCode || '',
                    wardName: data.wardName || '',
                    addressLine: data.addressLine || '',
                    address: data.addressLine || '',
                  })}
                />
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
            <AlertDialogTitle>Xác nhận xóa xưởng gia công?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa xưởng <strong>{workshop.name}</strong>?
              <br /><br />
              Thao tác này sẽ ẩn xưởng khỏi danh sách. Nếu xưởng có phiếu gia công hoặc giao dịch liên quan, vui lòng liên hệ Admin để xử lý.
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

