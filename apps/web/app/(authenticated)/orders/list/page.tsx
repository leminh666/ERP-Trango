'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TimeFilter } from '@/components/time-filter';
import { OrderSummary } from '@tran-go-hoang-gia/shared';
import { apiClient, unwrapItems } from '@/lib/api';
import { useDefaultTimeFilter } from '@/lib/hooks';
import { Search, Filter, TrendingUp, TrendingDown, Plus, Edit, Trash2, AlertCircle, DollarSign, ArrowDownCircle, ArrowUpCircle, Eye } from 'lucide-react';
import { MetricInfo } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { formatCurrency } from '@/lib/utils';
import { SkeletonTable } from '@/components/skeleton';
import { CreateOrderModal } from '@/components/create-order-modal';
import { EditOrderModal } from '@/components/edit-order-modal';
import { ResponsiveTable } from '@/components/responsive-table';
import { useToast }from '@/components/toast-provider';

const STAGES = [
  { value: '', label: 'Tất cả giai đoạn' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'QUOTING', label: 'Báo giá' },
  { value: 'NEGOTIATING', label: 'Đàm phán' },
  { value: 'IN_PROGRESS', label: 'Đang thi công' },
  { value: 'WON', label: 'Hoàn thành' },
  { value: 'LOST', label: 'Mất' },
];

export default function OrdersListPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { showError } = useToast();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { timeFilter, setTimeFilter } = useDefaultTimeFilter();
  const [stage, setStage] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<OrderSummary | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers();
      fetchOrders();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, timeFilter, stage, customerId, search]);

  const fetchCustomers = async () => {
    try {
      const data = await apiClient<any[]>('/customers?includeDeleted=false');
      setCustomers(unwrapItems(data).map((c: any) => ({ id: c.id, name: c.name })));
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setBanner(null);
      const params = new URLSearchParams();
      params.append('from', timeFilter.from);
      params.append('to', timeFilter.to);
      if (stage) params.append('stage', stage);
      if (customerId) params.append('customerId', customerId);
      if (search) params.append('search', search);

      const data = await apiClient<OrderSummary[]>(`/projects/summary?${params.toString()}`);
      const ordersList = unwrapItems(data) as OrderSummary[];
      setOrders(ordersList);
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      setBanner({ type: 'error', message: error.message || 'Lỗi khi tải đơn hàng' });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'LEAD': return 'bg-gray-100 text-gray-700';
      case 'QUOTING': return 'bg-blue-100 text-blue-700';
      case 'NEGOTIATING': return 'bg-yellow-100 text-yellow-700';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-700';
      case 'WON': return 'bg-emerald-100 text-emerald-700';
      case 'LOST': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStageLabel = (stage: string) => {
    const found = STAGES.find(s => s.value === stage);
    return found?.label || stage;
  };

  // Action handlers
  const handleCreateOrder = () => {
    setShowCreateModal(true);
  };

  const handleEditOrder = async (order: OrderSummary) => {
    try {
      const data = await apiClient<any>(`/projects/${order.projectId}`);
      setEditingOrder(data);
      setShowEditModal(true);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      showError('Lỗi', 'Có lỗi khi tải thông tin đơn hàng');
    }
  };

  const handleDeleteOrder = async () => {
    if (!showDeleteConfirm) return;
    try {
      await apiClient(`/projects/${showDeleteConfirm.projectId}`, { method: 'DELETE' });
      setShowDeleteConfirm(null);
      setSelectedOrderId(null);
      fetchOrders();
      setToast({ type: 'success', message: `Đã xóa đơn hàng "${showDeleteConfirm.code} - ${showDeleteConfirm.name}"` });
    } catch (error: any) {
      console.error('Failed to delete order:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra';
      const statusCode = error.status || 500;
      setToast({ type: 'error', message: `${statusCode}: ${errorMessage}` });
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId === selectedOrderId ? null : orderId);
  };

  // Calculate totals
  const totals = orders.reduce((acc, order) => ({
    rawTotal: acc.rawTotal + (order.rawTotal ?? order.estimatedTotal),
    discountAmount: acc.discountAmount + (order.discountAmount ?? 0),
    estimatedTotal: acc.estimatedTotal + order.estimatedTotal,
    incomeDeposit: acc.incomeDeposit + order.incomeDeposit,
    incomePayment: acc.incomePayment + order.incomePayment,
    incomeFinal: acc.incomeFinal + order.incomeFinal,
    incomeTotal: acc.incomeTotal + order.incomeTotal,
    workshopJobAmount: acc.workshopJobAmount + (order.workshopJobAmount ?? 0),
    expenseTotal: acc.expenseTotal + order.expenseTotal,
    profitL1: acc.profitL1 + order.profitL1,
  }), {
    rawTotal: 0,
    discountAmount: 0,
    estimatedTotal: 0,
    incomeDeposit: 0,
    incomePayment: 0,
    incomeFinal: 0,
    incomeTotal: 0,
    workshopJobAmount: 0,
    expenseTotal: 0,
    profitL1: 0,
  });

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Danh sách đơn hàng" description="Quản lý đơn hàng" />
        <SkeletonTable />
      </div>
    );
  }

  // Redirect to login if not authenticated is handled by useEffect above
  // This component only renders when authenticated

  return (
    <div>
      <PageHeader
        title="Danh sách đơn hàng"
        description="Tổng hợp tài chính theo từng đơn hàng"
        action={
          <Button variant="default" onClick={handleCreateOrder}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo đơn hàng
          </Button>
        }
      />

      {banner && (
        <div className={`mb-4 rounded-md border px-4 py-2 text-sm ${
          banner.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {banner.message}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg border ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <AlertCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-4 text-sm underline hover:no-underline"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* KPI Summary Box */}
      <div className="grid gap-2 sm:grid-cols-3 mb-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded-full shrink-0">
                <ArrowDownCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-green-700 truncate">Tổng thu</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.order_summary_totalIncome}
                    iconSize={14}
                    iconClassName="text-green-500 hover:text-green-700 cursor-help shrink-0"
                  />
                </div>
                <p className="text-base sm:text-lg font-bold text-green-600 truncate">{formatCurrency(totals.incomeTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded-full shrink-0">
                <ArrowUpCircle className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-red-700 truncate">Tổng chi</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.order_summary_totalExpense}
                    iconSize={14}
                    iconClassName="text-red-500 hover:text-red-700 cursor-help shrink-0"
                  />
                </div>
                <p className="text-base sm:text-lg font-bold text-red-600 truncate">{formatCurrency(totals.expenseTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${totals.profitL1 >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full shrink-0 ${totals.profitL1 >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <DollarSign className={`h-4 w-4 ${totals.profitL1 >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className={`text-xs ${totals.profitL1 >= 0 ? 'text-emerald-700' : 'text-red-700'} truncate`}>Lợi nhuận</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.order_summary_profit}
                    iconSize={14}
                    iconClassName={totals.profitL1 >= 0 ? 'text-emerald-500 hover:text-emerald-700 cursor-help shrink-0' : 'text-red-500 hover:text-red-700 cursor-help shrink-0'}
                  />
                </div>
                <p className={`text-base sm:text-lg font-bold ${totals.profitL1 >= 0 ? 'text-emerald-600' : 'text-red-600'} truncate`}>
                  {totals.profitL1 >= 0 ? '+' : ''}{formatCurrency(totals.profitL1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Matching workshop jobs styling */}
      <Card className="mb-4">
        <CardContent className="p-3">
          {/* Using same grid layout as workshop jobs page */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Time Filter */}
            <div className="lg:col-span-3 w-full">
              <TimeFilter 
                value={timeFilter} 
                onChange={setTimeFilter}
                className="w-full"
              />
            </div>
            {/* Stage Select */}
            <div className="lg:col-span-2 w-full">
              <Select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full"
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            {/* Customer Select */}
            <div className="lg:col-span-2 w-full">
              <Select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full"
              >
                <option value="">Tất cả khách hàng</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            {/* Search Input */}
            <div className="lg:col-span-3 w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Mã đơn / Tên đơn..."
                className="pl-10 h-9 w-full text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Filter Toggle */}
            <div className="lg:col-span-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-sm w-full md:w-auto"
              >
                <Filter className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Lọc</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Danh sách đơn hàng</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center">Đang tải...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Không có đơn hàng nào trong khoảng thời gian này
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden">
                {orders.map((order) => (
                  <div
                    key={order.projectId}
                    className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/orders/${order.projectId}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{order.name}</p>
                        <p className="text-sm text-gray-500">{order.code}</p>
                        {order.workshopName && (
                          <p className="text-xs text-gray-500">Xưởng: {order.workshopName}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs shrink-0 ml-2 ${getStageColor(order.stage)}`}>
                        {getStageLabel(order.stage)}
                      </span>
                    </div>

                    {/* Financial badges */}
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <div className="flex flex-col items-start">
                        <span className="px-2 py-1 bg-gray-50 text-gray-800 rounded font-medium">
                          {formatCurrency(order.estimatedTotal)}
                        </span>
                        {(order.discountAmount ?? 0) > 0 && (
                          <span className="text-xs text-orange-600 px-2">
                            CK: -{formatCurrency(order.discountAmount ?? 0)}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                        Thu: {formatCurrency(order.incomeTotal)}
                      </span>
                      <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                        Chi: {formatCurrency(order.expenseTotal)}
                      </span>
                      <span className={`px-2 py-1 rounded font-medium ${
                        order.profitL1 >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {order.profitL1 >= 0 ? '+' : ''}{formatCurrency(order.profitL1)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-3 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditOrder(order);
                        }}
                        className="h-8 px-2 flex-1"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1 text-blue-600" />
                        <span className="text-xs">Sửa</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(order);
                        }}
                        className="h-8 px-2 flex-1"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1 text-red-500" />
                        <span className="text-xs">Xóa</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium">Đơn hàng</th>
                    <th className="text-right p-3 font-medium">Tổng tiền</th>
                    <th className="text-right p-3 font-medium bg-blue-50 text-blue-700">T. Thu</th>
                    <th className="text-right p-3 font-medium bg-red-50 text-red-700">T. Chi</th>
                    <th className="text-right p-3 font-medium bg-green-100 text-green-800">Lợi nhuận</th>
                    <th className="text-left p-3 font-medium w-24">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.projectId}
                      className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${selectedOrderId === order.projectId ? 'bg-blue-50' : ''}`}
                      onClick={() => router.push(`/orders/${order.projectId}`)}
                    >
                      <td className="p-3">
                        <div className="font-medium truncate">{order.name}</div>
                        <div className="text-xs text-gray-500">Mã: {order.code}</div>
                        <div className="text-xs text-gray-400">
                          {order.customerName && <span>KH: {order.customerName}</span>}
                          {order.customerName && order.stage && <span> • </span>}
                          {order.stage && <span>Giai đoạn: {getStageLabel(order.stage)}</span>}
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium truncate bg-gray-50/50">
                        <div>{formatCurrency(order.estimatedTotal)}</div>
                        {(order.discountAmount ?? 0) > 0 && (
                          <div className="text-xs text-orange-600 font-normal">
                            CK: -{formatCurrency(order.discountAmount ?? 0)}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium text-blue-700 bg-blue-50 truncate">
                        {formatCurrency(order.incomeTotal)}
                      </td>
                      <td className="p-3 text-right font-medium text-red-700 bg-red-50/50 truncate">
                        {formatCurrency(order.expenseTotal)}
                      </td>
                      <td className={`p-3 text-right font-medium ${order.profitL1 >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50/50 text-red-700'}`}>
                        {order.profitL1 >= 0 ? '+' : ''}{formatCurrency(order.profitL1)}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditOrder(order);
                            }}
                            title="Sửa"
                              className="hover:bg-blue-100 h-9 w-9"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(order);
                            }}
                            title="Xóa"
                              className="hover:bg-red-100 h-9 w-9"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-medium">
                    <td colSpan={1}className="p-3 text-right">Tổng cộng:</td>
                    <td className="p-3 text-right">
                      <div>{formatCurrency(totals.estimatedTotal)}</div>
                      {totals.discountAmount > 0 && (
                        <div className="text-xs text-orange-600 font-normal">
                          CK: -{formatCurrency(totals.discountAmount)}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right font-medium text-blue-700 bg-blue-50">{formatCurrency(totals.incomeTotal)}</td>
                    <td className="p-3 text-right text-red-700 bg-red-50">{formatCurrency(totals.expenseTotal)}</td>
                    <td className={`p-3 text-right font-medium ${totals.profitL1 >= 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-50'}`}>
                      {totals.profitL1 >= 0 ? '+' : ''}{formatCurrency(totals.profitL1)}
                    </td>
                    <td colSpan={1}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="py-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa?</h3>
              <p className="text-gray-500 mb-4">
                Bạn có chắc muốn xóa đơn hàng &quot;{showDeleteConfirm.code} - {showDeleteConfirm.name}&quot;?
                <br />Đơn hàng sẽ bị ẩn và có thể khôi phục sau.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Hủy</Button>
                <Button variant="destructive" onClick={handleDeleteOrder}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal
          customers={customers}
          onClose={() => setShowCreateModal(false)}
          onCustomerCreated={(newCustomer) => {
            // Update local customer list immediately
            setCustomers(prev => [newCustomer, ...prev]);
          }}
          onCreated={(newOrder) => {
            setShowCreateModal(false);
            fetchOrders();
            setToast({ type: 'success', message: `Đã tạo đơn hàng "${newOrder.name}" thành công!` });
          }}
        />
      )}

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
        <EditOrderModal
          order={{
            id: editingOrder.id,
            name: editingOrder.name,
            customerId: editingOrder.customerId,
            address: editingOrder.address,
            deadline: editingOrder.deadline,
            note: editingOrder.note,
          }}
          customers={customers}
          onClose={() => {
            setShowEditModal(false);
            setEditingOrder(null);
          }}
          onSaved={(updated) => {
            setShowEditModal(false);
            setEditingOrder(null);
            fetchOrders();
            setToast({ type: 'success', message: `Đã cập nhật đơn hàng "${updated.name}"!` });
          }}
        />
      )}
    </div>
  );
}
