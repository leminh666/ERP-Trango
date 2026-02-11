'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TimeFilter } from '@/components/time-filter';
import { SkeletonTable } from '@/components/skeleton';
import { useToast } from '@/components/toast-provider';
import { apiClient, unwrapItems } from '@/lib/api';
import { useDefaultTimeFilter } from '@/lib/hooks';
import { ArrowUpCircle, Search, Filter, Plus } from 'lucide-react';

interface ExpenseTransaction {
  id: string;
  code: string;
  date: string;
  amount: number;
  note: string | null;
  wallet: {
    id: string;
    name: string;
  } | null;
  expenseCategory: {
    id: string;
    name: string;
  } | null;
  project: {
    id: string;
    code: string;
    name: string;
  } | null;
  workshopJob: {
    id: string;
    code: string;
  } | null;
  createdAt: string;
}

interface ExpenseSummary {
  totalAmount: number;
  count: number;
}

export default function ExpensesPage() {
  const { token, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { timeFilter, setTimeFilter } = useDefaultTimeFilter();

  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [wallets, setWallets] = useState<Array<{ id: string; name: string }>>([]);
  const [expenseCategories, setExpenseCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      fetchWallets();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchExpenses();
    }
  }, [token, timeFilter, search]);

  const fetchWallets = async () => {
    try {
      const data = await apiClient<any[]>('/wallets');
      setWallets(
        data
          .filter((w: any) => !w.deletedAt)
          .map((w: any) => ({ id: w.id, name: w.name })),
      );
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('type', 'EXPENSE');
      params.append('from', timeFilter.from);
      params.append('to', timeFilter.to);
      if (search) params.append('search', search);

      const data = await apiClient<any[]>(`/transactions?${params.toString()}`);
      const expenseList = (unwrapItems(data) as ExpenseTransaction[])
        .filter((tx: any) => tx.type === 'EXPENSE');

      setExpenses(expenseList);

      // Calculate summary
      const totalAmount = expenseList.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
      setSummary({
        totalAmount,
        count: expenseList.length,
      });
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  if (authLoading) {
    return (
      <div>
        <PageHeader title="Chi tiền" description="Quản lý phiếu chi" />
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
        title="Chi tiền"
        description="Danh sách phiếu chi toàn hệ thống"
        action={
          user?.role === 'ADMIN' && (
            <Button onClick={() => router.push('/fund/expenses/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo phiếu chi
            </Button>
          )
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-red-700">Tổng chi</p>
                <p className="text-lg font-bold text-red-800">
                  {formatCurrency(summary?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-700">Số phiếu chi</p>
                <p className="text-lg font-bold text-gray-800">
                  {summary?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-3 w-full">
              <TimeFilter
                value={timeFilter}
                onChange={setTimeFilter}
                className="w-full"
              />
            </div>
            <div className="lg:col-span-6 w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm mã phiếu, ghi chú..."
                className="pl-10 h-9 w-full text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="lg:col-span-3 flex justify-end">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1.5" />
                Lọc
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-red-600" />
            Danh sách phiếu chi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center">Đang tải...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Chưa có phiếu chi nào trong khoảng thời gian này
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium">Mã phiếu</th>
                    <th className="text-left p-3 font-medium">Ngày</th>
                    <th className="text-left p-3 font-medium">Số tiền</th>
                    <th className="text-left p-3 font-medium">Ví</th>
                    <th className="text-left p-3 font-medium">Danh mục chi</th>
                    <th className="text-left p-3 font-medium">Đơn hàng</th>
                    <th className="text-left p-3 font-medium">Phiếu gia công</th>
                    <th className="text-left p-3 font-medium">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{tx.code}</td>
                      <td className="p-3">{formatDate(tx.date)}</td>
                      <td className="p-3 text-right font-medium text-red-600">
                        {formatCurrency(Number(tx.amount))}
                      </td>
                      <td className="p-3">{tx.wallet?.name || '-'}</td>
                      <td className="p-3">{tx.expenseCategory?.name || '-'}</td>
                      <td className="p-3">
                        {tx.project ? (
                          <span className="text-blue-600">{tx.project.code}</span>
                        ) : '-'}
                      </td>
                      <td className="p-3">
                        {tx.workshopJob ? (
                          <span className="text-orange-600">{tx.workshopJob.code}</span>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-gray-500 max-w-xs truncate">
                        {tx.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-medium">
                    <td colSpan={2} className="p-3 text-right">Tổng cộng:</td>
                    <td className="p-3 text-right text-red-600 font-bold">
                      {formatCurrency(summary?.totalAmount || 0)}
                    </td>
                    <td colSpan={6}></td>
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

