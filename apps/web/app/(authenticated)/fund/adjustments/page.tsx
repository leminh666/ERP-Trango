'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, RefreshCw, ArrowLeft, Plus, Minus, X } from 'lucide-react';
import { MoneyInput } from '@/components/common/money-input';
import { useToast } from '@/components/toast-provider';

interface Wallet {
  id: string;
  name: string;
  type: string;
}

interface Adjustment {
  id: string;
  date: string;
  amount: number;
  note: string | null;
  wallet: Wallet;
  deletedAt: string | null;
}

export default function AdjustmentsPage() {
  const { token, user }= useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';
  const { showSuccess, showError, showWarning } = useToast();

  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [walletId, setWalletId] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    walletId: '',
    amount: '',
    note: '',
  });
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWallets();
    fetchAdjustments();
  }, [walletId]);

  const fetchWallets = async () => {
    try {
      const data = await apiClient<Wallet[]>('/wallets?includeDeleted=false');
      setWallets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
    }
  };

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (walletId) params.append('walletId', walletId);

      const data = await apiClient<Adjustment[]>(`/adjustments?${params.toString()}`);
      setAdjustments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch adjustments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.walletId || !formData.amount) {
      showWarning('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    const amount = adjustmentType === 'increase'
      ? parseFloat(formData.amount)
      : -parseFloat(formData.amount);

    setSubmitting(true);
    try {
      await apiClient('/adjustments', {
        method: 'POST',
        body: {
          date: formData.date,
          walletId: formData.walletId,
          amount,
          note: formData.note,
        },
      });

      setShowModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        walletId: '',
        amount: '',
        note: '',
      });
      fetchAdjustments();
    }catch (error: any) {
      console.error('Failed to create adjustment:', error);
      showError('Tạo thất bại', error.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient(`/adjustments/${id}`, { method: 'DELETE' });
      setConfirmDeleteId(null);
      fetchAdjustments();
      showSuccess('Xóa thành công');
    } catch (error: any) {
      console.error('Failed to delete adjustment:', error);
      showError('Xóa thất bại', (error as any)?.message || 'Có lỗi xảy ra');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await apiClient(`/adjustments/${id}/restore`, { method: 'POST' });
      fetchAdjustments();
    } catch (error) {
      console.error('Failed to restore adjustment:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Math.abs(amount));
    return amount < 0 ? `-${formatted}` : formatted;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
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
        title="Điều chỉnh số dư"
        description="Quản lý điều chỉnh số dư ví"
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
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
            {isAdmin && (
              <div className="ml-auto">
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Điều chỉnh số dư
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : adjustments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có điều chỉnh số dư
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Ngày</th>
                  <th className="text-left py-3 px-4 font-medium">Ví</th>
                  <th className="text-left py-3 px-4 font-medium">Số tiền điều chỉnh</th>
                  <th className="text-left py-3 px-4 font-medium">Ghi chú</th>
                  <th className="text-left py-3 px-4 font-medium">Trạng thái</th>
                  {isAdmin && <th className="text-left py-3 px-4 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{formatDate(adj.date)}</td>
                    <td className="py-3 px-4 text-sm">{adj.wallet?.name || '-'}</td>
                    <td className="py-3 px-4 text-sm font-medium">
                      <span className={adj.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(adj.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{adj.note || '-'}</td>
                    <td className="py-3 px-4">
                      {adj.deletedAt ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                          Đã xóa
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          Hoạt động
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        {adj.deletedAt ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(adj.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Khôi phục
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeleteId(adj.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Confirm Delete Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Xác nhận xóa?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Bạn có chắc muốn xóa điều chỉnh này?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Hủy</Button>
                <Button variant="destructive" onClick={() => handleDelete(confirmDeleteId)}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Custom Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Điều chỉnh số dư</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Ngày *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ví *</Label>
                  <Select
                    value={formData.walletId}
                    onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Chọn ví</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Loại điều chỉnh *</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="adjustmentType"
                        checked={adjustmentType === 'increase'}
                        onChange={() => setAdjustmentType('increase')}
                      />
                      <Plus className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Tăng</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="adjustmentType"
                        checked={adjustmentType === 'decrease'}
                        onChange={() => setAdjustmentType('decrease')}
                      />
                      <Minus className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">Giảm</span>
                    </label>
                  </div>
                </div>
                <div>
                  <Label>Số tiền *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Nhập số tiền"
                  />
                </div>
                <div>
                  <Label>Ghi chú</Label>
                  <Input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Nhập ghi chú (tùy chọn)"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowModal(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreate} disabled={submitting}>
                    {submitting ? 'Đang tạo...' : 'Tạo điều chỉnh'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
