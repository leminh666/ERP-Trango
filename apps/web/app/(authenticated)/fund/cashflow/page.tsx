'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { MetricInfo } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { useDefaultTimeFilter } from '@/lib/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Wallet {
  id: string;
  name: string;
  type: string;
}

interface CashflowWallet {
  walletId: string;
  walletName: string;
  walletType: string;
  incomeTotal: number;
  expenseTotal: number;
  transferInTotal: number;
  transferOutTotal: number;
  adjustmentTotal: number;
  netChange: number;
}

interface CashflowTotals {
  incomeTotal: number;
  expenseTotal: number;
  transferInTotal: number;
  transferOutTotal: number;
  adjustmentTotal: number;
  netChange: number;
}

interface CashflowSeries {
  date: string;
  inTotal: number;
  outTotal: number;
  net: number;
}

export default function CashflowPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [byWallet, setByWallet] = useState<CashflowWallet[]>([]);
  const [totals, setTotals] = useState<CashflowTotals>({
    incomeTotal: 0,
    expenseTotal: 0,
    transferInTotal: 0,
    transferOutTotal: 0,
    adjustmentTotal: 0,
    netChange: 0,
  });
  const [series, setSeries] = useState<CashflowSeries[]>([]);

  const { timeFilter, setTimeFilter } = useDefaultTimeFilter();
  const [walletId, setWalletId] = useState('');

  useEffect(() => {
    fetchWallets();
  }, []);

  useEffect(() => {
    fetchCashflow();
  }, [timeFilter, walletId]);

  const fetchWallets = async () => {
    try {
      const data = await apiClient<Wallet[]>('/wallets?includeDeleted=false');
      setWallets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
    }
  };

  const fetchCashflow = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (timeFilter.from) params.append('from', timeFilter.from);
      if (timeFilter.to) params.append('to', timeFilter.to);
      if (walletId) params.append('walletId', walletId);

      const data = await apiClient<{ byWallet: CashflowWallet[]; totals: CashflowTotals; series: CashflowSeries[] }>(`/cashflow?${params.toString()}`);
      setByWallet(Array.isArray(data.byWallet) ? data.byWallet : []);
      setTotals(data.totals || {});
      setSeries(Array.isArray(data.series) ? data.series : []);
    } catch (error) {
      console.error('Failed to fetch cashflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/fund/wallets')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại Sổ quỹ
        </Button>
      </div>

      <PageHeader
        title="Báo cáo dòng tiền"
        description="Theo dõi dòng tiền vào và ra của các ví"
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-full sm:w-auto">
              <Label>Khoảng thời gian</Label>
              <TimeFilter
                value={timeFilter}
                onChange={setTimeFilter}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-auto">
              <Label>Ví</Label>
              <Select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full"
              >
                <option value="">Tất cả các ví</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-gray-500">Tổng thu</p>
              <MetricInfo
                metricKey={METRIC_KEYS.cashflow_totalIncome}
                iconSize={16}
                iconClassName="text-gray-400 hover:text-gray-600 cursor-help shrink-0"
              />
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.incomeTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-gray-500">Tổng chi</p>
              <MetricInfo
                metricKey={METRIC_KEYS.cashflow_totalExpense}
                iconSize={16}
                iconClassName="text-gray-400 hover:text-gray-600 cursor-help shrink-0"
              />
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.expenseTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-gray-500">Điều chỉnh</p>
              <MetricInfo
                metricKey={METRIC_KEYS.cashflow_adjustments}
                iconSize={16}
                iconClassName="text-gray-400 hover:text-gray-600 cursor-help shrink-0"
              />
            </div>
            <p className={`text-2xl font-bold ${totals.adjustmentTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.adjustmentTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-gray-500">Thuần (Net)</p>
              <MetricInfo
                metricKey={METRIC_KEYS.cashflow_net}
                iconSize={16}
                iconClassName="text-gray-400 hover:text-gray-600 cursor-help shrink-0"
              />
            </div>
            <p className={`text-2xl font-bold ${totals.netChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(totals.netChange)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-4">Chi tiết theo ví ({timeFilter.preset === 'custom' ? `${timeFilter.from} - ${timeFilter.to}` : timeFilter.preset})</h3>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : byWallet.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="py-3 px-4">Ví</th>
                    <th className="py-3 px-4 text-right">Thu</th>
                    <th className="py-3 px-4 text-right">Chi</th>
                    <th className="py-3 px-4 text-right">Chuyển vào</th>
                    <th className="py-3 px-4 text-right">Chuyển ra</th>
                    <th className="py-3 px-4 text-right">Điều chỉnh</th>
                    <th className="py-3 px-4 text-right">Thuần</th>
                  </tr>
                </thead>
                <tbody>
                  {byWallet.map((item) => (
                    <tr key={item.walletId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{item.walletName}</td>
                      <td className="py-3 px-4 text-right text-green-600">
                        {formatCurrency(item.incomeTotal)}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600">
                        {formatCurrency(item.expenseTotal)}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-600">
                        {formatCurrency(item.transferInTotal)}
                      </td>
                      <td className="py-3 px-4 text-right text-orange-600">
                        {formatCurrency(item.transferOutTotal)}
                      </td>
                      <td className={`py-3 px-4 text-right ${item.adjustmentTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.adjustmentTotal)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${item.netChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(item.netChange)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="py-3 px-4">Tổng</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatCurrency(totals.incomeTotal)}</td>
                    <td className="py-3 px-4 text-right text-red-600">{formatCurrency(totals.expenseTotal)}</td>
                    <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(totals.transferInTotal)}</td>
                    <td className="py-3 px-4 text-right text-orange-600">{formatCurrency(totals.transferOutTotal)}</td>
                    <td className={`py-3 px-4 text-right ${totals.adjustmentTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totals.adjustmentTotal)}
                    </td>
                    <td className={`py-3 px-4 text-right ${totals.netChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(totals.netChange)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-4">Biến động theo ngày</h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : series.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có dữ liệu theo ngày
            </div>
          ) : (
            <div className="space-y-2">
              {series.slice(0, 30).map((item) => (
                <div key={item.date} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-gray-500">{item.date}</span>
                  <div className="flex-1 h-8 bg-gray-100 rounded overflow-hidden flex">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${Math.min((item.inTotal / (item.inTotal + item.outTotal || 1)) * 100, 100)}%` }}
                    />
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${Math.min((item.outTotal / (item.inTotal + item.outTotal || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={`w-24 text-right text-sm font-medium ${item.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(item.net)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
