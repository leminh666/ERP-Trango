'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconRenderer } from '@/components/icon-picker';
import { VisualRenderer } from '@/components/visual-selector';
import { IconSelectField } from '@/components/icon-select-field';
import { Wallet, WalletType, VisualType } from '@tran-go-hoang-gia/shared';
import { useToast } from '@/components/toast-provider';
import { Plus, Search, Edit, Trash2, RotateCcw, AlertCircle, Upload } from 'lucide-react';
import { apiClient, uploadFile, getApiBaseUrl } from '@/lib/api';

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
  const { token, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Wallet | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: WalletType;
    visualType: VisualType;
    iconKey: string;
    imageUrl: string;
    note: string;
    openingBalance: number;
  }>({
    name: '',
    type: 'CASH' as WalletType,
    visualType: 'ICON' as VisualType,
    iconKey: 'wallet',
    imageUrl: '',
    note: '',
    openingBalance: 0,
  });
  const [showConfirmDelete, setShowConfirmDelete] = useState<Wallet | null>(null);
  const [showLogoUploader, setShowLogoUploader] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  // Format VND currency
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, showDeleted]);

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (showDeleted) params.append('includeDeleted', 'true');
      const data = await apiClient<any[]>(`/wallets?${params}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLogo = async (file: File) => {
    console.log('[DEBUG] API URL:', getApiBaseUrl());
    setUploading(true);
    try {
      // Direct call to backend port 4000
      const result = await uploadFile('/files/upload', file, { token }) as any;
      if (result.url) {
        setFormData((prev) => ({ ...prev, imageUrl: result.url }));
        setShowLogoUploader(false);
        showSuccess('Thành công', 'Đã tải lên logo');
      } else {
        setShowLogoUploader(false);
        showError('Upload thất bại', result.error || 'Vui lòng thử lại');
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setShowLogoUploader(false);
      showError('Upload thất bại', error.message || 'Có lỗi xảy ra khi tải lên');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập tên sổ quỹ');
      return;
    }
    if (formData.visualType === 'ICON' && !formData.iconKey) {
      showError('Lỗi nhập liệu', 'Vui lòng chọn icon');
      return;
    }
    if (formData.visualType === 'IMAGE' && !formData.imageUrl) {
      showError('Lỗi nhập liệu', 'Vui lòng tải lên logo');
      return;
    }

    try {
      const url = editingItem
        ? `/wallets/${editingItem.id}`
        : '/wallets';
      const method = editingItem ? 'PUT' : 'POST';

      // Build payload - only include openingBalance when creating new
      const payload: any = {
        name: formData.name,
        type: formData.type,
        iconType: formData.visualType,
        iconKey: formData.iconKey,
        imageUrl: formData.imageUrl,
        note: formData.note,
      };

      if (!editingItem && formData.openingBalance !== 0) {
        payload.openingBalance = formData.openingBalance;
      }

      await apiClient(url, {
        method,
        body: JSON.stringify(payload),
      });

      setShowModal(false);
      setFormData({ name: '', type: 'CASH' as WalletType, visualType: 'ICON' as VisualType, iconKey: 'wallet', imageUrl: '', note: '', openingBalance: 0 });
      setEditingItem(null);
      fetchItems();
      showSuccess('Thành công', editingItem ? 'Cập nhật thành công' : 'Tạo mới thành công');
    } catch (error: any) {
      console.error('Failed to save:', error);
      const message = error?.message || 'Có lỗi xảy ra khi lưu';
      showError('Lỗi', message);
    }
  };

  const handleDelete = async (item: Wallet, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient(`/wallets/${item.id}`, { method: 'DELETE' });
      setShowConfirmDelete(null);
      fetchItems();
      showSuccess('Thành công', 'Xóa thành công');
    } catch (error: any) {
      console.error('Failed to delete:', error);
      const message = error?.message || 'Có lỗi xảy ra khi xóa';
      showError('Xóa thất bại', message);
    }
  };

  const handleRestore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient(`/wallets/${id}/restore`, { method: 'POST' });
      fetchItems();
      showSuccess('Thành công', 'Khôi phục thành công');
    } catch (error) {
      console.error('Failed to restore:', error);
      showError('Lỗi', 'Có lỗi xảy ra khi khôi phục');
    }
  };

  const openEdit = (item: Wallet, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      visualType: item.visualType,
      iconKey: item.iconKey || 'wallet',
      imageUrl: item.imageUrl || '',
      note: item.note || '',
      openingBalance: 0,
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', type: 'CASH' as WalletType, visualType: 'ICON' as VisualType, iconKey: 'wallet', imageUrl: '', note: '', openingBalance: 0 });
    setShowModal(true);
  };

  const navigateToDetail = (id: string) => {
    router.push(`/fund/wallets/${id}`);
  };

  return (
    <div>
      <PageHeader
        title="Sổ quỹ"
        description="Quản lý các tài khoản quỹ"
        action={isAdmin && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Tạo sổ quỹ</Button>}
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {isAdmin && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Hiện đã xóa</span>
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Chưa có sổ quỹ nào
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                item.deletedAt ? 'opacity-60 bg-gray-50' : ''
              }`}
              onClick={() => !item.deletedAt && navigateToDetail(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      <VisualRenderer
                        visualType={item.visualType}
                        iconKey={item.iconKey || 'wallet'}
                        imageUrl={item.imageUrl}
                        color="#3b82f6"
                        className="w-10 h-10"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-lg">{item.name}</span>
                        <span className="text-sm text-gray-400">({item.code})</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[item.type]}`}>
                          {typeLabels[item.type]}
                        </span>
                        {item.deletedAt && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                            Đã xóa
                          </span>
                        )}
                      </div>
                      {item.note && <p className="text-sm text-gray-500 mt-1">{item.note}</p>}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm font-medium text-green-600">
                          Số dư: {formatCurrency(item.balance)}
                        </span>
                        <span className="text-xs text-gray-400">• {item._count?.transactions || 0} giao dịch</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {isAdmin && (
                      <>
                        {item.deletedAt ? (
                          <Button size="icon" variant="outline" onClick={(e) => handleRestore(item.id, e)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <>
                            <Button size="icon" variant="outline" onClick={(e) => openEdit(item, e)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={(e) => setShowConfirmDelete(item)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingItem ? 'Sửa sổ quỹ' : 'Tạo sổ quỹ mới'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên sổ quỹ *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập tên sổ quỹ..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Loại sổ quỹ</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as WalletType }))}
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK">Ngân hàng</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <IconSelectField
                  iconKey={formData.iconKey}
                  onIconKeyChange={(ik) => setFormData((prev) => ({ ...prev, iconKey: ik, visualType: 'ICON' as VisualType }))}
                  color="#3b82f6"
                />
              </div>

              {/* Opening Balance - only show when creating new */}
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium mb-1">Số dư ban đầu (VND)</label>
                  <Input
                    type="number"
                    value={formData.openingBalance || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, openingBalance: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Để 0 nếu chưa có số dư</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Ghi chú thêm..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                <Button onClick={handleSave}>
                  {editingItem ? 'Cập nhật' : 'Tạo mới'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logo Uploader Modal */}
      {showLogoUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Tải lên logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleUploadLogo(e.target.files[0]);
                  }
                }}
              />
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="text-blue-500">Đang tải lên...</div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-500">Nhấp để chọn file ảnh</p>
                    <p className="text-xs text-gray-400 mt-1">Chấp nhận: JPG, PNG, GIF, WebP (tối đa 5MB)</p>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLogoUploader(false)}>Hủy</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
          <Card className="w-full max-w-sm">
            <CardContent className="py-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa?</h3>
              <p className="text-gray-500 mb-4">
                Bạn có chắc muốn xóa &quot;{showConfirmDelete.name}&quot;?
                <br />Sổ quỹ sẽ bị ẩn và có thể khôi phục sau.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Hủy</Button>
                <Button variant="destructive" onClick={(e) => handleDelete(showConfirmDelete, e)}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
