'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { SkeletonCard } from '@/components/skeleton';
import { Search, Columns, X, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type KanbanCard = {
  projectId: string;
  code: string;
  name: string;
  stage: string;
  customerId: string | null;
  customerName: string | null;
  estimatedTotal: number;
  incomeTotal: number;
  expenseTotal: number;
  profitL1: number;
  updatedAt: string;
};

type KanbanResponse = {
  stages: string[];
  grouped: Record<string, KanbanCard[]>;
};

export default function OrdersPipelinePage() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [kanban, setKanban] = useState<KanbanResponse | null>(null);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);

  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    preset: 'this_year',
  });
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');

  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [dragFromStage, setDragFromStage] = useState<string | null>(null);
  const [dragToStage, setDragToStage] = useState<string | null>(null);

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Column visibility state
  const [visibleStages, setVisibleStages] = useState<string[]>([]);
  const [hiddenStages, setHiddenStages] = useState<string[]>([]);
  const [showColumnModal, setShowColumnModal] = useState(false);

  // Memoized values - MUST be declared BEFORE any useEffect that uses them
  const stages = useMemo(() => kanban?.stages || [], [kanban]);
  const grouped = useMemo(() => kanban?.grouped || {}, [kanban]);

  // Initialize visible columns when stages load
  useEffect(() => {
    if (stages.length > 0 && visibleStages.length === 0) {
      // Show first 4 columns by default on desktop
      const defaultVisible = stages.slice(0, 4);
      const restHidden = stages.slice(4);
      setVisibleStages(defaultVisible);
      setHiddenStages(restHidden);
    }
  }, [stages, visibleStages.length]);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchKanban();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, timeFilter.from, timeFilter.to, customerId, search]);

  const fetchCustomers = async () => {
    try {
      const data = await apiClient<any[]>(`/customers?search=`);
      setCustomers((data || []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchKanban = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (timeFilter.from) params.append('from', timeFilter.from);
      if (timeFilter.to) params.append('to', timeFilter.to);
      if (search) params.append('search', search);
      if (customerId) params.append('customerId', customerId);

      const data = await apiClient<any>(`/projects/kanban?${params.toString()}`);
      setKanban(data);
    } catch (error) {
      console.error('Failed to fetch kanban:', error);
      setBanner({ type: 'error', message: 'Không tải được Kanban' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyCompact = (amount: number) => {
    if (amount === null || amount === undefined) return '0';
    const n = Number(amount);
    if (Number.isNaN(n)) return '0';
    if (Math.abs(n) >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
    if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('vi-VN');
    } catch {
      return iso;
    }
  };

  const onDragStartCard = (projectId: string, fromStage: string) => {
    setDraggingProjectId(projectId);
    setDragFromStage(fromStage);
    setDragToStage(null);
  };

  const onDragEndReset = () => {
    setDraggingProjectId(null);
    setDragFromStage(null);
    setDragToStage(null);
  };

  const onDropToStage = async (toStage: string) => {
    if (!draggingProjectId || !dragFromStage) return;
    if (toStage === dragFromStage) {
      onDragEndReset();
      return;
    }

    try {
      setBanner(null);
      await apiClient(`/projects/${draggingProjectId}/stage`, {
        method: 'POST',
        body: JSON.stringify({ stage: toStage }),
      });

      setBanner({ type: 'success', message: 'Đã cập nhật stage' });
      await fetchKanban();
    } catch (error) {
      console.error('Failed to update stage:', error);
      setBanner({ type: 'error', message: 'Cập nhật stage thất bại' });
    } finally {
      onDragEndReset();
    }
  };

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Pipeline đơn hàng" description="Theo dõi trạng thái đơn hàng" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!token) return null;

  /**
   * Column Toggle Component
   */
  function ColumnToggle({ stages }: { stages: string[] }) {
    const [localVisible, setLocalVisible] = useState<string[]>(visibleStages);

    useEffect(() => {
      setLocalVisible(visibleStages);
    }, [visibleStages]);

    const handleToggle = (stage: string) => {
      if (localVisible.includes(stage)) {
        if (localVisible.length > 1) {
          setLocalVisible(localVisible.filter(s => s !== stage));
        }
      } else {
        setLocalVisible([...localVisible, stage]);
      }
    };

    const handleSave = () => {
      setVisibleStages(localVisible);
      setHiddenStages(stages.filter(s => !localVisible.includes(s)));
      setShowColumnModal(false);
    };

    const handleReset = () => {
      const defaultVisible = stages.slice(0, 4);
      setLocalVisible(defaultVisible);
    };

    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowColumnModal(true)}
          className="h-8 text-xs"
        >
          <Columns className="h-3.5 w-3.5 mr-1.5" />
          Cột ({visibleStages.length}/{stages.length})
        </Button>

        <Dialog open={showColumnModal} onOpenChange={setShowColumnModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Chọn cột hiển thị</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Chọn các giai đoạn hiển thị trên bảng Kanban
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {stages.map((stage) => (
                  <label
                    key={stage}
                    className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={localVisible.includes(stage)}
                      onChange={() => handleToggle(stage)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm truncate">{stage}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Mặc định
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowColumnModal(false)}>
                    Hủy
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Lưu
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Page Header */}
      <PageHeader
        title="Tiến độ đơn hàng"
        description="Quản lý đơn hàng theo giai đoạn"
        className="shrink-0"
      />

      {/* Banner */}
      {banner && (
        <div
          className={`mx-4 mb-2 rounded-md border px-4 py-2 text-sm shrink-0 ${
            banner.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Filter Bar - Compact 1 row */}
      <Card className="mx-4 mb-3 shrink-0">
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Time Filter - compact */}
            <div className="w-[180px] shrink-0">
              <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
              <TimeFilter value={timeFilter} onChange={setTimeFilter} />
            </div>

            {/* Customer Select - compact */}
            <div className="w-[160px] shrink-0">
              <label className="text-xs text-gray-500 mb-1 block">Khách hàng</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border rounded-md px-2 py-1.5 text-sm"
              >
                <option value="">Tất cả</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search - compact */}
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-gray-500 mb-1 block">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Mã / Tên đơn..."
                  className="pl-9 h-8 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Column Toggle */}
            <div className="shrink-0">
              <label className="text-xs text-gray-500 mb-1 block">Cột hiển thị</label>
              <ColumnToggle stages={stages} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board - Flex grow, no overflow-x */}
      {/* Loading State */}
      {loading || (!kanban && !banner) ? (
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-4 gap-3 h-full">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i}  />
            ))}
          </div>
        </div>
      ) : banner?.type === 'error' ? (
        /* Error State */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-red-600 mb-2 font-medium">{banner.message}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBanner(null);
                fetchKanban();
              }}
            >
              Thử lại
            </Button>
          </div>
        </div>
      ) : stages.length === 0 ? (
        /* Empty State - No stages */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-lg mb-2">Chưa có giai đoạn</div>
            <div className="text-sm">Vui lòng kiểm tra cấu hình pipeline</div>
          </div>
        </div>
      ) : visibleStages.length === 0 ? (
        /* Empty State - No visible columns */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500 mb-2">Chưa chọn cột hiển thị</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnModal(true)}
            >
              Chọn cột
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-4 xl:grid-cols-5 gap-3 h-full px-4 pb-3">
            {visibleStages.map((stage) => {
              const cards = grouped[stage] || [];
              const isDropActive = dragToStage === stage;

              return (
                <div
                  key={stage}
                  className="flex flex-col h-full min-w-0 rounded-lg border bg-gray-50"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragToStage(stage);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropToStage(stage);
                  }}
                >
                  {/* Sticky Header */}
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-b ${
                      isDropActive ? 'border-blue-300 bg-blue-50' : 'bg-gray-100 border-gray-200'
                    }`}
                  >
                    <span className="font-medium text-xs truncate">{stage}</span>
                    <span className="text-xs text-gray-500 shrink-0 ml-2">{cards.length}</span>
                  </div>

                  {/* Cards List - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {cards.map((c) => {
                      const isDragging = draggingProjectId === c.projectId;
                      return (
                        <Card
                          key={c.projectId}
                          draggable
                          onDragStart={() => onDragStartCard(c.projectId, stage)}
                          onDragEnd={onDragEndReset}
                          className={`${isDragging ? 'opacity-60' : ''} cursor-grab active:cursor-grabbing shadow-sm`}
                        >
                          <CardContent className="p-2">
                            {/* Header: Code + Date */}
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-xs font-medium">{c.code}</span>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {new Date(c.updatedAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>

                            {/* Name - max 2 lines */}
                            <div className="text-xs font-medium line-clamp-2 mb-1">
                              {c.name}
                            </div>

                            {/* Customer - 1 line */}
                            <div className="text-[10px] text-gray-600 truncate mb-2">
                              {c.customerName || '—'}
                            </div>

                            {/* KPI Mini - compact */}
                            <div className="grid grid-cols-3 gap-1">
                              <div className="rounded bg-gray-50 px-1.5 py-0.5 text-center">
                                <div className="text-[9px] text-gray-500">T</div>
                                <div className="text-[10px] font-medium text-green-700 truncate">
                                  {formatCurrencyCompact(c.incomeTotal)}
                                </div>
                              </div>
                              <div className="rounded bg-gray-50 px-1.5 py-0.5 text-center">
                                <div className="text-[9px] text-gray-500">C</div>
                                <div className="text-[10px] font-medium text-red-700 truncate">
                                  {formatCurrencyCompact(c.expenseTotal)}
                                </div>
                              </div>
                              <div className="rounded bg-gray-50 px-1.5 py-0.5 text-center">
                                <div className="text-[9px] text-gray-500">L</div>
                                <div className={`text-[10px] font-medium truncate ${
                                  c.profitL1 >= 0 ? 'text-blue-700' : 'text-red-700'
                                }`}>
                                  {formatCurrencyCompact(c.profitL1)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {cards.length === 0 && (
                      <div className="text-[10px] text-gray-400 text-center py-4">
                        Chưa có đơn
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Hidden stages indicator */}
            {hiddenStages.length > 0 && (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <div className="text-center px-3">
                  <div className="text-xs text-gray-500 mb-1">+{hiddenStages.length} cột ẩn</div>
                  <button
                    onClick={() => setShowColumnModal(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Chọn cột
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
