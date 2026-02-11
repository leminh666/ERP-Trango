'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { fetchJson } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { VisualRenderer, VisualSelector } from '@/components/visual-selector';
import { AddressSelector } from '@/components/ui/address-selector';
import { Supplier, VisualType } from '@tran-go-hoang-gia/shared';
import { Plus, Search, Phone, MapPin, RotateCcw, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/toast-provider';

export default function SuppliersPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [deletingItem, setDeletingItem] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    address: string;
    addressLine: string;
    region: string;
    provinceCode: string;
    provinceName: string;
    districtCode: string;
    districtName: string;
    wardCode: string;
    wardName: string;
    note: string;
    visualType: VisualType;
    iconKey: string;
    imageUrl: string;
    color: string;
  }>({
    name: '',
    phone: '',
    address: '',
    addressLine: '',
    region: '',
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    note: '',
    visualType: 'ICON' as VisualType,
    iconKey: 'truck',
    imageUrl: '',
    color: '#6366f1',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 200);
    return () => clearTimeout(timer);
  }, [token, search, showDeleted]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (showDeleted) params.append('includeDeleted', 'true');
      const data = await fetchJson<Supplier[]>(`/suppliers?${params.toString()}`, { token });
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      phone: '',
      address: '',
      addressLine: '',
      region: '',
      provinceCode: '',
      provinceName: '',
      districtCode: '',
      districtName: '',
      wardCode: '',
      wardName: '',
      note: '',
      visualType: 'ICON' as VisualType,
      iconKey: 'truck',
      imageUrl: '',
      color: '#6366f1',
    });
    setShowModal(true);
  };

  const openEdit = (e: React.MouseEvent, item: Supplier) => {
    e.stopPropagation();
    setEditingItem(item);
    setFormData({
      name: item.name,
      phone: item.phone || '',
      address: item.address || '',
      addressLine: (item as any).addressLine || '',
      region: (item as any).region || '',
      provinceCode: item.provinceCode || '',
      provinceName: item.provinceName || '',
      districtCode: item.districtCode || '',
      districtName: item.districtName || '',
      wardCode: item.wardCode || '',
      wardName: item.wardName || '',
      note: item.note || '',
      visualType: (item.visualType || 'ICON') as VisualType,
      iconKey: item.iconKey || 'truck',
      imageUrl: item.imageUrl || '',
      color: (item as any).color || '#6366f1',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập tên nhà cung cấp');
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
        ? `/suppliers/${editingItem.id}`
        : '/suppliers';
      const method = editingItem ? 'PUT' : 'POST';

      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          address: formData.address || null,
          addressLine: formData.addressLine || null,
          region: formData.region || null,
          provinceCode: formData.provinceCode || null,
          provinceName: formData.provinceName || null,
          districtCode: formData.districtCode || null,
          districtName: formData.districtName || null,
          wardCode: formData.wardCode || null,
          wardName: formData.wardName || null,
          note: formData.note || null,
          visualType: formData.visualType,
          iconKey: formData.iconKey || null,
          imageUrl: formData.imageUrl || null,
          color: formData.color || null,
        }),
        token,
      });

      setShowModal(false);
      setEditingItem(null);
      fetchItems();
      showSuccess('Thành công', editingItem ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
    } catch (error: any) {
      console.error('Failed to save supplier:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (item: Supplier) => {
    setDeleting(true);
    try {
      await fetchJson(`/suppliers/${item.id}`, {
        method: 'DELETE',
        token,
      });
      setDeletingItem(null);
      fetchItems();
      showSuccess('Thành công', 'Đã xóa nhà cung cấp');
    } catch (error: any) {
      console.error('Failed to delete supplier:', error);
      if (error.message?.includes('cannot') || error.message?.includes('related') || error.status === 400) {
        showError('Không thể xóa', error.message || 'Nhà cung cấp này có dữ liệu liên quan.');
      } else {
        showError('Lỗi', error.message || 'Có lỗi xảy ra khi xóa');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetchJson(`/suppliers/${id}/restore`, {
        method: 'POST',
        token,
      });
      fetchItems();
      showSuccess('Thành công', 'Khôi phục thành công!');
    } catch (error) {
      console.error('Failed to restore supplier:', error);
      showError('Lỗi', 'Có lỗi xảy ra');
    }
  };

  const navigateToDetail = (id: string) => {
    router.push(`/partners/suppliers/${id}`);
  };

  return (
    <div>
      <PageHeader
        title="Nhà cung cấp"
        description="Quản lý nhà cung cấp"
        action={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo NCC
            </Button>
          ) : null
        }
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
            Chưa có nhà cung cấp nào
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all hover:shadow-md ${item.deletedAt ? 'opacity-60 bg-gray-50' : ''}`}
              onClick={() => !item.deletedAt && navigateToDetail(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <VisualRenderer
                      visualType={(item.visualType || 'ICON') as any}
                      iconKey={item.iconKey || 'truck'}
                      imageUrl={item.imageUrl}
                      color={(item as any).color || '#6366f1'}
                      className="w-10 h-10 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-semibold truncate">{item.name}</span>
                        <span className="text-sm text-gray-400 shrink-0">({item.code})</span>
                        {item.deletedAt && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs shrink-0">
                            Đã xóa
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                        {item.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {item.phone}
                          </span>
                        )}
                        {item.address && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.address}</span>
                          </span>
                        )}
                        {(item as any).region && <span>{(item as any).region}</span>}
                      </div>
                      {item.note && <p className="mt-2 text-sm text-gray-500 line-clamp-1">{item.note}</p>}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {item.deletedAt ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleRestore(e, item.id)}
                          className="h-8"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => openEdit(e, item)}
                            className="h-8 w-8 text-blue-600"
                            title="Sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingItem(item)}
                            className="h-8 w-8 text-red-500"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingItem ? 'Sửa nhà cung cấp' : 'Tạo nhà cung cấp mới'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="block text-sm font-medium mb-1">Tên nhà cung cấp *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="block text-sm font-medium mb-1">SĐT</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Nhập SĐT..."
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">Khu vực</Label>
                  <Input
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="Miền Bắc/Trung/Nam"
                  />
                </div>
              </div>

              {/* Address Selector */}
              <AddressSelector
                provinceCode={formData.provinceCode}
                provinceName={formData.provinceName}
                districtCode={formData.districtCode}
                districtName={formData.districtName}
                wardCode={formData.wardCode}
                wardName={formData.wardName}
                addressLine={formData.addressLine}
                onChange={(data) => setFormData({
                  ...formData,
                  ...data,
                  // Map addressLine to address for legacy field
                  address: data.addressLine || '',
                })}
              />

              <div>
                <Label className="block text-sm font-medium mb-1">Ghi chú</Label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Ghi chú..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hiển thị (Icon/Logo)</label>
                <VisualSelector
                  visualType={formData.visualType}
                  iconKey={formData.iconKey}
                  imageUrl={formData.imageUrl}
                  onVisualTypeChange={(vt) => setFormData({ ...formData, visualType: vt })}
                  onIconKeyChange={(ik) => setFormData({ ...formData, iconKey: ik })}
                  onImageUrlChange={(iu) => setFormData({ ...formData, imageUrl: iu })}
                  color={formData.color}
                  onColorChange={(c) => setFormData({ ...formData, color: c })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                <Button onClick={handleSave}>{editingItem ? 'Cập nhật' : 'Tạo mới'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa nhà cung cấp?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa nhà cung cấp <strong>{deletingItem?.name}</strong>?
              <br /><br />
              Thao tác này sẽ ẩn NCC khỏi danh sách và có thể khôi phục sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleting}
              onClick={() => deletingItem && handleDelete(deletingItem)}
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
