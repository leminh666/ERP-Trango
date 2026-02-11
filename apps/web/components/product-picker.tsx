'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product, ProductVariant, ProductVariantAttribute } from '@tran-go-hoang-gia/shared';
import { Search, Image as ImageIcon, Plus, ChevronRight, Tag, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { fetchJson, resolveProductImage } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

// Colors for attribute groups (matching other components)
const ATTRIBUTE_GROUP_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-amber-100 text-amber-700 border-amber-200',
];

interface ProductWithVariants extends Product {
  variants?: ProductVariant[];
  hasVariants?: boolean;
}

interface ProductPickerProps {
  value: { product: Product | null; variant: ProductVariant | null };
  onChange: (value: { product: Product | null; variant: ProductVariant | null }) => void;
  onClose: () => void;
  onCreateNew?: () => void;
}

// Helper type for variant with processed attributes
interface VariantWithAttributes extends ProductVariant {
  _attributeGroups?: Array<{ name: string; values: string[]; colorIndex: number }>;
}

export function ProductPicker({ value, onChange, onClose, onCreateNew }: ProductPickerProps) {
  const { token } = useAuth();
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [step, setStep] = useState<'products' | 'variants'>('products');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      console.log('[ProductPicker] Fetching products with token:', !!token);
      const data = await fetchJson<Product[]>('/products', { token });
      console.log('[ProductPicker] Products loaded:', data?.length || 0);
      
      // For each product, check if it has variants
      const productsWithVariants: ProductWithVariants[] = await Promise.all(
        (data || []).map(async (product) => {
          try {
            const variants = await fetchJson<ProductVariant[]>(`/product-attributes/${product.id}/variants`, { token });
            return {
              ...product,
              variants: Array.isArray(variants) ? variants : [],
              hasVariants: Array.isArray(variants) && variants.length > 0
            };
          } catch {
            return { ...product, variants: [], hasVariants: false };
          }
        })
      );
      
      setProducts(productsWithVariants);
    } catch (error) {
      console.error('[ProductPicker] Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product: ProductWithVariants) => {
    if (product.hasVariants) {
      setSelectedProduct(product);
      setStep('variants');
    } else {
      onChange({ product, variant: null });
      onClose();
    }
  };

  const handleSelectVariant = (variant: VariantWithAttributes) => {
    if (selectedProduct) {
      onChange({ product: selectedProduct, variant: variant as ProductVariant });
      onClose();
    }
  };

  const handleBack = () => {
    setStep('products');
    setSelectedProduct(null);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Process variant attributes for display
  const processVariantAttributes = (variant: ProductVariant): VariantWithAttributes['_attributeGroups'] => {
    // Get groups from selected product or variant's embedded groups
    const groups = selectedProduct?.attributeGroups || [];
    
    const groupMap = new Map<string, { name: string; values: string[]; colorIndex: number }>();
    
    (variant.attributes || []).forEach((attr) => {
      if (attr.value?.group) {
        const groupId = attr.value.group.id;
        if (!groupMap.has(groupId)) {
          // Assign color based on group position
          const colorIndex = groups.findIndex(g => g.id === groupId) % ATTRIBUTE_GROUP_COLORS.length;
          
          groupMap.set(groupId, {
            name: attr.value.group.name,
            values: [],
            colorIndex
          });
        }
        groupMap.get(groupId)?.values.push(attr.value.value);
      }
    });
    
    return Array.from(groupMap.values());
  };

  // Render attribute badges for variant
  const renderAttributeBadges = (variant: ProductVariant) => {
    const attributeGroups = processVariantAttributes(variant) || [];
    
    if (attributeGroups.length === 0) {
      return (
        <span className="text-xs text-gray-400">Chưa có thuộc tính</span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {attributeGroups.map((group, idx) => (
          <span
            key={idx}
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
              ATTRIBUTE_GROUP_COLORS[group.colorIndex % ATTRIBUTE_GROUP_COLORS.length]
            )}
          >
            {group.name}: {group.values.join(', ')}
          </span>
        ))}
      </div>
    );
  };

  // Step 1: Product Selection
  if (step === 'products') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium mb-4">Chọn sản phẩm</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Không tìm thấy sản phẩm</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Option: No product (custom item) */}
                <div
                  className={cn(
                    'p-3 border rounded-lg cursor-pointer transition-all',
                    value.product === null
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-gray-300'
                  )}
                  onClick={() => onChange({ product: null, variant: null })}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-lg">✏️</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Nhập hạng mục tùy chỉnh</p>
                      <p className="text-xs text-gray-500">Tự nhập tên, đơn vị, đơn giá</p>
                    </div>
                  </div>
                </div>

                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={cn(
                      'p-3 border rounded-lg cursor-pointer transition-all',
                      value.product?.id === product.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-300'
                    )}
                    onClick={() => handleSelectProduct(product)}
                  >
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <img
                          src={resolveProductImage(product.imageUrl)}
                          alt={product.name}
                          className="w-10 h-10 object-contain rounded-lg border bg-white"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-product.png';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          {product.unit}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {product.hasVariants ? (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-xs">
                              {product.variants?.length} biến thể
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Không có biến thể</span>
                          )}
                        </div>
                      </div>
                      {product.hasVariants && (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}

                {/* Option: Create new product */}
                {onCreateNew && (
                  <div
                    className="p-3 border border-dashed border-blue-300 rounded-lg cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50"
                    onClick={onCreateNew}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Plus className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-blue-600">+ Tạo sản phẩm mới</p>
                        <p className="text-xs text-gray-500">Thêm vào danh mục sản phẩm</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Hủy</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Step 2: Variant Selection - UPDATED UI
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            ←
          </Button>
          <div className="flex-1">
            <h3 className="font-medium">Chọn biến thể</h3>
            <p className="text-sm text-gray-500">{selectedProduct?.name}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : selectedProduct?.variants && selectedProduct.variants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Chưa có biến thể nào</div>
          ) : (
            <div className="space-y-2">
              {selectedProduct?.variants?.map((variant) => (
                <div
                  key={variant.id}
                  className={cn(
                    'p-3 border rounded-lg cursor-pointer transition-all',
                    value.variant?.id === variant.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-gray-300'
                  )}
                  onClick={() => handleSelectVariant(variant as VariantWithAttributes)}
                >
                  <div className="flex items-start gap-3">
                    {/* Variant Image */}
                    <div className="w-12 h-12 rounded-lg border bg-gray-100 overflow-hidden flex-shrink-0">
                      {variant.imageUrl ? (
                        <img
                          src={resolveProductImage(variant.imageUrl)}
                          alt={variant.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-product.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Layers className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    
                    {/* Name + Attributes */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{variant.name}</p>
                      {/* Attribute Groups - NEW DISPLAY */}
                      {renderAttributeBadges(variant)}
                    </div>
                    
                    {/* Price - Right aligned */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium text-sm text-blue-600">
                        {formatPrice(variant.price || selectedProduct.defaultSalePrice)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={handleBack}>Hủy</Button>
        </div>
      </Card>
    </div>
  );
}
