'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth }from '@/contexts/auth-context';
import { PageHeader }from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button }from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VisualRenderer } from '@/components/visual-selector';
import { IconSelectField } from '@/components/icon-select-field';
import { MetricInfo } from '@/components/ui/metric-info';
import { METRIC_KEYS } from '@/lib/metrics/metric-keys';
import { Wallet, WalletType, VisualType } from '@tran-go-hoang-gia/shared';
import { useToast } from '@/components/toast-provider';
 import { Plus, Search, Edit, Trash2, RotateCcw, AlertCircle, TrendingUp, TrendingDown, Landmark, Upload, X } from 'lucide-react';
 import { apiClient, uploadFile, getToken } from '@/lib/api';

const typeLabels: Record<WalletType, string> = {
  CASH: 'Tiền mặt',
  BANK: 'Ngân hàng',
  OTHER: 'Khác',
};

const typeColors: Record<WalletType, string> = {
  CASH: 'bg-green-100 text-green-700',
  BANK: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

export default function WalletsPage() {
  const router = useRouter();
  const { user }= useAuth();
  const { showSuccess, showError } = useToast();

  const [items, setItems] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Wallet | null>(null);
  const [formData, setFormData] = useState<{
    name: string; type: WalletType; visualType: VisualType;
    iconKey: string; imageUrl: string; note: string; openingBalance: number;
  }>({ name: '', type: 'CASH' as WalletType, visualType: 'ICON' as VisualType, iconKey: 'wallet', imageUrl: '', note: '', openingBalance: 0 });
  const [showConfirmDelete, setShowConfirmDelete] = useState<Wallet | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
 const [uploading, setUploading] = useState(false);

  const [cfTotals, setCfTotals] = useState({ incomeTotal: 0, expenseTotal: 0 });
  const [cfLoading, setCfLoading] = useState(true);

  const isAdmin = user?.role === 'ADMIN';

  const fmt = (n: number | undefined) => {
    if (n === undefined || n === null) return '0 d';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  };

  useEffect(() => {
    const t = setTimeout(() => fetchItems(), 300);
    return () => clearTimeout(t);
  }, [search, showDeleted]);

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (showDeleted) params.append('includeDeleted', 'true');
      const data = await apiClient<any[]>(`/wallets?${params}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCfTotals(); }, []);

  const fetchCfTotals = async () => {
    setCfLoading(true);
    try {
      const data = await apiClient<{ totals: { incomeTotal: number; expenseTotal: number } }>('/cashflow');
      setCfTotals({ incomeTotal: data?.totals?.incomeTotal ?? 0, expenseTotal: data?.totals?.expenseTotal ?? 0 });
    } catch (e) { console.error(e); }
    finally { setCfLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { showError('Lỗi', 'Vui lòng nhập tên sổ quỹ'); return; }
    try {
      const url = editingItem ? `/wallets/${editingItem.id}` : '/wallets';
      const method = editingItem ? 'PUT' : 'POST';
      const payload: any = { name: formData.name, type: formData.type, iconType: formData.visualType, iconKey: formData.iconKey, imageUrl: formData.imageUrl, note: formData.note };
      if (!editingItem && formData.openingBalance !== 0) payload.openingBalance = formData.openingBalance;
      await apiClient(url, { method, body: JSON.stringify(payload) });
      setShowModal(false);
      setFormData({ name: '', type: 'CASH' as WalletType, visualType: 'ICON' as VisualType, iconKey: 'wallet', imageUrl: '', note: '', openingBalance: 0 });
      setEditingItem(null);
      fetchItems();
      fetchCfTotals();
      showSuccess('Thành công', editingItem ? 'Cập nhật thành công' : 'Tạo mới thành công');
    } catch (e: any) { showError('Lỗi', e?.message || 'Có lỗi xảy ra'); }
  };

  const handleDelete = async (item: Wallet, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient(`/wallets/${item.id}`, { method: 'DELETE' });
      setShowConfirmDelete(null);
      fetchItems();
      fetchCfTotals();
      showSuccess('Thành công', 'Xóa thành công');
    } catch (e: any) { showError('Xóa thất bại', e?.message || 'Có lỗi xảy ra'); }
  };

  const handleRestore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient(`/wallets/${id}/restore`, { method: 'POST' });
      fetchItems();
      showSuccess('Thành công', 'Khôi phục thành công');
    } catch { showError('Lỗi', 'Có lỗi xảy ra'); }
  };

  const openEdit = (item: Wallet, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setFormData({ name: item.name, type: item.type, visualType: item.visualType, iconKey: item.iconKey || 'wallet', imageUrl: item.imageUrl || '', note: item.note || '', openingBalance: 0 });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', type: 'CASH' as WalletType, visualType: 'ICON' as VisualType, iconKey: 'wallet', imageUrl: '', note: '', openingBalance: 0 });
    setShowModal(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showError('Lỗi', 'Ảnh không được vượt quá 2MB'); return; }
    setUploading(true);
    try {
      const result = await uploadFile('/files/upload', file, { token: getToken() }) as any;
      if (result.url) {
        setFormData(p => ({ ...p, imageUrl: result.url, visualType: 'IMAGE' as VisualType }));
      }else {
        showError('Upload thất bại', result.error || 'Không thể tải ảnh');
      }
    }catch (err: any) {
      showError('Upload thất bại', err?.message || 'Có lỗi xảy ra');
    }finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalBalance = items.filter(w => !w.deletedAt).reduce((s, w) => s + (w.balance || 0), 0);

  return (
    <div>
      <PageHeader
        title="Sổ quỹ"
        description="Quản lý ví tài khoản"
        action={isAdmin && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Tạo sổ quỹ</Button>}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-700 font-medium">Tổng thu</p>
              <MetricInfo metricKey={METRIC_KEYS.cashflow_totalIncome}iconSize={14} iconClassName="text-green-400 hover:text-green-600 cursor-help" />
            </div>
            {cfLoading ? <div className="h-7 bg-green-200 rounded animate-pulse w-28" /> : (
              <p className="text-xl font-bold text-green-700">{fmt(cfTotals.incomeTotal)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700 font-medium">Tổng chi</p>
              <MetricInfo metricKey={METRIC_KEYS.cashflow_totalExpense} iconSize={14} iconClassName="text-red-400 hover:text-red-600 cursor-help" />
            </div>
            {cfLoading ? <div className="h-7 bg-red-200 rounded animate-pulse w-28" /> : (
              <p className="text-xl font-bold text-red-700">{fmt(cfTotals.expenseTotal)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-700 font-medium">Dư quỹ</p>
              <MetricInfo metricKey={METRIC_KEYS.cashflow_net}iconSize={14} iconClassName="text-blue-400 hover:text-blue-600 cursor-help" />
            </div>
            {loading ? <div className="h-7 bg-blue-200 rounded animate-pulse w-28" /> : (
              <p className="text-xl font-bold text-blue-700">{fmt(totalBalance)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Tìm kiếm ví..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {isAdmin && (
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} className="rounded" />
                <span>Hiện đã xóa</span>
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i}className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">Chưa có sổ quỹ nào</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${item.deletedAt ? 'opacity-60 bg-gray-50' : ''}`}
              onClick={() => !item.deletedAt && router.push(`/fund/wallets/${item.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                      <VisualRenderer visualType={item.visualType}iconKey={item.iconKey || 'wallet'} imageUrl={item.imageUrl} color="#3b82f6" className="w-8 h-8" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{item.name}</span>
                        <span className="text-xs text-gray-400">({item.code})</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[item.type]}`}>{typeLabels[item.type]}</span>
                        {item.deletedAt && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">Đã xóa</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-base font-bold text-green-600">{fmt(item.balance)}</span>
                        <span className="text-xs text-gray-400">{item._count?.transactions || 0} giao dịch</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isAdmin && (item.deletedAt ? (
                      <Button size="icon" variant="outline" onClick={(e) => handleRestore(item.id, e)}><RotateCcw className="h-4 w-4" /></Button>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" onClick={(e) => openEdit(item, e)}><Edit className="h-4 w-4 text-blue-600" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setShowConfirmDelete(item)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader><CardTitle>{editingItem ? 'Sửa sổ quỹ' : 'Tạo sổ quỹ mới'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên sổ quỹ *</label>
                <Input value={formData.name}onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Nhập tên sổ quỹ..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loại sổ quỹ</label>
                <select className="w-full px-3 py-2 border rounded-md" value={formData.type} onChange={(e) => setFormData(p => ({ ...p, type: e.target.value as WalletType }))}>
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK">Ngân hàng</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <IconSelectField iconKey={formData.iconKey} onIconKeyChange={(ik) => setFormData(p => ({ ...p, iconKey: ik, visualType: 'ICON' as VisualType }))} color="#3b82f6" />
              </div>
              {/* Logo upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Logo / Ảnh đại diện</label>
                {formData.imageUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={formData.imageUrl} alt="Logo preview" className="w-16 h-16 rounded-lg object-cover border" />
                    <Button size="sm" variant="outline" onClick={() => setFormData(p => ({ ...p, imageUrl: '', visualType: 'ICON' as VisualType }))}>
                      <X className="h-4 w-4 mr-1" />Xóa logo
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" />{uploading ? 'Đang tải...' : 'Tải lên logo'}
                  </Button>
                )}
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP — tối đa 2MB</p>
              </div>
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium mb-1">Số dư ban đầu (VND)</label>
                  <Input type="number" value={formData.openingBalance || ''}onChange={(e) => setFormData(p => ({ ...p, openingBalance: parseFloat(e.target.value) || 0 }))}placeholder="0" min="0" />
                  <p className="text-xs text-gray-500 mt-1">Để 0 nếu chưa có số dư</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea className="w-full px-3 py-2 border rounded-md" rows={2}value={formData.note} onChange={(e) => setFormData(p => ({ ...p, note: e.target.value }))} placeholder="Ghi chú thêm..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                <Button onClick={handleSave}>{editingItem ? 'Cập nhật' : 'Tạo mới'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
          <Card className="w-full max-w-sm">
            <CardContent className="py-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa?</h3>
              <p className="text-gray-500 mb-4">Bạn có chắc muốn xóa &quot;{showConfirmDelete.name}&quot;?<br />Sổ quỹ sẽ bị ẩn và có thể khôi phục sau.</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Hủy</Button>
                <Button variant="destructive" onClick={(e) => handleDelete(showConfirmDelete, e)}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <input type="file" ref={fileInputRef} accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
    </div>
  );
}