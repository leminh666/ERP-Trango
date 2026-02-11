'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { CustomerRegionsReport } from '@tran-go-hoang-gia/shared';
import { SafeResponsiveContainer } from '@/components/chart/safe-responsive-container';
import { Users, MapPin, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
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
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

import { fetchJson } from '@/lib/api';

export default function CustomerRegionsReportPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<CustomerRegionsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    preset: 'this_year',
  });

  useEffect(() => {
    if (!authLoading && !token) return;
    if (token) fetchReport();
  }, [token, authLoading, timeFilter]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        from: timeFilter.from,
        to: timeFilter.to,
      });
      // Fix 401: Truyền token vào fetchJson
      const result = await fetchJson<CustomerRegionsReport>(`/reports/customer-regions?${query}`, { token });
      setData(result);
    } catch (error) {
      console.error('Failed to fetch regions report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    if (!data?.byRegion) return { customers: 0, orders: 0, revenue: 0, expense: 0, profit: 0 };
    return {
      customers: data.byRegion.reduce((sum, r) => sum + r.customerCount, 0),
      orders: data.byRegion.reduce((sum, r) => sum + r.orderCount, 0),
      revenue: data.byRegion.reduce((sum, r) => sum + r.revenueTotal, 0),
      expense: data.byRegion.reduce((sum, r) => sum + r.expenseTotal, 0),
      profit: data.byRegion.reduce((sum, r) => sum + r.profitL1, 0),
    };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.byRegion) return [];
    return data.byRegion.slice(0, 10).map((item) => ({
      region: item.region || 'Chưa xác định',
      customers: item.customerCount,
      orders: item.orderCount,
      revenue: item.revenueTotal,
      profit: item.profitL1,
    }));
  }, [data]);

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Báo cáo theo khu vực" description="Phân tích khách hàng theo vùng miền" />
        <SkeletonCard />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div>
      <PageHeader
        title="Báo cáo theo khu vực"
        description="Phân tích khách hàng và doanh thu theo vùng miền"
        action={<TimeFilter value={timeFilter} onChange={setTimeFilter} />}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tổng khách
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">{totals.customers}</div>
            <p className="text-xs text-gray-500 mt-1">Khách hàng trong hệ thống</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Số khu vực
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">{data?.byRegion?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Vùng miền có khách</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Số đơn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totals.orders}</div>
            <p className="text-xs text-blue-600 mt-1">Đơn hàng trong kỳ</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Doanh thu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totals.revenue)}</div>
            <p className="text-xs text-green-600 mt-1">{formatCurrency(totals.revenue)}</p>
          </CardContent>
        </Card>

        <Card className={totals.profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${totals.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              <TrendingUp className="h-4 w-4" />
              Lợi nhuận L1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(totals.profit)}
            </div>
            <p className={`text-xs mt-1 ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo khu vực</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">Đang tải...</div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Chưa có dữ liệu
              </div>
            ) : (
              <SafeResponsiveContainer loading={loading} minHeight={300} className="h-full">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatCompactCurrency} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="region" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} name="Doanh thu" />
                </BarChart>
              </SafeResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Số khách theo khu vực</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">Đang tải...</div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Chưa có dữ liệu
              </div>
            ) : (
              <SafeResponsiveContainer loading={loading} minHeight={300} className="h-full">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="region" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip formatter={(value: number | undefined) => (value || 0).toString()} />
                  <Bar dataKey="customers" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Số khách" />
                </BarChart>
              </SafeResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Regions */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 khu vực nhiều khách nhất</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.topRegionsByCustomers?.length ? (
              <div className="p-8 text-center text-gray-500">Chưa có dữ liệu</div>
            ) : (
              <div className="p-4 space-y-3">
                {data.topRegionsByCustomers.map((item, index) => (
                  <div key={item.region} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-6">{index + 1}</span>
                    <span className="flex-1 font-medium">{item.region}</span>
                    <span className="text-sm text-gray-600">{item.customerCount} khách</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${data.topRegionsByCustomers[0] ? (item.customerCount / data.topRegionsByCustomers[0].customerCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 khu vực doanh thu cao nhất</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.topRegionsByRevenue?.length ? (
              <div className="p-8 text-center text-gray-500">Chưa có dữ liệu</div>
            ) : (
              <div className="p-4 space-y-3">
                {data.topRegionsByRevenue.map((item, index) => (
                  <div key={item.region} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-6">{index + 1}</span>
                    <span className="flex-1 font-medium">{item.region}</span>
                    <span className="text-sm text-green-600">{formatCurrency(item.revenueTotal)}</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${data.topRegionsByRevenue[0] ? (item.revenueTotal / data.topRegionsByRevenue[0].revenueTotal) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết theo khu vực</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center">Đang tải...</div>
          ) : !data?.byRegion?.length ? (
            <div className="p-8 text-center text-gray-500">Chưa có dữ liệu</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium">Khu vực</th>
                    <th className="text-right p-3 font-medium">Số khách</th>
                    <th className="text-right p-3 font-medium">Số đơn</th>
                    <th className="text-right p-3 font-medium">Doanh thu</th>
                    <th className="text-right p-3 font-medium">Chi phí</th>
                    <th className="text-right p-3 font-medium">Lợi nhuận L1</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byRegion.map((item) => (
                    <tr key={item.region} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.region || 'Chưa xác định'}</td>
                      <td className="p-3 text-right">{item.customerCount}</td>
                      <td className="p-3 text-right">{item.orderCount}</td>
                      <td className="p-3 text-right font-medium text-green-600">
                        {formatCurrency(item.revenueTotal)}
                      </td>
                      <td className="p-3 text-right text-red-600">
                        {formatCurrency(item.expenseTotal)}
                      </td>
                      <td
                        className={`p-3 text-right font-medium ${
                          item.profitL1 >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(item.profitL1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-medium">
                    <td className="p-3 text-right">Tổng cộng:</td>
                    <td className="p-3 text-right">{totals.customers}</td>
                    <td className="p-3 text-right">{totals.orders}</td>
                    <td className="p-3 text-right text-green-600">{formatCurrency(totals.revenue)}</td>
                    <td className="p-3 text-right text-red-600">{formatCurrency(totals.expense)}</td>
                    <td className="p-3 text-right text-green-600">{formatCurrency(totals.profit)}</td>
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
