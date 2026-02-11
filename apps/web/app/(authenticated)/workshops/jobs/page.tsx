'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeFilter } from '@/components/time-filter';
import { Select } from '@/components/ui/select';
import { SkeletonTable } from '@/components/skeleton';
import { useToast } from '@/components/toast-provider';
import { MetricInfo } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { Factory, Search, Plus, Filter, Edit, Trash2, X } from 'lucide-react';
import { CreateWorkshopJobModal } from '@/components/create-workshop-job-modal';
import { unwrapItems, apiClient } from '@/lib/api';
import { useDefaultTimeFilter } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface WorkshopJobListItem {
  id: string;
  code: string;
  amount: number;
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
  paidAmount: number;
  debtAmount: number;
}

interface WorkshopJobSummary {
  totalJobAmount: number;
  totalPaidAmount: number;
  totalDebtAmount: number;
}

interface WorkshopOption {
  id: string;
  name: string;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
  customerName?: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'DONE', label: 'Hoàn thành' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'SENT', label: 'Đã gửi' },
  { value: 'CANCELLED', label: 'Hủy' },
];

export default function WorkshopJobsPage() {
  const { token, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [jobs, setJobs] = useState<WorkshopJobListItem[]>([]);
  const [summary, setSummary] = useState<WorkshopJobSummary | null>(null);
  const [workshops, setWorkshops] = useState<WorkshopOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { timeFilter, setTimeFilter } = useDefaultTimeFilter();
  const [status, setStatus] = useState('');
  const [workshopId, setWorkshopId] = useState('');
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingJob, setEditingJob] = useState<WorkshopJobListItem | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<WorkshopJobListItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      fetchWorkshops();
      fetchProjects();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchJobs();
      fetchSummary();
    }
  }, [token, timeFilter, status, workshopId, search]);

  const fetchWorkshops = async () => {
    try {
      const data = await apiClient<any[]>('/workshops');
      setWorkshops(
        data
          .filter((w: any) => !w.deletedAt)
          .map((w: any) => ({ id: w.id, name: w.name })),
      );
    } catch (error) {
      console.error('Failed to fetch workshops:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await apiClient<any[]>('/projects');
      const projectsData = unwrapItems(data)
        .filter((p: any) => !p.deletedAt)
        .map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          customerName: p.customer?.name || '',
        }));
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setBanner(null);
      const params = new URLSearchParams();
      params.append('from', timeFilter.from);
      params.append('to', timeFilter.to);
      if (status) params.append('status', status);
      if (workshopId) params.append('workshopId', workshopId);
      if (search) params.append('search', search);

      const data = await apiClient<any[]>(`/workshop-jobs?${params.toString()}`);
      
      setJobs(
        unwrapItems(data).map((j: any) => ({
          ...j,
          amount: Number(j.amount || 0),
          paidAmount: Number(j.paidAmount || 0),
          debtAmount: Number(j.amount || 0) - Number(j.paidAmount || 0),
        })),
      );
    } catch (error) {
      console.error('Failed to fetch workshop jobs:', error);
      setBanner({ type: 'error', message: 'Lỗi kết nối server' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      params.append('from', timeFilter.from);
      params.append('to', timeFilter.to);
      if (status) params.append('status', status);
      if (workshopId) params.append('workshopId', workshopId);

      const data = await apiClient<any>(`/workshop-jobs/summary?${params.toString()}`);
      setSummary({
        totalJobAmount: Number(data.totalJobAmount || 0),
        totalPaidAmount: Number(data.totalPaidAmount || 0),
        totalDebtAmount: Number(data.totalDebtAmount || 0),
      });
    } catch (error) {
      console.error('Failed to fetch workshop job summary:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleCreated = () => {
    setShowCreateModal(false);
    fetchJobs();
    fetchSummary();
  };

  const handleEdit = (job: WorkshopJobListItem) => {
    setEditingJob(job);
    setShowEditModal(true);
  };

  const handleDelete = async (job: WorkshopJobListItem) => {
    try {
      await apiClient(`/workshop-jobs/${job.id}`, { method: 'DELETE' });
      setShowConfirmDelete(null);
      fetchJobs();
      fetchSummary();
      showSuccess('Thành công', 'Đã xóa phiếu gia công');
    } catch (error: any) {
      console.error('Failed to delete:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra khi xóa');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingJob) return;
    // For now, just close the modal - full edit would require implementing form
    setShowEditModal(false);
    setEditingJob(null);
  };

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Phiếu gia công" description="Quản lý phiếu gia công theo đơn hàng" />
        <SkeletonTable />
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Phiếu gia công"
        description="Quản lý phiếu gia công và công nợ xưởng"
        action={
          isAdmin ? (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              + Phiếu gia công
            </Button>
          ) : null
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Factory className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-blue-700 truncate">Tổng tiền gia công</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.workshopJob_summary_total}
                    iconSize={16}
                    iconClassName="text-blue-500 hover:text-blue-700 cursor-help shrink-0"
                  />
                </div>
                <p className="text-lg font-bold text-blue-800">{formatCurrency(summary?.totalJobAmount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Factory className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-green-700 truncate">Đã thanh toán</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.workshopJob_summary_paid}
                    iconSize={16}
                    iconClassName="text-green-500 hover:text-green-700 cursor-help shrink-0"
                  />
                </div>
                <p className="text-lg font-bold text-green-800">{formatCurrency(summary?.totalPaidAmount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <Factory className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-red-700 truncate">Công nợ gia công</p>
                  <MetricInfo
                    metricKey={METRIC_KEYS.workshopJob_summary_debt}
                    iconSize={16}
                    iconClassName="text-red-500 hover:text-red-700 cursor-help shrink-0"
                  />
                </div>
                <p className="text-lg font-bold text-red-800">{formatCurrency(summary?.totalDebtAmount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar - Responsive Grid */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* TimeFilter - lg:col-span-3 */}
            <div className="lg:col-span-3 w-full">
              <TimeFilter 
                value={timeFilter} 
                onChange={setTimeFilter}
                className="w-full"
              />
            </div>

            {/* Status Select - lg:col-span-2 */}
            <div className="lg:col-span-2 w-full">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Workshop Select - lg:col-span-2 */}
            <div className="lg:col-span-2 w-full">
              <Select
                value={workshopId}
                onChange={(e) => setWorkshopId(e.target.value)}
                className="w-full"
              >
                <option value="">Tất cả xưởng</option>
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Search - lg:col-span-3 */}
            <div className="lg:col-span-3 w-full relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Mã phiếu / Tiêu đề..."
                className="pl-9 h-9 w-full text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter Toggle - lg:col-span-2 */}
            <div className="lg:col-span-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn(
                  'h-9 px-3 text-sm w-full md:w-auto',
                  showAdvanced && 'bg-gray-100'
                )}
              >
                <Filter className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Lọc</span>
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3 pt-3 border-t">
              <div className="md:col-span-12">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span>Hiện đã xóa</span>
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-orange-600" />
            Danh sách phiếu gia công
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center">Đang tải...</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Chưa có phiếu gia công nào trong khoảng thời gian này
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium">Mã phiếu</th>
                    <th className="text-left p-3 font-medium">Đơn hàng</th>
                    <th className="text-left p-3 font-medium">Xưởng</th>
                    <th className="text-right p-3 font-medium">Tổng tiền</th>
                    <th className="text-right p-3 font-medium">Đã trả</th>
                    <th className="text-right p-3 font-medium">Công nợ</th>
                    <th className="text-left p-3 font-medium">Trạng thái</th>
                    <th className="text-left p-3 font-medium">Ghi chú</th>
                    <th className="text-left p-3 font-medium w-24">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/workshops/jobs/${job.id}`)}
                    >
                      <td className="p-3 font-medium">{job.code}</td>
                      <td className="p-3">
                        <div className="font-medium">{job.project?.name}</div>
                        <div className="text-xs text-gray-500">{job.project?.code}</div>
                      </td>
                      <td className="p-3">{job.workshop?.name}</td>
                      <td className="p-3 text-right font-medium text-blue-600">
                        {formatCurrency(job.amount)}
                      </td>
                      <td className="p-3 text-right text-green-600">
                        {job.paidAmount > 0 ? formatCurrency(job.paidAmount) : '-'}
                      </td>
                      <td className="p-3 text-right text-red-600">
                        {job.debtAmount > 0 ? formatCurrency(job.debtAmount) : '0'}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                          {job.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 max-w-xs truncate">
                        {job.note || '-'}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(job)}
                            title="Sửa"
                            className="hover:bg-blue-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowConfirmDelete(job)}
                            title="Xóa"
                            className="hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditModal && editingJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sửa phiếu gia công</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => {
                setShowEditModal(false);
                setEditingJob(null);
              }}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-700">{editingJob.code}</p>
                <p className="text-xs text-blue-600">
                  {editingJob.project?.code} - {editingJob.project?.name}
                </p>
              </div>
              <p className="text-sm text-gray-500 text-center py-4">
                Chức năng sửa đang được phát triển. Vui lòng vào trang chi tiết để chỉnh sửa.
              </p>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowEditModal(false);
                  setEditingJob(null);
                }}>Đóng</Button>
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
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa?</h3>
              <p className="text-gray-500 mb-4">
                Bạn có chắc muốn xóa phiếu <strong>{showConfirmDelete.code}</strong>?
                <br />Thao tác này không thể hoàn tác.
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
      {showCreateModal && (
        <CreateWorkshopJobModal
          projects={projects}
          workshops={workshops}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
