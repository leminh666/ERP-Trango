'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconRenderer } from '@/components/icon-picker';
import { VisualRenderer } from '@/components/visual-selector';
import { ExpenseCategory, VisualType } from '@tran-go-hoang-gia/shared';
import { Plus, Search, Edit, Trash2, RotateCcw, AlertCircle, Eye } from 'lucide-react';
import { VisualSelector } from '@/components/visual-selector';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/toast-provider';

export default function ExpenseCategoriesPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    visualType: string;
    iconKey: string;
    imageUrl: string;
    color: string;
  }>({ name: '', visualType: 'ICON', iconKey: 'shopping-cart', imageUrl: '', color: '#ef4444' });
  const [showConfirmDelete, setShowConfirmDelete] = useState<ExpenseCategory | null>(null);

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
      const data = await apiClient<any[]>(`/expense-categories?${params}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Thiếu thông tin', 'Vui lòng nhập tên danh mục');
      return;
    }
    if (formData.visualType === 'ICON' && !formData.iconKey) {
      showError('Thiếu thông tin', 'Vui lòng chọn icon');
      return;
    }
    if (formData.visualType === 'IMAGE' && !formData.imageUrl) {
      showError('Thiếu thông tin', 'Vui lòng tải lên logo');
      return;
    }

    try {
      const url = editingItem
        ? `/expense-categories/${editingItem.id}`
        : '/expense-categories';
      const method = editingItem ? 'PUT' : 'POST';

      await apiClient(url, { method, body: JSON.stringify(formData) });

      setShowModal(false);
      setFormData({ name: '', visualType: 'ICON', iconKey: 'shopping-cart', imageUrl: '', color: '#ef4444' });
      setEditingItem(null);
      fetchItems();
      showSuccess('Thành công', editingItem ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
    } catch (error: any) {
      console.error('Failed to save:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (item: ExpenseCategory) => {
    try {
      await apiClient(`/expense-categories/${item.id}`, { method: 'DELETE' });
      setShowConfirmDelete(null);
      fetchItems();
      showSuccess('Thành công', 'Xóa thành công!');
    } catch (error: any) {
      console.error('Failed to delete:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await apiClient(`/expense-categories/${id}/restore`, { method: 'POST' });
      fetchItems();
      showSuccess('Thành công', 'Khôi phục thành công!');
    } catch (error: any) {
      console.error('Failed to restore:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  const openEdit = (item: ExpenseCategory) => {
    setEditingItem(item);
    setFormData({ 
      name: item.name, 
      visualType: item.visualType, 
      iconKey: item.iconKey || 'shopping-cart', 
      imageUrl: item.imageUrl || '',
      color: item.color || '#ef4444' 
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', visualType: 'ICON', iconKey: 'shopping-cart', imageUrl: '', color: '#ef4444' });
    setShowModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Danh mục chi"
        description="Quản lý danh mục chi tiêu"
        action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Thêm danh mục</Button>}
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Hiện đã xóa</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Chưa có danh mục nào
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className={item.deletedAt ? 'opacity-60 bg-gray-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <VisualRenderer
                      visualType={item.visualType}
                      iconKey={item.iconKey || 'shopping-cart'}
                      imageUrl={item.imageUrl}
                      color={item.color || '#ef4444'}
                      className="w-10 h-10"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm text-gray-400">({item.code})</span>
                        {item.deletedAt && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                            Đã xóa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.deletedAt ? (
                      <Button size="sm" variant="outline" onClick={() => handleRestore(item.id)}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Khôi phục
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => router.push(`/catalog/expense-items/${item.id}`)}
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(item)}
                          title="Sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setShowConfirmDelete(item)}
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingItem ? 'Sửa danh mục' : 'Thêm danh mục mới'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên danh mục *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên danh mục..."
                />
              </div>
              <VisualSelector
                visualType={formData.visualType as VisualType}
                iconKey={formData.iconKey}
                imageUrl={formData.imageUrl}
                onVisualTypeChange={(vt) => setFormData({ ...formData, visualType: vt })}
                onIconKeyChange={(ik) => setFormData({ ...formData, iconKey: ik })}
                onImageUrlChange={(iu) => setFormData({ ...formData, imageUrl: iu })}
                color={formData.color}
                onColorChange={(c) => setFormData({ ...formData, color: c })}
              />
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

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="py-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa?</h3>
              <p className="text-gray-500 mb-4">
                Bạn có chắc muốn xóa "{showConfirmDelete.name}"? 
                <br />Danh mục sẽ bị ẩn và có thể khôi phục sau.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Hủy</Button>
                <Button variant="destructive" onClick={() => handleDelete(showConfirmDelete)}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
