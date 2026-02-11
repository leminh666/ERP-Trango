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
import { Trash2, RefreshCw, ArrowLeft, Plus, X } from 'lucide-react';
import { MoneyInput } from '@/components/common/money-input';

interface Wallet {
  id: string;
  name: string;
  type: string;
}

interface Transfer {
  id: string;
  code: string;
  date: string;
  amount: number;
  note: string | null;
  wallet: Wallet;
  walletTo: Wallet;
  deletedAt: string | null;
}

export default function TransfersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [walletId, setWalletId] = useState('');
  const [walletToId, setWalletToId] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    walletId: '',
    walletToId: '',
    amount: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWallets();
    fetchTransfers();
  }, [walletId, walletToId]);

  const fetchWallets = async () => {
    try {
      const data = await apiClient<Wallet[]>('/wallets?includeDeleted=false');
      setWallets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
    }
  };

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (walletId) params.append('walletId', walletId);
      if (walletToId) params.append('walletToId', walletToId);

      const data = await apiClient<Transfer[]>(`/transfers?${params.toString()}`);
      setTransfers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.walletId || !formData.walletToId || !formData.amount) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (formData.walletId === formData.walletToId) {
      alert('Ví nguồn và ví đích phải khác nhau');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient('/transfers', {
        method: 'POST',
        body: {
          date: formData.date,
          walletId: formData.walletId,
          walletToId: formData.walletToId,
          amount: parseFloat(formData.amount),
          note: formData.note,
        },
      });

      setShowModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        walletId: '',
        walletToId: '',
        amount: '',
        note: '',
      });
      fetchTransfers();
    } catch (error: any) {
      console.error('Failed to create transfer:', error);
      alert(error.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa chuyển khoản này?')) return;

    try {
      await apiClient(`/transfers/${id}`, { method: 'DELETE' });
      fetchTransfers();
    } catch (error) {
      console.error('Failed to delete transfer:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await apiClient(`/transfers/${id}/restore`, { method: 'POST' });
      fetchTransfers();
    } catch (error) {
      console.error('Failed to restore transfer:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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
        title="Chuyển khoản nội bộ"
        description="Quản lý chuyển tiền giữa các ví"
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-full sm:w-auto">
              <Label>Từ ví</Label>
              <Select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full"
              >
                <option value="">Tất cả ví nguồn</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <Label>Đến ví</Label>
              <Select
                value={walletToId}
                onChange={(e) => setWalletToId(e.target.value)}
                className="w-full"
              >
                <option value="">Tất cả ví đích</option>
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
                  Chuyển nội bộ
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
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có chuyển khoản nội bộ
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Ngày</th>
                  <th className="text-left py-3 px-4 font-medium">Từ ví</th>
                  <th className="text-left py-3 px-4 font-medium">Đến ví</th>
                  <th className="text-left py-3 px-4 font-medium">Số tiền</th>
                  <th className="text-left py-3 px-4 font-medium">Ghi chú</th>
                  <th className="text-left py-3 px-4 font-medium">Trạng thái</th>
                  {isAdmin && <th className="text-left py-3 px-4 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{formatDate(transfer.date)}</td>
                    <td className="py-3 px-4 text-sm">{transfer.wallet?.name || '-'}</td>
                    <td className="py-3 px-4 text-sm">{transfer.walletTo?.name || '-'}</td>
                    <td className="py-3 px-4 text-sm font-medium">{formatCurrency(transfer.amount)}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{transfer.note || '-'}</td>
                    <td className="py-3 px-4">
                      {transfer.deletedAt ? (
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
                        {transfer.deletedAt ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(transfer.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Khôi phục
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(transfer.id)}
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

      {/* Custom Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Chuyển nội bộ</CardTitle>
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
                  <Label>Từ ví *</Label>
                  <Select
                    value={formData.walletId}
                    onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Chọn ví nguồn</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Đến ví *</Label>
                  <Select
                    value={formData.walletToId}
                    onChange={(e) => setFormData({ ...formData, walletToId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Chọn ví đích</option>
                    {wallets
                      .filter((w) => w.id !== formData.walletId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                  </Select>
                </div>
                <div>
                  <Label>Số tiền *</Label>
                  <MoneyInput
                    value={formData.amount ? parseFloat(formData.amount) : 0}
                    onChange={(val) => setFormData({ ...formData, amount: String(val) })}
                    placeholder="Nhập số tiền"
                    required
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
                    {submitting ? 'Đang tạo...' : 'Tạo chuyển khoản'}
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
