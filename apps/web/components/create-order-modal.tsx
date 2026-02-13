'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiClient, unwrapItems } from '@/lib/api';
import { Product, ProductVariant, Customer } from '@tran-go-hoang-gia/shared';
import { VisualType } from '@tran-go-hoang-gia/shared';
import { ProductPicker } from '@/components/product-picker';
import { Plus, X, Calculator, UserPlus, Package } from 'lucide-react';

interface CreateOrderModalProps {
  customers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: (order: { id: string; name: string }) => void;
  onCustomerCreated?: (customer: { id: string; name: string }) => void;
}

interface OrderItemInput {
  product: Product | null;
  productId: string | null;
  variantId: string | null;
  name: string;
  unit: string;
  qty: string;
  unitPrice: string;
}

interface NewCustomerData {
  name: string;
  phone: string;
  address: string;
}

export function CreateOrderModal({ customers, onClose, onCreated, onCustomerCreated }: CreateOrderModalProps) {
  const [customerList, setCustomerList] = useState(customers);
  const [form, setForm] = useState({
    name: '',
    customerId: '',
    address: '',
    deadline: '',
    note: '',
  });
  const [items, setItems] = useState<OrderItemInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Customer creation modal state
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerData>({
    name: '',
    phone: '',
    address: '',
  });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Product creation modal state
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    unit: '',
    defaultSalePrice: '',
    iconKey: 'package',
  });
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Sync local customer list when prop changes
  useEffect(() => {
    setCustomerList(customers);
  }, [customers]);

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
    setItems([...items, { product: null, productId: null, variantId: null, name: '', unit: '', qty: '1', unitPrice: '0' }]);
    setEditingItemIndex(items.length);
  };

  const updateItem = (index: number, updates: Partial<OrderItemInput>) => {
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

  const calculateItemAmount = (item: OrderItemInput) => {
    return (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
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

  // Handle create new customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      setCustomerError('Vui lòng nhập tên khách hàng');
      return;
    }

    setCreatingCustomer(true);
    setCustomerError(null);

    try {
      const created = await apiClient<{ id: string; name: string }>('/customers', {
        method: 'POST',
        body: {
          name: newCustomer.name,
          phone: newCustomer.phone || undefined,
          address: newCustomer.address || undefined,
        },
      });

      // Close customer modal
      setShowCreateCustomer(false);

      // Update local customer list immediately
      const newCustomerObj = { id: created.id, name: created.name };
      setCustomerList(prev => [newCustomerObj, ...prev]);

      // Set as selected
      setForm({ ...form, customerId: created.id });

      // Notify parent to update
      if (onCustomerCreated) {
        onCustomerCreated(newCustomerObj);
      }

      // Reset form
      setNewCustomer({ name: '', phone: '', address: '' });
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      setCustomerError(error.message || 'Có lỗi xảy ra khi tạo khách hàng');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Handle create new product
  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) {
      setProductError('Vui lòng nhập tên sản phẩm');
      return;
    }
    if (!newProduct.unit.trim()) {
      setProductError('Vui lòng nhập đơn vị tính');
      return;
    }

    setCreatingProduct(true);
    setProductError(null);

    try {
      const created = await apiClient<{ id: string; name: string; unit: string; defaultSalePrice?: number }>('/products', {
        method: 'POST',
        body: {
          name: newProduct.name,
          unit: newProduct.unit,
          defaultSalePrice: newProduct.defaultSalePrice ? parseFloat(newProduct.defaultSalePrice) : undefined,
          iconKey: newProduct.iconKey,
        },
      });

      // Close product modal
      setShowCreateProduct(false);

      // Update local products list immediately
      const newProductObj: Product = {
        id: created.id,
        name: created.name,
        code: `SP${String(products.length + 1).padStart(4, '0')}`,
        unit: created.unit,
        defaultSalePrice: created.defaultSalePrice ?? null,
        productType: 'OTHER_ITEM',
        isActive: true,
        deletedAt: null,
        visualType: VisualType.ICON,
        imageUrl: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setProducts(prev => [newProductObj, ...prev]);

      // If editing an item, auto-select the new product
      if (editingItemIndex !== null) {
        updateItem(editingItemIndex, {
          product: newProductObj,
          name: newProductObj.name,
          unit: newProductObj.unit,
          unitPrice: newProductObj.defaultSalePrice?.toString() || '0',
        });
      }

      // Reset form
      setNewProduct({ name: '', unit: '', defaultSalePrice: '', iconKey: 'package' });
    } catch (error: any) {
      console.error('Failed to create product:', error);
      setProductError(error.message || 'Có lỗi xảy ra khi tạo sản phẩm');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert('Vui lòng nhập tên đơn hàng');
      return;
    }
    if (!form.customerId) {
      alert('Vui lòng chọn khách hàng');
      return;
    }

    setLoading(true);
    try {
      // Create project first
      const project = await apiClient<{ id: string; name: string }>('/projects', {
        method: 'POST',
        body: {
          name: form.name,
          customerId: form.customerId,
          address: form.address || undefined,
          deadline: form.deadline || undefined,
          note: form.note || undefined,
        },
      });

      // Create order items if any
      for (const item of items) {
        if (item.name.trim()) {
          await apiClient(`/projects/${project.id}/items`, {
            method: 'POST',
            body: JSON.stringify({
              productId: item.product?.id || null,
              name: item.name,
              unit: item.unit,
              qty: parseFloat(item.qty) || 1,
              unitPrice: parseFloat(item.unitPrice) || 0,
              note: '',
            }),
          });
        }
      }

      onCreated(project);
    } catch (error: any) {
      console.error('Failed to create order:', error);
      alert(error.message || 'Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tạo đơn hàng mới</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên đơn hàng *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nhập tên đơn hàng"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Khách hàng *</label>
                <div className="relative">
                  <Select
                    value={form.customerId}
                    onChange={(e) => {
                      if (e.target.value === '__create_new__') {
                        setShowCreateCustomer(true);
                      } else {
                        setForm({ ...form, customerId: e.target.value });
                      }
                    }}
                    className="w-full"
                  >
                    <option value="">Chọn khách hàng...</option>
                    {customerList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="__create_new__" className="text-blue-600 font-medium bg-blue-50">
                      <UserPlus className="inline h-4 w-4 mr-1" />
                      + Tạo khách hàng mới
                    </option>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ thi công</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Nhập địa chỉ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lịch hẹn thi công</label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  placeholder="Chọn ngày"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ghi chú</label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Nhập ghi chú..."
              />
            </div>

            {/* Items Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Sản phẩm / Hạng mục</span>
                </div>
                <Button onClick={addItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm sản phẩm
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="py-8 text-center text-gray-500 border rounded-md">
                  Chưa có sản phẩm nào. Nhấp &quot;Thêm sản phẩm&quot; để bắt đầu.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingItemIndex(index);
                          setShowProductPicker(true);
                        }}
                        className="w-8 h-8 p-0"
                        title="Chọn sản phẩm từ danh mục"
                      >
                        <span className="text-lg">📦</span>
                      </Button>
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <div className="relative col-span-2">
                          <Input
                            placeholder="Nhấp để chọn sản phẩm..."
                            value={item.name}
                            readOnly
                            onClick={() => {
                              setEditingItemIndex(index);
                              setShowProductPicker(true);
                            }}
                            className="cursor-pointer col-span-2 bg-white"
                          />
                          {item.product && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600">
                              ✓ {item.product.code}
                            </div>
                          )}
                        </div>
                        <Input
                          placeholder="ĐVT"
                          value={item.unit}
                          onChange={(e) => updateItem(index, { unit: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Đơn giá"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                        />
                      </div>
                      <Input
                        type="number"
                        placeholder="SL"
                        value={item.qty}
                        onChange={(e) => updateItem(index, { qty: e.target.value })}
                        className="w-20"
                      />
                      <div className="w-28 text-right font-medium">
                        {formatCurrency(calculateItemAmount(item))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2">
                    <div className="text-lg font-medium">
                      Tổng: <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>Hủy</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo đơn hàng'}
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
              setShowCreateProduct(true);
            }}
          />
        )}
      </div>

      {/* Create Customer Modal */}
      {showCreateCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Tạo khách hàng mới
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateCustomer(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {customerError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Tên khách hàng *</label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Nhập tên..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="Nhập SĐT..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <Input
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Nhập địa chỉ..."
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCreateCustomer(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreateCustomer} disabled={creatingCustomer}>
                  {creatingCustomer ? 'Đang tạo...' : 'Lưu'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Tạo sản phẩm mới
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateProduct(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {productError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {productError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Tên sản phẩm *</label>
                <Input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Nhập tên..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Đơn vị tính *</label>
                <Input
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                  placeholder="m2, cái, bộ..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Đơn giá (VND)</label>
                <Input
                  type="number"
                  value={newProduct.defaultSalePrice}
                  onChange={(e) => setNewProduct({ ...newProduct, defaultSalePrice: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCreateProduct(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreateProduct} disabled={creatingProduct}>
                  {creatingProduct ? 'Đang tạo...' : 'Lưu'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
