'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { isFeatureEnabled } from '@/config/features';
import { PageHeader } from '@/components/page-header';
import { AlertCircle } from 'lucide-react';

/**
 * Trang Nhắc nhở - TẠM THỜI DISABLED
 * Redirect về danh sách đơn hàng
 */
export default function OrdersRemindersPage() {
  const router = useRouter();
  const pathname = usePathname();

  // Redirect về danh sách đơn hàng
  useEffect(() => {
    // Chỉ redirect nếu feature chưa được bật
    if (!isFeatureEnabled('ENABLE_REMINDERS')) {
      console.log('[Reminders] Module disabled, redirecting to /orders/list');
      router.replace('/orders/list');
    }
  }, [router]);

  // Nếu feature được bật, hiển thị thông báo đang phát triển
  if (isFeatureEnabled('ENABLE_REMINDERS')) {
    return (
      <div className="container mx-auto py-8">
        <PageHeader
          title="Nhắc nhở"
          description="Module đang trong quá trình phát triển"
        />
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-blue-500" />
          <p>Module Nhắc nhở đang được phát triển.</p>
          <p className="mt-2">Vui lòng quay lại sau.</p>
        </div>
      </div>
    );
  }

  // Hiển thị loading trong khi redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}
    to: new Date().toISOString().split('T')[0],
    preset: 'this_year',
  });

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      fetchOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, timeFilter.from, timeFilter.to]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (timeFilter.from) params.append('from', timeFilter.from);
      if (timeFilter.to) params.append('to', timeFilter.to);
      params.append('includeDone', 'false');

      const data = await fetchJson<RemindersOverview>(`/reminders/overview?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data) {
        setOverview({
          customerFollowUps: data.customerFollowUps || [],
          staleOrders: data.staleOrders || [],
          workshopJobsDue: data.workshopJobsDue || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch reminders overview:', error);
      const err = error as Error;
      setBanner({ type: 'error', message: err.message || 'Không tải được danh sách nhắc việc' });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('vi-VN');
    } catch {
      return iso;
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('vi-VN');
    } catch {
      return iso;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return overview;
    }

    return {
      customerFollowUps: (overview.customerFollowUps || []).filter((c) => {
        const hay = `${c.customerName} ${c.phone || ''}`.toLowerCase();
        return hay.includes(q);
      }),
      staleOrders: (overview.staleOrders || []).filter((p) => {
        const hay = `${p.code} ${p.name} ${p.customerName || ''} ${p.stage}`.toLowerCase();
        return hay.includes(q);
      }),
      workshopJobsDue: (overview.workshopJobsDue || []).filter((j) => {
        const hay = `${j.code} ${j.title || ''} ${j.workshopName || ''} ${j.projectCode || ''}`.toLowerCase();
        return hay.includes(q);
      }),
    };
  }, [overview, search]);

  const customerOverdue = useMemo(() => (filtered.customerFollowUps || []).filter((c) => c.isOverdue), [filtered]);
  const customerUpcoming = useMemo(() => (filtered.customerFollowUps || []).filter((c) => !c.isOverdue), [filtered]);

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Nhắc việc" description="Trung tâm nhắc việc" />
        <SkeletonList />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div>
      <PageHeader title="Nhắc việc" description="Follow-up khách • đơn stale • phiếu gia công sắp tới hạn" />

      {banner && (
        <div
          className={`mb-4 rounded-md border px-4 py-2 text-sm ${
            banner.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {banner.message}
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-[220px]">
              <label className="text-sm text-gray-500 mb-1 block">Thời gian</label>
              <TimeFilter value={timeFilter} onChange={setTimeFilter} />
            </div>

            <div className="flex-1 min-w-[220px]">
              <label className="text-sm text-gray-500 mb-1 block">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Khách / Mã đơn / Phiếu gia công..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <SkeletonList />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Khách cần xử lý tiếp</CardTitle>
            </CardHeader>
            <CardContent>
              {(filtered.customerFollowUps || []).length === 0 ? (
                <div className="text-sm text-gray-500">Không có nhắc follow-up</div>
              ) : (
                <div className="space-y-4">
                  {customerOverdue.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-red-700 mb-2">Quá hạn</div>
                      <div className="space-y-2">
                        {customerOverdue.map((c) => (
                          <button
                            key={c.customerId}
                            onClick={() => router.push(`/partners/customers/${c.customerId}`)}
                            className="w-full text-left rounded-md border border-red-200 bg-red-50 px-3 py-2 hover:bg-red-100"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{c.customerName}</div>
                                <div className="text-xs text-gray-600">{c.phone || '—'} • {c.note || '—'}</div>
                              </div>
                              <div className="text-xs text-gray-700">{formatDateTime(c.nextFollowUpAt)}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {customerUpcoming.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-yellow-700 mb-2">Sắp tới</div>
                      <div className="space-y-2">
                        {customerUpcoming.map((c) => (
                          <button
                            key={c.customerId}
                            onClick={() => router.push(`/partners/customers/${c.customerId}`)}
                            className="w-full text-left rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 hover:bg-yellow-100"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{c.customerName}</div>
                                <div className="text-xs text-gray-600">{c.phone || '—'} • {c.note || '—'}</div>
                              </div>
                              <div className="text-xs text-gray-700">{formatDateTime(c.nextFollowUpAt)}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Đơn hàng lâu chưa cập nhật</CardTitle>
            </CardHeader>
            <CardContent>
              {(filtered.staleOrders || []).length === 0 ? (
                <div className="text-sm text-gray-500">Không có đơn stale (&gt;= 7 ngày)</div>
              ) : (
                <div className="space-y-2">
                  {(filtered.staleOrders || []).map((p) => (
                    <button
                      key={p.projectId}
                      onClick={() => router.push(`/orders/${p.projectId}`)}
                      className="w-full text-left rounded-md border px-3 py-2 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{p.code} • {p.name}</div>
                          <div className="text-xs text-gray-600">{p.customerName || '—'} • {p.stage}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-700">{p.daysSinceUpdate} ngày</div>
                          <div className="text-xs text-gray-500">{formatDateTime(p.updatedAt)}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phiếu gia công sắp tới hạn</CardTitle>
            </CardHeader>
            <CardContent>
              {(filtered.workshopJobsDue || []).length === 0 ? (
                <div className="text-sm text-gray-500">Không có phiếu gia công có due date</div>
              ) : (
                <div className="space-y-2">
                  {(filtered.workshopJobsDue || []).map((j) => (
                    <button
                      key={j.jobId}
                      onClick={() => router.push(`/workshops/jobs/${j.jobId}`)}
                      className={`w-full text-left rounded-md border px-3 py-2 hover:bg-gray-50 ${
                        j.isOverdue ? 'border-red-200 bg-red-50 hover:bg-red-100' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{j.code} • {j.title || '—'}</div>
                          <div className="text-xs text-gray-600">{j.workshopName || '—'} • {j.projectCode || '—'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-700">Hạn: {formatDate(j.dueDate)}</div>
                          <div className="text-xs text-gray-500">Còn nợ: {formatCurrency(j.debtAmount)}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
