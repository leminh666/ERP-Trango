'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiClient, unwrapItems } from '@/lib/api';
import { Product, ProductVariant } from '@tran-go-hoang-gia/shared';
import { ProductPicker } from '@/components/product-picker';
import { useToast } from '@/components/toast-provider';
import { Plus, X, Calculator, Package } from 'lucide-react';

interface ProjectOption {
  id: string;
  code: string;
  name: string;
  customerName?: string;
}

interface WorkshopOption {
  id: string;
  name: string;
}

interface WorkshopJobItemInput {
  product: Product | null;
  productId: string | null;
  variantId: string | null;
  name: string;
  unit: string;
  qty: string;
  unitPrice: string;
}

interface CreateWorkshopJobModalProps {
  projects: ProjectOption[];
  workshops: WorkshopOption[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateWorkshopJobModal({ projects, workshops, onClose, onCreated }: CreateWorkshopJobModalProps) {
  const { showSuccess, showError } = useToast();

  const [form, setForm] = useState({
    projectId: '',
    workshopId: '',
    title: '',
    note: '',
    startDate: new Date().toISOString().split('T')[0], // Default to today
  });
  const [items, setItems] = useState<WorkshopJobItemInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Load products for picker
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await apiClient<Product[]>('/products?includeDeleted=false');
        setProducts(unwrapItems(data));
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };
    fetchProducts();
  }, []);

  const addItem = () => {
    setItems([...items, { product: null, productId: null, variantId: null, name: '', unit: '', qty: '0', unitPrice: '0' }]);
    setEditingItemIndex(items.length);
  };

  const updateItem = (index: number, updates: Partial<WorkshopJobItemInput>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSelectProduct = (value: { product: Product | null; variant: ProductVariant | null }) => {
    const { product, variant } = value;
    if (editingItemIndex !== null && product) {
      updateItem(editingItemIndex, {
        product,
        productId: product.id,
        variantId: variant?.id || null,
        name: variant?.name || product.name,
        unit: product.unit,
        unitPrice: variant?.price?.toString() || product.defaultSalePrice?.toString() || '0',
      });
    }
    setShowProductPicker(false);
    setEditingItemIndex(null);
  };

  const calculateItemAmount = (item: WorkshopJobItemInput) => {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return qty * price;
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateItemAmount(item), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!form.projectId) {
      showError('Thiếu thông tin', 'Vui lòng chọn đơn hàng');
      return;
    }
    if (!form.workshopId) {
      showError('Thiếu thông tin', 'Vui lòng chọn xưởng gia công');
      return;
    }

    // Validate items have at least name and unit
    const validItems = items.filter(item => item.name.trim() && item.unit.trim());
    const payloadItems = validItems.map(item => ({
      productId: item.productId || undefined,
      productName: item.name,
      unit: item.unit,
      quantity: parseFloat(item.qty) || 0,
      unitPrice: parseFloat(item.unitPrice) || 0,
    }));

    setLoading(true);
    try {
      await apiClient('/workshop-jobs', {
        method: 'POST',
        body: {
          projectId: form.projectId,
          workshopId: form.workshopId,
          title: form.title || undefined,
          note: form.note || undefined,
          items: payloadItems,
          startDate: new Date(form.startDate).toISOString(), // Use form's startDate
        },
      });

      showSuccess('Thành công', 'Đã tạo phiếu gia công mới');
      onCreated();
    } catch (error: any) {
      console.error('Failed to create workshop job:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra khi tạo phiếu gia công');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tạo phiếu gia công mới</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* General Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Đơn hàng *</label>
              <Select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full"
              >
                <option value="">Chọn đơn hàng...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name} {p.customerName ? `(${p.customerName})` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Xưởng gia công *</label>
              <Select
                value={form.workshopId}
                onChange={(e) => setForm({ ...form, workshopId: e.target.value })}
                className="w-full"
              >
                <option value="">Chọn xưởng...</option>
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Tiêu đề</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ví dụ: Gia công trần gỗ tầng 1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Ghi chú</label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Nhập ghi chú..."
              />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Hạng mục/ Sản phẩm</span>
              </div>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Thêm sản phẩm
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>Chưa có sản phẩm nào</p>
                <p className="text-sm">Nhấp &quot;Thêm sản phẩm&quot; để bắt đầu</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium w-10">#</th>
                      <th className="text-left p-3 font-medium">Sản phẩm *</th>
                      <th className="text-left p-3 font-medium w-24">ĐVT *</th>
                      <th className="text-left p-3 font-medium w-24">SL</th>
                      <th className="text-left p-3 font-medium w-28">Đơn giá</th>
                      <th className="text-right p-3 font-medium w-32">Thành tiền</th>
                      <th className="text-left p-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3 text-gray-500">{index + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingItemIndex(index);
                                setShowProductPicker(true);
                              }}
                              className="h-8"
                            >
                              <Package className="h-4 w-4 mr-1" />
                              {item.name || 'Chọn sản phẩm...'}
                            </Button>
                          </div>
                        </td>
                        <td className="p-3">
                          <Input
                            value={item.unit}
                            onChange={(e) => updateItem(index, { unit: e.target.value })}
                            placeholder="ĐVT"
                            className="h-8"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) => updateItem(index, { qty: e.target.value })}
                            placeholder="0"
                            className="h-8"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                            placeholder="0"
                            className="h-8"
                          />
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(calculateItemAmount(item))}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-500 h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={5} className="p-3 text-right font-medium">Tổng tiền:</td>
                      <td className="p-3 text-right font-bold text-blue-600 text-lg">
                        {formatCurrency(calculateTotal())}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo mới'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product Picker */}
      {showProductPicker && (
        <ProductPicker
          value={editingItemIndex !== null ? { product: items[editingItemIndex].product || null, variant: null } : { product: null, variant: null }}
          onChange={handleSelectProduct}
          onClose={() => {
            setShowProductPicker(false);
            setEditingItemIndex(null);
          }}
          onCreateNew={() => {
            setShowProductPicker(false);
          }}
        />
      )}
    </div>
  );
}

