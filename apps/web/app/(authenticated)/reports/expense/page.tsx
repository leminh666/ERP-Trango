'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { ExpenseReportSummary } from '@tran-go-hoang-gia/shared';
import { SafeResponsiveContainer } from '@/components/chart/safe-responsive-container';
import { TrendingDown, DollarSign, BarChart3, Building2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import { SkeletonCard } from '@/components/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MetricCardTitle } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899'];

import { fetchJson } from '@/lib/api';

export default function ExpenseReportPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<ExpenseReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCommonCost, setShowCommonCost] = useState(false);
  // Default to this_year as per system requirements
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    preset: 'this_year',
  });

  useEffect(() => {
    if (!authLoading && !token) return;
    if (token) fetchReport();
  }, [token, authLoading, timeFilter, showCommonCost]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        from: timeFilter.from,
        to: timeFilter.to,
      });
      if (showCommonCost) query.append('isCommonCost', 'true');
      // Fix 401: Truyền token vào fetchJson
      const result = await fetchJson<ExpenseReportSummary>(`/reports/expense-summary?${query}`, { token });
      setData(result);
    } catch (error) {
      console.error('Failed to fetch expense report:', error);
    } finally {
      setLoading(false);
    }
  };

  const dailyChartData = useMemo(() => {
    if (!data?.series) {
      console.log('[Expense] data.series is empty');
      return [];
    }
    console.log('[Expense] data.series:', data.series.length, 'items');
    const result = data.series.map((item) => ({
      date: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      amount: item.amount,
    }));
    console.log('[Expense] dailyChartData:', result.length, 'items, sample:', result[0]);
    return result;
  }, [data]);

  const topCategoriesChart = useMemo(() => {
    if (!data?.byCategory) {
      console.log('[Expense] data.byCategory is empty');
      return [];
    }
    console.log('[Expense] data.byCategory:', data.byCategory.length, 'items');
    const result = data.byCategory.slice(0, 8).map((item) => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
      amount: item.totalAmount,
      percent: item.percent,
    }));
    console.log('[Expense] topCategoriesChart:', result.length, 'items');
    return result;
  }, [data]);

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Báo cáo chi" description="Chi phí theo danh mục" />
        <SkeletonCard />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div>
      <PageHeader
        title="Báo cáo chi"
        description="Chi phí theo danh mục"
        action={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="common-cost"
                checked={showCommonCost}
                onCheckedChange={setShowCommonCost}
              />
              <Label htmlFor="common-cost" className="text-sm">
                Chỉ chi phí chung
              </Label>
            </div>
            <TimeFilter value={timeFilter} onChange={setTimeFilter} />
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <MetricCardTitle 
              label="Tổng chi" 
              metricKey={METRIC_KEYS.expenseReport_total} 
              className="text-sm font-medium text-red-700 flex items-center gap-2"
              icon={<TrendingDown className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(data?.total || 0)}
            </div>
            <p className="text-xs text-red-600 mt-1">
              {formatCurrency(data?.total || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <MetricCardTitle 
              label="Chi theo đơn" 
              metricKey={METRIC_KEYS.expenseReport_directTotal} 
              className="text-sm font-medium text-blue-700 flex items-center gap-2"
              icon={<DollarSign className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(data?.directTotal || 0)}
            </div>
            <p className="text-xs text-blue-600 mt-1">Chi trực tiếp dự án</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <MetricCardTitle 
              label="Chi phí chung" 
              metricKey={METRIC_KEYS.expenseReport_commonTotal} 
              className="text-sm font-medium text-orange-700 flex items-center gap-2"
              icon={<Building2 className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {formatCurrency(data?.commonTotal || 0)}
            </div>
            <p className="text-xs text-orange-600 mt-1">Chi phí vận hành</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <MetricCardTitle 
              label="Số danh mục" 
              metricKey={METRIC_KEYS.expenseReport_categoryCount} 
              className="text-sm font-medium text-gray-600 flex items-center gap-2"
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">
              {data?.byCategory?.length || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Danh mục có phát sinh</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Chi phí theo ngày</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">Đang tải...</div>
            ) : dailyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Chưa có dữ liệu
              </div>
            ) : (
              <SafeResponsiveContainer loading={loading} minHeight={250} className="h-full">
                <div style={{ width: '100%', height: 250 }}>
                  <BarChart data={dailyChartData} style={{ width: '100%', height: '100%' }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                    <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                    <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </div>
              </SafeResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top danh mục chi nhiều nhất</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">Đang tải...</div>
            ) : topCategoriesChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Chưa có dữ liệu
              </div>
            ) : (
              <SafeResponsiveContainer loading={loading} minHeight={250} className="h-full">
                <div style={{ width: '100%', height: 250 }}>
                  <BarChart data={topCategoriesChart} layout="vertical" style={{ width: '100%', height: '100%' }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={formatCompactCurrency} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                    <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {topCategoriesChart.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </div>
              </SafeResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết chi theo danh mục</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center">Đang tải...</div>
          ) : !data?.byCategory?.length ? (
            <div className="p-8 text-center text-gray-500">Chưa có dữ liệu chi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium">Hạng mục</th>
                    <th className="text-right p-3 font-medium">Tổng tiền</th>
                    <th className="text-right p-3 font-medium">Tỷ trọng</th>
                    <th className="text-center p-3 font-medium">Xếp hạng</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((item, index) => (
                    <tr key={item.expenseCategoryId} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 text-right font-medium text-red-600">
                        {formatCurrency(item.totalAmount)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="text-xs">{item.percent}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            index === 0
                              ? 'bg-yellow-100 text-yellow-700'
                              : index === 1
                              ? 'bg-gray-200 text-gray-700'
                              : index === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          #{index + 1}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-medium">
                    <td className="p-3 text-right">Tổng cộng:</td>
                    <td className="p-3 text-right text-red-600">
                      {formatCurrency(data.total)}
                    </td>
                    <td className="p-3 text-right">100%</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
