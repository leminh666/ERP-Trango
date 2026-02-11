'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { DashboardData } from '@tran-go-hoang-gia/shared';
import { fetchJson } from '@/lib/api';
import { SafeResponsiveContainer } from '@/components/chart/safe-responsive-container';
import { MetricCardTitle } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Factory,
  Truck,
  Plus,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  // Default to this_year for Dashboard overview (per user request)
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    preset: 'this_year',
  });

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/login');
    }
  }, [token, isLoading, router]);

  useEffect(() => {
    if (token && timeFilter.from && timeFilter.to) {
      fetchDashboardData();
    }
  }, [token, timeFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fix 401: Truyền token vào fetchJson
      const result = await fetchJson<DashboardData>(`/reports/dashboard?from=${timeFilter.from}&to=${timeFilter.to}`, { token });
      if (result && typeof result === 'object') {
        setData(result);
      } else {
        setData(null);
        console.error('Invalid dashboard data:', result);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!data?.series) {
      console.log('[Dashboard] data.series is empty/undefined');
      return [];
    }
    console.log('[Dashboard] data.series:', data.series.length, 'items');
    const result = data.series.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      }),
    }));
    console.log('[Dashboard] chartData:', result.length, 'items, sample:', result[0]);
    return result;
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Đang chuyển hướng...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Tổng quan tình hình kinh doanh"
        action={
          <div className="flex items-center gap-2">
            <TimeFilter value={timeFilter} onChange={setTimeFilter} />
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Revenue */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2 px-4 pt-4">
            <MetricCardTitle 
              label="Tổng doanh thu" 
              metricKey={METRIC_KEYS.cashbook_totalIncome} 
            />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-green-700 truncate">
              {formatCurrency(data?.revenueTotal || 0)}
            </div>
            <p className="text-xs text-green-600 mt-1 truncate">
              {formatCurrency(data?.revenueTotal || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Expense */}
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2 px-4 pt-4">
            <MetricCardTitle 
              label="Tổng chi phí" 
              metricKey={METRIC_KEYS.cashbook_totalExpense} 
            />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-red-700 truncate">
              {formatCurrency(data?.expenseTotal || 0)}
            </div>
            <p className="text-xs text-red-600 mt-1 truncate">
              {formatCurrency(data?.expenseTotal || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Profit */}
        <Card
          className={
            (data?.profit || 0) >= 0
              ? 'bg-blue-50 border-blue-200'
              : 'bg-orange-50 border-orange-200'
          }
        >
          <CardHeader className="pb-2 px-4 pt-4">
            <MetricCardTitle 
              label="Lợi nhuận" 
              metricKey={METRIC_KEYS.cashbook_net} 
            />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div
              className={`text-xl sm:text-2xl font-bold truncate ${
                (data?.profit || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}
            >
              {formatCurrency(data?.profit || 0)}
            </div>
            <p
              className={`text-xs mt-1 truncate ${
                (data?.profit || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}
            >
              {formatCurrency(data?.profit || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Transactions Count */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="truncate">Số giao dịch</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-gray-700 truncate">
              {data?.series?.reduce(
                (sum, s) =>
                  sum +
                  (s.revenue > 0 ? 1 : 0) +
                  (s.expense > 0 ? 1 : 0),
                0
              ) || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate">Giao dịch trong kỳ</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Thao tác nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => router.push('/orders/list')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tạo đơn hàng
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/cashbook/income')}
            >
              <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
              Tạo phiếu thu
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/cashbook/expense')}
            >
              <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
              Tạo phiếu chi
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/ai-entry')}
            >
              <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
              Nhập liệu AI
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Doanh thu vs Chi phí</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          {loading ? (
            <div className="h-[268px] flex items-center justify-center">
              Đang tải dữ liệu...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[268px] flex items-center justify-center text-gray-500">
              Chưa có dữ liệu trong khoảng thời gian này
            </div>
          ) : (
            <SafeResponsiveContainer loading={false} minHeight={268} className="h-[268px]">
              <div style={{ width: '100%', height: 268 }}>
                <LineChart data={chartData} style={{ width: '100%', height: '100%' }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatCompactCurrency}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => formatCurrency(value || 0)}
                  labelFormatter={(label) => `Ngày: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Chi phí"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
              </div>
            </SafeResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Debt Tables */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* AR - Customer Debts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Công nợ khách hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.arTop && data.arTop.length > 0 ? (
              <div className="space-y-3">
                {data.arTop.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-gray-500">
                        {customer.phone || 'Chưa có SĐT'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded ${
                          customer.status === 'NEW'
                            ? 'bg-blue-100 text-blue-700'
                            : customer.status === 'CONTACTED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {customer.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {customer.followUpCount} lần liên hệ
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                Không có công nợ khách hàng
              </p>
            )}
          </CardContent>
        </Card>

        {/* AP - Workshop Debts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Factory className="h-5 w-5 text-orange-600" />
              Công nợ xưởng gia công
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.apWorkshopTop && data.apWorkshopTop.length > 0 ? (
              <div className="space-y-3">
                {data.apWorkshopTop.map((workshop) => (
                  <div
                    key={workshop.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium text-sm">{workshop.name}</p>
                      <p className="text-xs text-gray-500">
                        {workshop.phone || 'Chưa có SĐT'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {workshop.note || 'Không có ghi chú'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                Không có công nợ xưởng
              </p>
            )}
          </CardContent>
        </Card>

        {/* AP - Supplier Debts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              Công nợ nhà cung cấp
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.apSupplierTop && data.apSupplierTop.length > 0 ? (
              <div className="space-y-3">
                {data.apSupplierTop.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium text-sm">{supplier.name}</p>
                      <p className="text-xs text-gray-500">
                        {supplier.phone || 'Chưa có SĐT'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {supplier.note || 'Không có ghi chú'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                Không có công nợ NCC
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
