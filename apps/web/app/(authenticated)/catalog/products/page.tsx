'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { fetchJson, resolveProductImage, uploadFile } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product } from '@tran-go-hoang-gia/shared';
import { Plus, Search, Edit, Trash2, RotateCcw, AlertCircle, Package, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateProductModal } from '@/components/create-product-modal';
import { EditProductModal } from '@/components/edit-product-modal';

export default function ProductsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [variantCounts, setVariantCounts] = useState<Record<string, number>>({});
  const [attributeCounts, setAttributeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [filterProductType, setFilterProductType] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<Product | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, showDeleted, filterProductType]);

  const fetchItems = async () => {
    setLoading(true);
    console.log('[Products] 🔄 Bắt đầu fetch...', { 
      search, 
      showDeleted, 
      filterProductType, 
      hasToken: !!token,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR'
    });
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (showDeleted) params.append('includeDeleted', 'true');
      if (filterProductType) params.append('productType', filterProductType);

      const endpoint = `/products?${params}`;
      console.log('[Products] 📡 Gọi API:', endpoint);
      
      const data = await fetchJson<Product[]>(endpoint, { token });
      console.log('[Products] ✅ API response:', { 
        data, 
        isArray: Array.isArray(data), 
        length: data?.length,
        firstItem: data?.[0] 
      });
      setItems(Array.isArray(data) ? data : []);

      // Fetch variant counts for each product
      const counts: Record<string, number> = {};
      const attrCounts: Record<string, number> = {};
      for (const product of data) {
        try {
          const variants = await fetchJson<any[]>(`/product-attributes/${product.id}/variants`, { token });
          const groups = await fetchJson<any[]>(`/product-attributes/${product.id}/groups`, { token });
          counts[product.id] = Array.isArray(variants) ? variants.length : 0;
          attrCounts[product.id] = Array.isArray(groups) ? groups.length : 0;
        } catch (e) {
          counts[product.id] = 0;
          attrCounts[product.id] = 0;
        }
      }
      setVariantCounts(counts);
      setAttributeCounts(attrCounts);
    } catch (error) {
      console.error('[Products] ❌ Lỗi fetch:', error);
      setItems([]);
    } finally {
      setLoading(false);
      console.log('[Products] 🏁 Fetch hoàn tất, loading=false');
    }
  };

  const handleDelete = async (item: Product) => {
    try {
      await fetchJson(`/products/${item.id}`, {
        method: 'DELETE',
        token,
      });
      setShowConfirmDelete(null);
      fetchItems();
      alert('Xóa thành công!');
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await fetchJson(`/products/${id}/restore`, {
        method: 'POST',
        token,
      });
      fetchItems();
      alert('Khôi phục thành công!');
    } catch (error) {
      console.error('Failed to restore:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const openEdit = (item: Product) => {
    // For editing, we still use the inline modal (simpler for now)
    setFormData({
      name: item.name,
      unit: item.unit,
      productType: item.productType || 'OTHER_ITEM',
      imageUrl: item.imageUrl || '',
    });
    setEditingItem(item);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', unit: 'm2', productType: 'CEILING_WOOD', imageUrl: '' });
    setShowModal(true);
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Form state for inline modal (edit mode only)
  const [formData, setFormData] = useState<{
    name: string;
    unit: string;
    productType: string;
    imageUrl: string;
  }>({
    name: '',
    unit: 'm2',
    productType: 'CEILING_WOOD',
    imageUrl: '',
  });
  const [uploading, setUploading] = useState(false);

  const handleUploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadFile('/files/upload', file, { token });
      if (result.url) {
        setFormData((prev: any) => ({ ...prev, imageUrl: result.url }));
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên sản phẩm');
      return;
    }
    if (!formData.unit.trim()) {
      alert('Vui lòng nhập đơn vị tính');
      return;
    }
    if (!formData.imageUrl) {
      alert('Vui lòng tải lên logo sản phẩm');
      return;
    }

    try {
      const url = editingItem
        ? `/products/${editingItem.id}`
        : '/products';
      const method = editingItem ? 'PUT' : 'POST';

      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit,
          productType: formData.productType,
          imageUrl: formData.imageUrl,
          visualType: 'IMAGE',
        }),
        token,
      });

      setShowModal(false);
      setFormData({ name: '', unit: 'm2', productType: 'CEILING_WOOD', imageUrl: '' });
      setEditingItem(null);
      fetchItems();
      alert(editingItem ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const handleModalSuccess = () => {
    fetchItems();
  };

  return (
    <div>
      <PageHeader
        title="Sản phẩm / Hạng mục"
        description="Quản lý sản phẩm và hạng mục công trình"
        action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Thêm sản phẩm</Button>}
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
            <div className="flex gap-2">
              <Button
                variant={filterProductType === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterProductType(null)}
              >
                Tất cả
              </Button>
              <Button
                variant={filterProductType === 'CEILING_WOOD' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterProductType('CEILING_WOOD')}
              >
                Trần gỗ
              </Button>
              <Button
                variant={filterProductType === 'FURNITURE' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterProductType('FURNITURE')}
              >
                Nội thất
              </Button>
              <Button
                variant={filterProductType === 'OTHER_ITEM' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterProductType('OTHER_ITEM')}
              >
                Hạng mục khác
              </Button>
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
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="mb-2">Chưa có sản phẩm nào</p>
            <p className="text-sm text-gray-400">
              Nhấp nút "Thêm sản phẩm" để bắt đầu
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card 
              key={item.id} 
              className={cn(
                'transition-all cursor-pointer hover:shadow-md',
                item.deletedAt ? 'opacity-60 bg-gray-50' : ''
              )}
              onClick={() => router.push(`/catalog/products/${item.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Logo Image */}
                    {item.imageUrl ? (
                      <img
                        src={resolveProductImage(item.imageUrl)}
                        alt={item.name}
                        className="w-12 h-12 object-contain rounded-lg border bg-white"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          (e.target as HTMLImageElement).src = '/placeholder-product.png';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
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
                      <div className="text-sm text-gray-500">
                        {item.unit}
                        {item.productType === 'CEILING_WOOD' && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">Trần gỗ</span>}
                        {item.productType === 'FURNITURE' && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Nội thất</span>}
                        {item.productType === 'OTHER_ITEM' && <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">Hạng mục khác</span>}
                      </div>
                      {/* Attribute & Variant Info */}
                      <div className="flex gap-2 mt-2">
                        {attributeCounts[item.id] > 0 && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                            {attributeCounts[item.id]} thuộc tính
                          </span>
                        )}
                        {variantCounts[item.id] > 0 && (
                          <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs">
                            {variantCounts[item.id]} biến thể
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {item.deletedAt ? (
                      <Button size="sm" variant="outline" onClick={() => handleRestore(item.id)}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Khôi phục
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Sửa
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setShowConfirmDelete(item)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Xóa
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

      {/* Create Product Modal */}
      {showModal && !editingItem && (
        <CreateProductModal
          open={showModal}
          onOpenChange={setShowModal}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Edit Product Modal */}
      {showModal && editingItem && (
        <EditProductModal
          open={showModal}
          onOpenChange={(open) => {
            setShowModal(open);
            if (!open) setEditingItem(null);
          }}
          product={editingItem}
          onSuccess={handleModalSuccess}
        />
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
                <br />Sản phẩm sẽ bị ẩn và có thể khôi phục sau.
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
