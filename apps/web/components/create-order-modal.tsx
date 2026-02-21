'use client';

import { useState, useEffect }from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input }from '@/components/ui/input';
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
  /** Khi truyền vào, khách hàng sẽ được chọn sẵn và không thể thay đổi */
  lockedCustomerId?: string;
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

export function CreateOrderModal({ customers, onClose, onCreated, onCustomerCreated, lockedCustomerId }: CreateOrderModalProps) {
  const [customerList, setCustomerList] = useState(customers);
  const [form, setForm] = useState({
    name: '',
    customerId: lockedCustomerId || '',
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
    }finally {
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
    }catch (error: any) {
      console.error('Failed to create order:', error);
      alert(error.message || 'Có lỗi xảy ra khi tạo đơn hàng');
    }finally {
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
                  {lockedCustomerId ? (
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50 text-sm text-gray-700">
                      <span className="flex-1">
                        {customerList.find(c => c.id === lockedCustomerId)?.name || 'Khách hàng đã chọn'}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">Cố định</span>
                    </div>
                  ) : (
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
                      + Tạo khách hàng mới
                    </option>
                  </Select>
                  )}
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
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium mb-1">Ghi chú</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Ghi chú thêm..."
              />
            </div>

            {/* Order Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Hạng mục / Sản phẩm</label>
                <div className="flex gap-2">
                      <Button
                    variant="outline"
                        size="sm"
                        onClick={() => {
                      setEditingItemIndex(items.length);
                          setShowProductPicker(true);
                      addItem();
                    }}
                  >
                    <Package className="h-3 w-3 mr-1" />
                    Chọn SP
                  </Button>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" />
                    Thêm dòng
                      </Button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 font-medium">Tên hạng mục</th>
                        <th className="text-left p-2 font-medium w-16">ĐVT</th>
                        <th className="text-right p-2 font-medium w-16">SL</th>
                        <th className="text-right p-2 font-medium w-28">Đơn giá</th>
                        <th className="text-right p-2 font-medium w-28">Thành tiền</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-1">
                          <Input
                            value={item.name}
                              onChange={(e) => updateItem(index, { name: e.target.value })}
                              placeholder="Tên hạng mục"
                              className="h-7 text-xs"
                          />
                          </td>
                          <td className="p-1">
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(index, { unit: e.target.value })}
                              placeholder="m²"
                              className="h-7 text-xs"
                        />
                          </td>
                          <td className="p-1">
                        <Input
                          type="number"
                              value={item.qty}
                              onChange={(e) => updateItem(index, { qty: e.target.value })}
                              className="h-7 text-xs text-right"
                        />
                          </td>
                          <td className="p-1">
                      <Input
                        type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                              className="h-7 text-xs text-right"
                      />
                          </td>
                          <td className="p-2 text-right text-xs font-medium">
                        {formatCurrency(calculateItemAmount(item))}
                          </td>
                          <td className="p-1">
                      <Button
                        variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => removeItem(index)}
                      >
                              <X className="h-3 w-3" />
                      </Button>
                          </td>
                        </tr>
                  ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={4}className="p-2 text-right text-sm font-medium">
                          <Calculator className="inline h-4 w-4 mr-1" />
                          Tổng cộng:
                        </td>
                        <td className="p-2 text-right font-bold text-blue-600">
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
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Hủy</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo đơn hàng'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Picker Modal */}
        {showProductPicker && (
          <ProductPicker
          products={products}
          onSelect={handleSelectProduct}
            onClose={() => {
              setShowProductPicker(false);
              setEditingItemIndex(null);
            }}
          onCreateProduct={() => {
              setShowProductPicker(false);
              setShowCreateProduct(true);
            }}
          />
        )}

      {/* Create Customer Modal */}
      {showCreateCustomer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Tạo khách hàng mới</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateCustomer(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {customerError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Tên khách hàng *</label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Nhập tên khách hàng"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="0xxx xxx xxx"
                  type="tel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <Input
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Địa chỉ khách hàng"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setShowCreateCustomer(false)}>
                  Hủy
                </Button>
                <Button size="sm" onClick={handleCreateCustomer} disabled={creatingCustomer}>
                  {creatingCustomer ? 'Đang tạo...' : 'Tạo khách hàng'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Tạo sản phẩm mới</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateProduct(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {productError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {productError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Tên sản phẩm *</label>
                <Input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Nhập tên sản phẩm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Đơn vị tính *</label>
                <Input
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                  placeholder="m², cái, bộ..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Giá bán mặc định</label>
                <Input
                  type="number"
                  value={newProduct.defaultSalePrice}
                  onChange={(e) => setNewProduct({ ...newProduct, defaultSalePrice: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setShowCreateProduct(false)}>
                  Hủy
                </Button>
                <Button size="sm" onClick={handleCreateProduct} disabled={creatingProduct}>
                  {creatingProduct ? 'Đang tạo...' : 'Tạo sản phẩm'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
