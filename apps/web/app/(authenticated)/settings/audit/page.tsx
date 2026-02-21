'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SkeletonCard } from '@/components/skeleton';
import { AuthGuard } from '@/components/auth-guard';
import { Eye, Search, Filter, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { DateInput } from '@/components/common/date-input';

interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  byUserId: string;
  byUserEmail: string | null;
  createdAt: string;
  ip: string | null;
}

interface AuditLogDetail extends AuditLog {
  beforeJson: Record<string, any> | null;
  afterJson: Record<string, any> | null;
  userAgent: string | null;
}

const ENTITIES = [
  { value: '', label: 'Tất cả' },
  { value: 'Transaction', label: 'Giao dịch' },
  { value: 'Wallet', label: 'Ví/Sổ quỹ' },
  { value: 'IncomeCategory', label: 'Danh mục thu' },
  { value: 'ExpenseCategory', label: 'Danh mục chi' },
  { value: 'Product', label: 'Sản phẩm' },
  { value: 'Customer', label: 'Khách hàng' },
  { value: 'Supplier', label: 'Nhà cung cấp' },
  { value: 'Workshop', label: 'Xưởng gia công' },
  { value: 'Settings', label: 'Cấu hình hệ thống' },
];

const ACTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'CREATE', label: 'Tạo mới' },
  { value: 'UPDATE', label: 'Cập nhật' },
  { value: 'DELETE', label: 'Xóa (mềm)' },
  { value: 'RESTORE', label: 'Khôi phục' },
  { value: 'SETTING_UPDATE', label: 'Cập nhật cấu hình' },
  { value: 'STAGE_CHANGE', label: 'Đổi giai đoạn' },
];

export default function SettingsAuditPage() {
  const { token, user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Detail drawer
  const [selectedLog, setSelectedLog] = useState<AuditLogDetail | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/403');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchLogs();
    }
  }, [page, entity, action, fromDate, toDate, user]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (entity) params.append('entity', entity);
      if (action) params.append('action', action);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (search) params.append('q', search);

      const data = await apiClient<{ items: AuditLog[]; total: number }>(`/audit-logs?${params}`);
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const viewDetail = async (log: AuditLog) => {
    try {
      const data = await apiClient<AuditLogDetail>(`/audit-logs/${log.id}`);
      setSelectedLog(data);
      setShowDrawer(true);
    } catch (error) {
      console.error('Failed to fetch audit log detail:', error);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'RESTORE':
        return 'bg-yellow-100 text-yellow-800';
      case 'SETTING_UPDATE':
        return 'bg-purple-100 text-purple-800';
      case 'STAGE_CHANGE':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      CREATE: 'Tạo mới',
      UPDATE: 'Cập nhật',
      DELETE: 'Xóa (mềm)',
      RESTORE: 'Khôi phục',
      SETTING_UPDATE: 'Cấu hình',
      STAGE_CHANGE: 'Đổi giai đoạn',
    };
    return actionMap[action] || action;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN');
  };

  const formatJson = (data: any) => {
    if (!data) return '{}';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return <SkeletonCard />;
  }

  return (
    <AuthGuard requiredRoles={['ADMIN']}>
      <div className="space-y-6">
        <PageHeader
          title="Nhật ký hoạt động"
          description="Theo dõi lịch sử thay đổi dữ liệu trong hệ thống"
        />

        {/* Filter Bar */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
              <div className="w-full sm:w-auto">
                <Label htmlFor="search">Tìm kiếm</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Entity ID hoặc Email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
              </div>

              <div className="w-full sm:w-auto">
                <Label htmlFor="entity">Thực thể</Label>
                <Select
                  id="entity"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                >
                  {ENTITIES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-full sm:w-auto">
                <Label htmlFor="action">Hành động</Label>
                <Select
                  id="action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  {ACTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-full sm:w-auto">
                <Label htmlFor="fromDate">Từ ngày</Label>
                <DateInput
                  id="fromDate"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="w-full sm:w-auto">
                <Label htmlFor="toDate">Đến ngày</Label>
                <DateInput
                  id="toDate"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              <Button type="submit" variant="secondary">
                <Filter className="h-4 w-4 mr-2" />
                Lọc
              </Button>

              <Button type="button" variant="ghost" onClick={() => {
                setSearch('');
                setEntity('');
                setAction('');
                setFromDate('');
                setToDate('');
              }}>
                <X className="h-4 w-4 mr-2" />
                Xóa lọc
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Không có dữ liệu
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Thời gian</th>
                    <th className="text-left py-3 px-4 font-medium">Người dùng</th>
                    <th className="text-left py-3 px-4 font-medium">Thực thể</th>
                    <th className="text-left py-3 px-4 font-medium">Hành động</th>
                    <th className="text-left py-3 px-4 font-medium">Entity ID</th>
                    <th className="text-left py-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-4 text-sm">{log.byUserEmail || log.byUserId}</td>
                      <td className="py-3 px-4 text-sm">{log.entity}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-xs">{log.entityId}</td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetail(log)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Xem
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {!loading && logs.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Tổng: {total} bản ghi
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Trước
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    Trang {page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * pageSize >= total}
                    onClick={() => setPage(page + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Drawer */}
      {showDrawer && selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setShowDrawer(false)}>
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chi tiết thay đổi</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowDrawer(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Thời gian</Label>
                  <p className="font-medium">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Người thực hiện</Label>
                  <p className="font-medium">{selectedLog.byUserEmail || selectedLog.byUserId}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Thực thể</Label>
                  <p className="font-medium">{selectedLog.entity}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Hành động</Label>
                  <p className="font-medium">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                      {formatAction(selectedLog.action)}
                    </span>
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-500">Entity ID</Label>
                  <p className="font-mono text-sm">{selectedLog.entityId}</p>
                </div>
                {selectedLog.ip && (
                  <div>
                    <Label className="text-gray-500">IP Address</Label>
                    <p className="font-mono text-sm">{selectedLog.ip}</p>
                  </div>
                )}
              </div>

              {/* Before JSON */}
              {selectedLog.beforeJson && (
                <div>
                  <Label className="text-gray-500 mb-2 block">Trước thay đổi (Before)</Label>
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {formatJson(selectedLog.beforeJson)}
                  </pre>
                </div>
              )}

              {/* After JSON */}
              {selectedLog.afterJson && (
                <div>
                  <Label className="text-gray-500 mb-2 block">Sau thay đổi (After)</Label>
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {formatJson(selectedLog.afterJson)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
