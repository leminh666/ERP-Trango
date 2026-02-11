'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { fetchJson } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { VisualRenderer, VisualSelector } from '@/components/visual-selector';
import { AddressSelector } from '@/components/ui/address-selector';
import { Workshop, VisualType } from '@tran-go-hoang-gia/shared';
import { Plus, Search, Phone, MapPin, Edit, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/toast-provider';

export default function WorkshopsPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Workshop | null>(null);
  const [deletingItem, setDeletingItem] = useState<Workshop | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    address: string;
    addressLine: string;
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
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    note: '',
    visualType: 'ICON' as VisualType,
    iconKey: 'hammer',
    imageUrl: '',
    color: '#f97316',
  });

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchWorkshops();
  }, [token, search, showDeleted]);

  const fetchWorkshops = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (showDeleted) params.append('includeDeleted', 'true');
      const data = await fetchJson<Workshop[]>(`/workshops?${params}`, { token });
      setWorkshops(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch workshops:', error);
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
      provinceCode: '',
      provinceName: '',
      districtCode: '',
      districtName: '',
      wardCode: '',
      wardName: '',
      note: '',
      visualType: 'ICON' as VisualType,
      iconKey: 'hammer',
      imageUrl: '',
      color: '#f97316',
    });
    setShowModal(true);
  };

  const openEdit = (e: React.MouseEvent, item: Workshop) => {
    e.stopPropagation();
    setEditingItem(item);
    setFormData({
      name: item.name,
      phone: item.phone || '',
      address: item.address || '',
      addressLine: (item as any).addressLine || '',
      provinceCode: item.provinceCode || '',
      provinceName: item.provinceName || '',
      districtCode: item.districtCode || '',
      districtName: item.districtName || '',
      wardCode: item.wardCode || '',
      wardName: item.wardName || '',
      note: item.note || '',
      visualType: (item.visualType || 'ICON') as VisualType,
      iconKey: item.iconKey || 'hammer',
      imageUrl: item.imageUrl || '',
      color: (item as any).color || '#f97316',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập tên xưởng');
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
        ? `/workshops/${editingItem.id}`
        : '/workshops';
      const method = editingItem ? 'PUT' : 'POST';

      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          address: formData.address || null,
          addressLine: formData.addressLine || null,
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
      fetchWorkshops();
      showSuccess('Thành công', editingItem ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
    } catch (error: any) {
      console.error('Failed to save workshop:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (item: Workshop) => {
    setDeleting(true);
    try {
      await fetchJson(`/workshops/${item.id}`, {
        method: 'DELETE',
        token,
      });
      setDeletingItem(null);
      fetchWorkshops();
      showSuccess('Thành công', 'Đã xóa xưởng gia công');
    } catch (error: any) {
      console.error('Failed to delete workshop:', error);
      if (error.message?.includes('cannot') || error.message?.includes('related') || error.status === 400) {
        showError('Không thể xóa', error.message || 'Xưởng này có dữ liệu liên quan.');
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
      await fetchJson(`/workshops/${id}/restore`, {
        method: 'POST',
        token,
      });
      fetchWorkshops();
      showSuccess('Thành công', 'Khôi phục thành công!');
    } catch (error) {
      console.error('Failed to restore workshop:', error);
      showError('Lỗi', 'Có lỗi xảy ra');
    }
  };

  const navigateToDetail = (id: string) => {
    router.push(`/partners/workshops/${id}`);
  };

  return (
    <div>
      <PageHeader
        title="Xưởng gia công"
        description="Quản lý đơn vị gia công"
        action={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo xưởng
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
      ) : workshops.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Chưa có xưởng nào
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workshops.map((workshop) => (
            <Card
              key={workshop.id}
              className={`cursor-pointer transition-all hover:shadow-md ${workshop.deletedAt ? 'opacity-60 bg-gray-50' : ''}`}
              onClick={() => !workshop.deletedAt && navigateToDetail(workshop.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <VisualRenderer
                      visualType={(workshop.visualType || 'ICON') as any}
                      iconKey={workshop.iconKey || 'hammer'}
                      imageUrl={workshop.imageUrl}
                      color={(workshop as any).color || '#f97316'}
                      className="w-10 h-10 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-semibold truncate">{workshop.name}</span>
                        <span className="text-sm text-gray-400 shrink-0">({workshop.code})</span>
                        {workshop.deletedAt && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs shrink-0">
                            Đã xóa
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                        {workshop.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {workshop.phone}
                          </span>
                        )}
                        {workshop.address && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{workshop.address}</span>
                          </span>
                        )}
                      </div>
                      {workshop.note && (
                        <p className="mt-2 text-sm text-gray-500 line-clamp-1">{workshop.note}</p>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {workshop.deletedAt ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleRestore(e, workshop.id)}
                          className="h-8"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => openEdit(e, workshop)}
                            className="h-8 w-8 text-blue-600"
                            title="Sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingItem(workshop)}
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
              <CardTitle>{editingItem ? 'Sửa xưởng' : 'Tạo xưởng mới'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="block text-sm font-medium mb-1">Tên xưởng *</Label>
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
                <Label className="block text-sm font-medium mb-2">Hiển thị (Icon/Logo)</Label>
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
            <AlertDialogTitle>Xác nhận xóa xưởng gia công?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa xưởng <strong>{deletingItem?.name}</strong>?
              <br /><br />
              Thao tác này sẽ ẩn xưởng khỏi danh sách và có thể khôi phục sau.
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
