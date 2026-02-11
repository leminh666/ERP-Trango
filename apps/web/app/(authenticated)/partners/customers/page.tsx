'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { CustomerStatus, Customer } from '@tran-go-hoang-gia/shared';
import { Plus, Search, Filter, AlertCircle, Phone, MapPin, Calendar, User, Edit, Trash2 } from 'lucide-react';
import { unwrapItems, apiClient } from '@/lib/api';
import { useDefaultTimeFilter } from '@/lib/hooks';
import { TimeFilter } from '@/components/time-filter';
import { useToast } from '@/components/toast-provider';
import { VisualRenderer } from '@/components/visual-selector';

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

export default function CustomersPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { showSuccess, showError } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { timeFilter, setTimeFilter } = useDefaultTimeFilter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, regionFilter, overdueOnly, timeFilter]);

  const fetchCustomers = async () => {
    try {
      setBanner(null);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (regionFilter) params.append('region', regionFilter);
      if (overdueOnly) params.append('overdueFollowUp', 'true');
      params.append('from', timeFilter.from);
      params.append('to', timeFilter.to);

      const data = await apiClient<Customer[]>(`/customers?${params.toString()}`);
      setCustomers(unwrapItems(data));
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setBanner({ type: 'error', message: 'Lỗi kết nối server' });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (date: Date | string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiClient(`/customers/${id}`, { method: 'DELETE' });
      setDeletingId(null);
      fetchCustomers();
      showSuccess('Thành công', 'Đã xóa khách hàng');
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      if (error.message?.includes('cannot') || error.message?.includes('related') || error.status === 400) {
        showError('Không thể xóa', error.message || 'Khách hàng này có dữ liệu liên quan.');
      } else {
        showError('Lỗi', error.message || 'Có lỗi xảy ra khi xóa');
      }
    } finally {
      setDeleting(false);
    }
  };

  const navigateToDetail = (id: string) => {
    router.push(`/partners/customers/${id}`);
  };

  return (
    <div>
      <PageHeader
        title="Khách hàng"
        description="Quản lý khách hàng CRM"
        action={
          <Link href="/partners/customers/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tạo khách hàng
            </Button>
          </Link>
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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên, SĐT, mã..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 border rounded-md"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <option value="">Tất cả khu vực</option>
              <option value="HCM">HCM</option>
              <option value="Miền Đông">Miền Đông</option>
              <option value="Miền Tây">Miền Tây</option>
              <option value="Miền Trung">Miền Trung</option>
              <option value="Tây Nguyên">Tây Nguyên</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Quá hạn xử lý</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Không có khách hàng nào
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => navigateToDetail(customer.id)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <VisualRenderer
                        visualType={(customer.visualType || 'ICON') as any}
                        iconKey={customer.iconKey || 'users'}
                        imageUrl={customer.imageUrl}
                        color="#3b82f6"
                        className="w-8 h-8"
                      />
                      <span className="text-lg font-semibold truncate">{customer.name}</span>
                      <span className="text-sm text-gray-400">({customer.code})</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[customer.status]}`}>
                        {statusLabels[customer.status]}
                      </span>
                      {customer.tags && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {customer.tags}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.region && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {customer.region}
                        </span>
                      )}
                      {customer.owner && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {customer.owner.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {customer.nextFollowUpAt && (
                      <div className={`flex items-center gap-1 text-sm ${isOverdue(customer.nextFollowUpAt) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        <Calendar className="h-4 w-4" />
                        {isOverdue(customer.nextFollowUpAt) && <AlertCircle className="h-4 w-4" />}
                        {new Date(customer.nextFollowUpAt).toLocaleDateString('vi-VN')}
                        {isOverdue(customer.nextFollowUpAt) && ' (QUÁ HẠN)'}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => router.push(`/partners/customers/${customer.id}`)}
                          className="h-8 w-8 text-blue-600"
                          title="Xem chi tiết"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingId(customer.id)}
                          className="h-8 w-8 text-red-500"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm Delete Modal */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa khách hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa khách hàng này?
              <br /><br />
              Thao tác này sẽ ẩn khách hàng khỏi danh sách và có thể khôi phục sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleting}
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
