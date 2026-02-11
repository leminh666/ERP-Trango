'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { IncomeReportSummary } from '@tran-go-hoang-gia/shared';
import { SafeResponsiveContainer } from '@/components/chart/safe-responsive-container';
import { TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { SkeletonCard } from '@/components/skeleton';
import { apiClient } from '@/lib/api';
import { MetricCardTitle } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

export default function IncomeReportPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<IncomeReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  // Default to this_month as per system requirements
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    preset: 'this_month',
  });

  useEffect(() => {
    if (!authLoading && !token) {
      // Redirect to login if not authenticated
      return;
    }
    if (token) {
      fetchReport();
    }
  }, [token, authLoading, timeFilter]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const result = await apiClient<IncomeReportSummary>(
        `/reports/income-summary?from=${timeFilter.from}&to=${timeFilter.to}`
      );
      setData(result);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chart data - daily series
  const dailyChartData = useMemo(() => {
    if (!data?.series) {
      console.log('[Income] data.series is empty');
      return [];
    }
    console.log('[Income] data.series:', data.series.length, 'items');
    const result = data.series.map((item) => ({
      date: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      amount: item.amount,
    }));
    console.log('[Income] dailyChartData:', result.length, 'items, sample:', result[0]);
    return result;
  }, [data]);

  // Top 5 categories for bar chart
  const topCategoriesChart = useMemo(() => {
    if (!data?.byCategory) {
      console.log('[Income] data.byCategory is empty');
      return [];
    }
    console.log('[Income] data.byCategory:', data.byCategory.length, 'items');
    const result = data.byCategory.slice(0, 8).map((item) => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
      fullName: item.name,
      amount: item.totalAmount,
      percent: item.percent,
    }));
    console.log('[Income] topCategoriesChart:', result.length, 'items');
    return result;
  }, [data]);

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Báo cáo thu" description="Doanh thu theo danh mục" />
        <SkeletonCard />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div>
      <PageHeader
        title="Báo cáo thu"
        description="Doanh thu theo danh mục thu"
        action={<TimeFilter value={timeFilter} onChange={setTimeFilter} />}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <MetricCardTitle 
              label="Tổng doanh thu" 
              metricKey={METRIC_KEYS.incomeReport_total} 
              className="text-sm font-medium text-green-700 flex items-center gap-2"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(data?.total || 0)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              {formatCurrency(data?.total || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <MetricCardTitle 
              label="Số danh mục thu" 
              metricKey={METRIC_KEYS.incomeReport_categoryCount} 
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

        <Card>
          <CardHeader className="pb-2">
            <MetricCardTitle 
              label="TB/Danh mục" 
              metricKey={METRIC_KEYS.incomeReport_averagePerCategory} 
              className="text-sm font-medium text-gray-600 flex items-center gap-2"
              icon={<DollarSign className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">
              {data?.byCategory?.length
                ? formatCurrency((data?.total || 0) / data.byCategory.length)
                : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Trung bình mỗi danh mục</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Daily Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo ngày</CardTitle>
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
                    <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </div>
              </SafeResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Categories Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top danh mục thu nhiều nhất</CardTitle>
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
          <CardTitle>Chi tiết thu theo danh mục</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center">Đang tải...</div>
          ) : !data?.byCategory?.length ? (
            <div className="p-8 text-center text-gray-500">Chưa có dữ liệu thu</div>
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
                    <tr key={item.incomeCategoryId} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 text-right font-medium text-green-600">
                        {formatCurrency(item.totalAmount)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
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
                    <td className="p-3 text-right text-green-600">
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
