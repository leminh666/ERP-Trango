'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input }from '@/components/ui/input';
import { DateInput } from '@/components/common/date-input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, RefreshCw, ArrowLeft, Plus, X } from 'lucide-react';
import { MoneyInput } from '@/components/common/money-input';
import { useToast } from '@/components/toast-provider';

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
  const { showSuccess, showError, showWarning } = useToast();

  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [walletId, setWalletId] = useState('');
  const [walletToId, setWalletToId] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
      showWarning('Thiáº¿u thÃ´ng tin', 'Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c');
      return;
    }

    if (formData.walletId === formData.walletToId) {
      showWarning('KhÃ´ng há»£p lá»‡', 'VÃ­ nguá»“n vÃ  vÃ­ Ä‘Ã­ch pháº£i khÃ¡c nhau');
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
      showSuccess('Chuyá»ƒn khoáº£n thÃ nh cÃ´ng');
    } catch (error: any) {
      console.error('Failed to create transfer:', error);
      showError('Chuyá»ƒn khoáº£n tháº¥t báº¡i', error.message || 'CÃ³ lá»—i xáº£y ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient(`/transfers/${id}`, { method: 'DELETE' });
      setConfirmDeleteId(null);
      fetchTransfers();
      showSuccess('XÃ³a thÃ nh cÃ´ng');
    } catch (error: any) {
      console.error('Failed to delete transfer:', error);
      showError('XÃ³a tháº¥t báº¡i', (error as any)?.message || 'CÃ³ lá»—i xáº£y ra');
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
          Quay láº¡i Sá»• quá»¹
        </Button>
      </div>

      <PageHeader
        title="Chuyá»ƒn khoáº£n ná»™i bá»™"
        description="Quáº£n lÃ½ chuyá»ƒn tiá»n giá»¯a cÃ¡c vÃ­"
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-full sm:w-auto">
              <Label>Tá»« vÃ­</Label>
              <Select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full"
              >
                <option value="">Táº¥t cáº£ vÃ­ nguá»“n</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <Label>Äáº¿n vÃ­</Label>
              <Select
                value={walletToId}
                onChange={(e) => setWalletToId(e.target.value)}
                className="w-full"
              >
                <option value="">Táº¥t cáº£ vÃ­ Ä‘Ã­ch</option>
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
                  Chuyá»ƒn ná»™i bá»™
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
              ChÆ°a cÃ³ chuyá»ƒn khoáº£n ná»™i bá»™
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">NgÃ y</th>
                  <th className="text-left py-3 px-4 font-medium">Tá»« vÃ­</th>
                  <th className="text-left py-3 px-4 font-medium">Äáº¿n vÃ­</th>
                  <th className="text-left py-3 px-4 font-medium">Sá»‘ tiá»n</th>
                  <th className="text-left py-3 px-4 font-medium">Ghi chÃº</th>
                  <th className="text-left py-3 px-4 font-medium">Tráº¡ng thÃ¡i</th>
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
                          ÄÃ£ xÃ³a
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          Hoáº¡t Ä‘á»™ng
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
                            KhÃ´i phá»¥c
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeleteId(transfer.id)}
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
              <CardTitle>XÃ¡c nháº­n xÃ³a?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a chuyá»ƒn khoáº£n nÃ y?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Há»§y</Button>
                <Button variant="destructive" onClick={() => handleDelete(confirmDeleteId)}>XÃ³a</Button>
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
              <CardTitle>Chuyá»ƒn ná»™i bá»™</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>NgÃ y *</Label>
                  <DateInput
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tá»« vÃ­ *</Label>
                  <Select
                    value={formData.walletId}
                    onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Chá»n vÃ­ nguá»“n</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Äáº¿n vÃ­ *</Label>
                  <Select
                    value={formData.walletToId}
                    onChange={(e) => setFormData({ ...formData, walletToId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Chá»n vÃ­ Ä‘Ã­ch</option>
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
                  <Label>Sá»‘ tiá»n *</Label>
                  <MoneyInput
                    value={formData.amount ? parseFloat(formData.amount) : 0}
                    onChange={(val) => setFormData({ ...formData, amount: String(val) })}
                    placeholder="Nháº­p sá»‘ tiá»n"
                    required
                  />
                </div>
                <div>
                  <Label>Ghi chÃº</Label>
                  <Input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Nháº­p ghi chÃº (tÃ¹y chá»n)"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowModal(false)}>
                    Há»§y
                  </Button>
                  <Button onClick={handleCreate} disabled={submitting}>
                    {submitting ? 'Äang táº¡o...' : 'Táº¡o chuyá»ƒn khoáº£n'}
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

