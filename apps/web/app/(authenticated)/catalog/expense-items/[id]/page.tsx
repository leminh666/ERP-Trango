'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VisualRenderer } from '@/components/visual-selector';
import { ArrowLeft, Calendar, DollarSign, FileText, RefreshCw } from 'lucide-react';
import { ExpenseCategory, Transaction } from '@tran-go-hoang-gia/shared';
import { apiClient } from '@/lib/api';

interface UsageData {
  category: ExpenseCategory;
  usage: {
    items: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    totals: {
      count: number;
      amount: string;
    };
  };
}

export default function ExpenseCategoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const categoryId = params.id as string;

  useEffect(() => {
    if (categoryId) {
      fetchUsage();
    }
  }, [categoryId, from, to]);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (from) queryParams.append('from', from);
      if (to) queryParams.append('to', to);

      const data = await apiClient<UsageData>(`/expense-categories/${categoryId}/usage?${queryParams}`);
      setData(data);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        {loading ? (
          <div className="text-gray-500">Đang tải...</div>
        ) : (
          <Card className="w-full max-w-md">
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">Không tìm thấy dữ liệu</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/catalog/expense-items')}>
                Quay lại danh sách
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const { category, usage } = data;

  return (
    <div>
      <PageHeader
        title={`Danh mục chi: ${category.name}`}
        description={`Mã: ${category.code}`}
        action={
          <Button variant="outline" onClick={() => router.push('/catalog/expense-items')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        }
      />

      {/* Category Info Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <VisualRenderer
              visualType={category.visualType}
              iconKey={category.iconKey || 'shopping-cart'}
              imageUrl={category.imageUrl}
              color={category.color || '#ef4444'}
              className="w-16 h-16"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold">{category.name}</h3>
                {category.deletedAt && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                    Đã xóa
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mb-4">Mã: {category.code}</p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <div className="text-sm text-blue-600">Tổng giao dịch</div>
                  <div className="text-xl font-semibold text-blue-700">{usage.totals.count}</div>
                </div>
                <div className="bg-red-50 px-4 py-2 rounded-lg">
                  <div className="text-sm text-red-600">Tổng tiền</div>
                  <div className="text-xl font-semibold text-red-700">
                    {Number(usage.totals.amount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Từ ngày</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Đến ngày</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" onClick={() => { setFrom(''); setTo(''); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Đặt lại
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Danh sách giao dịch
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : usage.items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có giao dịch nào sử dụng danh mục này
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Mã phiếu</th>
                    <th className="text-left py-3 px-4 font-medium">Ngày</th>
                    <th className="text-left py-3 px-4 font-medium">Ví</th>
                    <th className="text-right py-3 px-4 font-medium">Số tiền</th>
                    <th className="text-left py-3 px-4 font-medium">Ghi chú</th>
                    <th className="text-left py-3 px-4 font-medium">Đơn hàng</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.items.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{tx.code}</td>
                      <td className="py-3 px-4">
                        {tx.date ? new Date(tx.date).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="py-3 px-4">{' - '}</td>
                      <td className="py-3 px-4 text-right font-medium text-red-600">
                        -{Number(tx.amount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                      </td>
                      <td className="py-3 px-4 text-gray-500 truncate max-w-xs">{tx.note || '-'}</td>
                      <td className="py-3 px-4">{' - '}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {usage.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={usage.pagination.page === 1}
                onClick={() => {
                  const p = usage.pagination.page - 1;
                  // Would need to add page state
                }}
              >
                Trang trước
              </Button>
              <span className="flex items-center px-4 text-sm">
                Trang {usage.pagination.page} / {usage.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={usage.pagination.page === usage.pagination.totalPages}
                onClick={() => {
                  const p = usage.pagination.page + 1;
                  // Would need to add page state
                }}
              >
                Trang sau
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

