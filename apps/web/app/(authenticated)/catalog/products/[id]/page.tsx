'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { fetchJson, resolveProductImage, uploadFile, getApiBaseUrl } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product, ProductAttributeGroup, ProductAttributeValue, ProductVariant, ProductVariantAttribute } from '@tran-go-hoang-gia/shared';
import { 
  ArrowLeft, Plus, Edit, Trash2, Save, X, 
  Package, Layers, Tag, Settings, ChevronDown, ChevronRight,
  AlertCircle, Image as ImageIcon, DollarSign, HelpCircle, Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/toast-provider';

// Colors for attribute groups (cycling through these colors)
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

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [attributeGroups, setAttributeGroups] = useState<ProductAttributeGroup[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newValueName, setNewValueName] = useState('');
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantCode, setNewVariantCode] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  const [newVariantImage, setNewVariantImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Variant attribute selection
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Set<string>>(new Set());
  const [selectedGroupForValue, setSelectedGroupForValue] = useState<string | null>(null);

  // Delete confirmations
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteValueInfo, setDeleteValueInfo] = useState<{ groupId: string; valueId: string; valueName: string } | null>(null);
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null);

  // Edit variant modal
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [editVariantName, setEditVariantName] = useState('');
  const [editVariantCode, setEditVariantCode] = useState('');
  const [editVariantPrice, setEditVariantPrice] = useState('');
  const [editVariantImage, setEditVariantImage] = useState<string | null>(null);
  const [editVariantSaving, setEditVariantSaving] = useState(false);
  // Edit variant: attribute selections
  const [editVariantAttributes, setEditVariantAttributes] = useState<Set<string>>(new Set());

  // Refetch trigger
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (id) {
      fetchProductDetails();
    }
  }, [id, refreshKey]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      console.log('[ProductDetail] Fetching product details:', id);
      
      // Fetch product with details
      const productData = await fetchJson<Product>(`/products/${id}`, { token });
      setProduct(productData);

      // Fetch attribute groups
      const groupsData = await fetchJson<ProductAttributeGroup[]>(`/product-attributes/${id}/groups`, { token });
      setAttributeGroups(Array.isArray(groupsData) ? groupsData : []);

      // Fetch variants
      const variantsData = await fetchJson<ProductVariant[]>(`/product-attributes/${id}/variants`, { token });
      setVariants(Array.isArray(variantsData) ? variantsData : []);

      console.log('[ProductDetail] Data loaded:', { 
        productData, 
        groupsCount: groupsData?.length, 
        variantsCount: variantsData?.length 
      });
    } catch (error) {
      console.error('[ProductDetail] Error fetching product:', error);
      showError('Lỗi tải dữ liệu', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // === VARIANT IMAGE UPLOAD ===
  const handleVariantImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadFile('/files/upload', file, { token });
      if (result.url) {
        setNewVariantImage(result.url);
        showSuccess('Upload thành công', 'Đã tải ảnh biến thể');
      } else {
        showError('Upload thất bại', result.error || 'Không thể tải ảnh');
      }
    } catch (error) {
      console.error('[ProductDetail] Upload variant image failed:', error);
      showError('Upload thất bại', (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // === ATTRIBUTE GROUP OPERATIONS ===

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      showError('Validation', 'Vui lòng nhập tên nhóm thuộc tính');
      return;
    }
    if (newGroupName.trim().length < 2) {
      showError('Validation', 'Tên nhóm phải có ít nhất 2 ký tự');
      return;
    }

    console.log('[ProductDetail] Creating group:', { productId: id, name: newGroupName.trim() });
    
    try {
      const result = await fetchJson<ProductAttributeGroup>(`/product-attributes/${id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
        token,
      });
      
      console.log('[ProductDetail] Group created successfully:', result);
      setAttributeGroups([...attributeGroups, result]);
      setNewGroupName('');
      showSuccess('Thành công', `Đã tạo nhóm "${result.name}"`);
    } catch (error) {
      console.error('[ProductDetail] Error creating group:', error);
      const err = error as Error;
      showError('Lỗi tạo nhóm', err.message || 'Vui lòng thử lại');
    }
  };

  const confirmDeleteGroup = async () => {
    if (!deleteGroupId) return;
    
    try {
      console.log('[ProductDetail] Deleting group:', deleteGroupId);
      await fetchJson(`/product-attributes/groups/${deleteGroupId}`, {
        method: 'DELETE',
        token,
      });
      
      setAttributeGroups(attributeGroups.filter(g => g.id !== deleteGroupId));
      showSuccess('Đã xóa', 'Nhóm thuộc tính đã được xóa');
    } catch (error) {
      console.error('[ProductDetail] Error deleting group:', error);
      showError('Lỗi xóa', (error as Error).message);
    } finally {
      setDeleteGroupId(null);
    }
  };

  // === ATTRIBUTE VALUE OPERATIONS ===

  const handleCreateValue = async (groupId: string) => {
    if (!newValueName.trim()) {
      showError('Validation', 'Vui lòng nhập tên giá trị');
      return;
    }

    try {
      console.log('[ProductDetail] Creating value:', { groupId, value: newValueName.trim() });
      const result = await fetchJson<ProductAttributeValue>('/product-attributes/values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          groupId, 
          value: newValueName.trim(),
          parentValueId: null 
        }),
        token,
      });
      
      setAttributeGroups(attributeGroups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            values: [...(g.values || []), result]
          };
        }
        return g;
      }));
      setNewValueName('');
      setSelectedGroupForValue(null);
      showSuccess('Thành công', `Đã thêm giá trị "${result.value}"`);
    } catch (error) {
      console.error('[ProductDetail] Error creating value:', error);
      const err = error as Error;
      showError('Lỗi tạo giá trị', err.message || 'Vui lòng thử lại');
    }
  };

  const confirmDeleteValue = async () => {
    if (!deleteValueInfo) return;
    
    try {
      console.log('[ProductDetail] Deleting value:', deleteValueInfo.valueId);
      await fetchJson(`/product-attributes/values/${deleteValueInfo.valueId}`, {
        method: 'DELETE',
        token,
      });
      
      setAttributeGroups(attributeGroups.map(g => {
        if (g.id === deleteValueInfo.groupId) {
          return {
            ...g,
            values: (g.values || []).filter(v => v.id !== deleteValueInfo.valueId)
          };
        }
        return g;
      }));
      showSuccess('Đã xóa', `Đã xóa giá trị "${deleteValueInfo.valueName}"`);
    } catch (error) {
      console.error('[ProductDetail] Error deleting value:', error);
      showError('Lỗi xóa', (error as Error).message);
    } finally {
      setDeleteValueInfo(null);
    }
  };

  // === VARIANT OPERATIONS ===

  const handleCreateVariant = async () => {
    if (!newVariantName.trim()) {
      showError('Validation', 'Vui lòng nhập tên biến thể');
      return;
    }

    if (attributeGroups.length > 0 && selectedAttributeValues.size === 0) {
      showError('Validation', 'Vui lòng chọn ít nhất một thuộc tính');
      return;
    }

    try {
      console.log('[ProductDetail] Creating variant:', {
        name: newVariantName.trim(),
        code: newVariantCode.trim() || null,
        price: newVariantPrice ? parseFloat(newVariantPrice) : null,
        imageUrl: newVariantImage,
        attributeValues: Array.from(selectedAttributeValues)
      });

      const result = await fetchJson<ProductVariant>(`/product-attributes/${id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVariantName.trim(),
          code: newVariantCode.trim() || null,
          price: newVariantPrice ? parseFloat(newVariantPrice) : null,
          imageUrl: newVariantImage,
          attributeValueIds: Array.from(selectedAttributeValues)
        }),
        token,
      });

      console.log('[ProductDetail] Variant created:', result);
      setVariants([...variants, result]);
      resetVariantForm();
      showSuccess('Thành công', `Đã tạo biến thể "${result.name}"`);
    } catch (error) {
      console.error('[ProductDetail] Error creating variant:', error);
      showError('Lỗi tạo biến thể', (error as Error).message);
    }
  };

  const confirmDeleteVariant = async () => {
    if (!deleteVariantId) return;
    
    try {
      console.log('[ProductDetail] Deleting variant:', deleteVariantId);
      await fetchJson(`/product-attributes/variants/${deleteVariantId}`, {
        method: 'DELETE',
        token,
      });
      
      setVariants(variants.filter(v => v.id !== deleteVariantId));
      showSuccess('Đã xóa', 'Biến thể đã được xóa');
    } catch (error) {
      console.error('[ProductDetail] Error deleting variant:', error);
      showError('Lỗi xóa', (error as Error).message);
    } finally {
      setDeleteVariantId(null);
    }
  };

  // === ATTRIBUTE SELECTION ===

  const toggleAttributeValue = (valueId: string) => {
    const newSelection = new Set(selectedAttributeValues);
    if (newSelection.has(valueId)) {
      newSelection.delete(valueId);
    } else {
      newSelection.add(valueId);
    }
    setSelectedAttributeValues(newSelection);
  };

  // === VARIANT TYPE DEFINITIONS ===
  
  interface AttributeGroupInfo {
    id: string;
    name: string;
    values: Array<{ id: string; value: string }>;
  }

  // Get unique attribute groups for a variant with color index
  const getVariantAttributeGroups = (variant: ProductVariant): Array<AttributeGroupInfo & { colorIndex: number }> => {
    const groupMap = new Map<string, AttributeGroupInfo & { colorIndex: number }>();
    
    (variant.attributes || []).forEach((attr, index) => {
      if (attr.value?.group) {
        const groupId = attr.value.group.id;
        if (!groupMap.has(groupId)) {
          // Assign color based on group position
          const existingGroups = attributeGroups.map(g => g.id);
          const colorIndex = existingGroups.indexOf(groupId) % ATTRIBUTE_GROUP_COLORS.length;
          
          groupMap.set(groupId, {
            id: groupId,
            name: attr.value.group.name,
            values: [],
            colorIndex
          });
        }
        groupMap.get(groupId)!.values.push({
          id: attr.value.id,
          value: attr.value.value
        });
      }
    });
    
    return Array.from(groupMap.values());
  };
  
  // Open edit variant modal
  const openEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setEditVariantName(variant.name);
    setEditVariantCode(variant.code || '');
    setEditVariantPrice(variant.price ? String(variant.price) : '');
    setEditVariantImage(variant.imageUrl);
    
    // Load current attribute selections
    const currentValues = new Set<string>();
    (variant.attributes || []).forEach(attr => {
      if (attr.valueId) {
        currentValues.add(attr.valueId);
      }
    });
    setEditVariantAttributes(currentValues);
  };
  
  // Reset edit variant form
  const resetEditVariantForm = () => {
    setEditingVariant(null);
    setEditVariantName('');
    setEditVariantCode('');
    setEditVariantPrice('');
    setEditVariantImage(null);
    setEditVariantAttributes(new Set());
  };
  
  // Toggle attribute in edit mode
  const toggleEditVariantAttribute = (valueId: string) => {
    const newSelection = new Set(editVariantAttributes);
    if (newSelection.has(valueId)) {
      newSelection.delete(valueId);
    } else {
      newSelection.add(valueId);
    }
    setEditVariantAttributes(newSelection);
  };
  
  // Save edited variant
  const handleSaveEditVariant = async () => {
    if (!editingVariant) return;
    
    if (!editVariantName.trim()) {
      showError('Validation', 'Vui lòng nhập tên biến thể');
      return;
    }
    
    // Validate attributes if product has attribute groups
    if (attributeGroups.length > 0 && editVariantAttributes.size === 0) {
      showError('Validation', 'Vui lòng chọn ít nhất một thuộc tính');
      return;
    }
    
    setEditVariantSaving(true);
    try {
      console.log('[ProductDetail] Saving variant:', editingVariant.id, {
        name: editVariantName.trim(),
        code: editVariantCode.trim() || null,
        price: editVariantPrice ? parseFloat(editVariantPrice) : null,
        imageUrl: editVariantImage,
        attributeValueIds: Array.from(editVariantAttributes)
      });
      
      const result = await fetchJson<ProductVariant>(`/product-attributes/variants/${editingVariant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editVariantName.trim(),
          code: editVariantCode.trim() || null,
          price: editVariantPrice ? parseFloat(editVariantPrice) : null,
          imageUrl: editVariantImage,
          attributeValueIds: Array.from(editVariantAttributes)
        }),
        token,
      });
      
      // Update local state
      setVariants(variants.map(v => v.id === editingVariant.id ? result : v));
      showSuccess('Thành công', `Đã cập nhật biến thể "${result.name}"`);
      resetEditVariantForm();
    } catch (error) {
      console.error('[ProductDetail] Error saving variant:', error);
      showError('Lỗi lưu', (error as Error).message);
    } finally {
      setEditVariantSaving(false);
    }
  };

  // Reset variant form
  const resetVariantForm = () => {
    setNewVariantName('');
    setNewVariantCode('');
    setNewVariantPrice('');
    setNewVariantImage(null);
    setSelectedAttributeValues(new Set());
  };

  // Format price
  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-medium text-gray-600 mb-2">Không tìm thấy sản phẩm</h2>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`Mã: ${product.code} • ${product.unit}`}
        action={
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        }
      />

      {/* Product Info Card */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Product Image */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-lg border bg-white overflow-hidden">
                <img
                  src={resolveProductImage(product.imageUrl)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                  }}
                />
              </div>
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{product.name}</h1>
                <span className="text-sm text-gray-400 flex-shrink-0">({product.code})</span>
              </div>
              <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>ĐVT: <strong>{product.unit}</strong></span>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {product.productType === 'CEILING_WOOD' && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">Trần gỗ</span>
                )}
                {product.productType === 'FURNITURE' && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Nội thất</span>
                )}
                {product.productType === 'OTHER_ITEM' && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">Hạng mục khác</span>
                )}
                {attributeGroups.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {attributeGroups.length} nhóm • {attributeGroups.reduce((sum, g) => sum + (g.values?.length || 0), 0)} giá trị
                  </span>
                )}
                {variants.length > 0 && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    {variants.length} biến thể
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Info Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Thông tin sản phẩm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="text-gray-500 block mb-1">Mã sản phẩm</label>
              <p className="font-medium">{product.code}</p>
            </div>
            <div>
              <label className="text-gray-500 block mb-1">Tên sản phẩm</label>
              <p className="font-medium">{product.name}</p>
            </div>
            <div>
              <label className="text-gray-500 block mb-1">Đơn vị tính</label>
              <p className="font-medium">{product.unit}</p>
            </div>
            <div>
              <label className="text-gray-500 block mb-1">Loại sản phẩm</label>
              <p className="font-medium">
                {product.productType === 'CEILING_WOOD' ? 'Trần gỗ' : 
                 product.productType === 'FURNITURE' ? 'Nội thất' : 
                 'Hạng mục khác'}
              </p>
            </div>
            <div>
              <label className="text-gray-500 block mb-1">Trạng thái</label>
              <p className="font-medium">{product.isActive ? 'Hoạt động' : 'Đã khóa'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attribute Groups Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Nhóm thuộc tính
            {attributeGroups.length > 0 && (
              <span className="text-sm font-normal text-gray-500">({attributeGroups.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attributeGroups.length === 0 ? (
            <div className="text-center py-6">
              <Layers className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 mb-1">Chưa có thuộc tính nào</p>
              <p className="text-xs text-gray-400">Thêm nhóm thuộc tính để tạo biến thể sản phẩm</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attributeGroups.map((group) => (
                <div key={group.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-lg">{group.name}</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteGroupId(group.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Values */}
                  <div className="flex flex-wrap gap-2">
                    {(group.values || []).length === 0 && (
                      <span className="text-sm text-gray-400 italic">Chưa có giá trị</span>
                    )}
                    {(group.values || []).map((value) => (
                      <div 
                        key={value.id} 
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full"
                      >
                        <span className="text-sm">{value.value}</span>
                        <button
                          onClick={() => setDeleteValueInfo({ groupId: group.id, valueId: value.id, valueName: value.value })}
                          className="text-gray-400 hover:text-red-500 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Add Value */}
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Thêm..."
                        className="h-8 w-28 text-sm"
                        value={selectedGroupForValue === group.id ? newValueName : ''}
                        onChange={(e) => {
                          setSelectedGroupForValue(group.id);
                          setNewValueName(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && selectedGroupForValue === group.id) {
                            handleCreateValue(group.id);
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8"
                        disabled={!newValueName.trim() || selectedGroupForValue !== group.id}
                        onClick={() => handleCreateValue(group.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Group */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Tên nhóm mới (VD: Cấp trần, Chất liệu, Số mặt...)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateGroup();
                }}
              />
              <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm nhóm
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Variants Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Biến thể sản phẩm
            {variants.length > 0 && (
              <span className="text-sm font-normal text-gray-500">({variants.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Create Variant Form */}
          {attributeGroups.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium mb-3">Tạo biến thể mới</h4>
              
              {/* Attribute Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Chọn thuộc tính</label>
                <div className="space-y-2">
                  {attributeGroups.map((group) => (
                    <div key={group.id}>
                      <span className="text-xs font-medium text-gray-600 block mb-1">{group.name}</span>
                      <div className="flex flex-wrap gap-2">
                        {(group.values || []).map((value) => {
                          const isSelected = selectedAttributeValues.has(value.id);
                          return (
                            <button
                              key={value.id}
                              onClick={() => toggleAttributeValue(value.id)}
                              className={cn(
                                'px-3 py-1 rounded-full text-sm transition-colors',
                                isSelected 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-white border hover:bg-gray-100'
                              )}
                            >
                              {value.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên biến thể *</label>
                  <Input
                    value={newVariantName}
                    onChange={(e) => setNewVariantName(e.target.value)}
                    placeholder="VD: Trần gỗ óc chó - 2 cấp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU (mã)</label>
                  <Input
                    value={newVariantCode}
                    onChange={(e) => setNewVariantCode(e.target.value)}
                    placeholder="Mã SKU..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Giá riêng (VND)</label>
                  <Input
                    type="number"
                    value={newVariantPrice}
                    onChange={(e) => setNewVariantPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Ảnh (tùy chọn)</label>
                  <div className="flex items-center gap-2">
                    {newVariantImage ? (
                      <img
                        src={resolveProductImage(newVariantImage)}
                        alt="Variant"
                        className="w-12 h-12 object-contain rounded border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded border bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById('variant-upload')?.click()}
                      disabled={uploading}
                    >
                      {uploading ? '...' : newVariantImage ? 'Thay đổi' : 'Tải ảnh'}
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="variant-upload"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleVariantImageUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleCreateVariant}
                  disabled={!newVariantName.trim() || selectedAttributeValues.size === 0}
                  className="ml-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm biến thể
                </Button>
              </div>
            </div>
          )}

          {/* Variants Table */}
          {variants.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Chưa có biến thể nào</p>
              <p className="text-sm text-gray-400">Tạo biến thể đầu tiên</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-gray-300">
              <table className="w-full text-sm min-w-[900px] table-fixed">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium w-[64px]">Ảnh</th>
                    <th className="text-left p-3 font-medium min-w-[200px] max-w-[280px]">Tên biến thể</th>
                    <th className="text-left p-3 font-medium w-[200px] hidden lg:table-cell">Nhóm thuộc tính</th>
                    <th className="text-left p-3 font-medium w-[120px] hidden md:table-cell">SKU</th>
                    <th className="text-right p-3 font-medium w-[120px]">Giá</th>
                    <th className="text-right p-3 font-medium w-[90px]">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant) => {
                    const groups = getVariantAttributeGroups(variant);
                    return (
                      <tr key={variant.id} className="border-b hover:bg-gray-25 transition-colors">
                        {/* 1) Image */}
                        <td className="p-2 align-middle">
                          <div className="w-12 h-12 rounded-lg border bg-gray-100 overflow-hidden flex-shrink-0 mx-auto">
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
                                <ImageIcon className="h-5 w-5 text-gray-300" />
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* 2) Variant Name */}
                        <td className="p-2 align-middle">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate" title={variant.name}>
                              {variant.name}
                            </p>
                          </div>
                        </td>
                        
                        {/* 3) Attribute Groups - Display as colored badges */}
                        <td className="p-2 align-middle hidden lg:table-cell">
                          <div className="min-w-0">
                            {groups.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {groups.map((group) => (
                                  <span
                                    key={group.id}
                                    className={cn(
                                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                                      ATTRIBUTE_GROUP_COLORS[group.colorIndex]
                                    )}
                                    title={group.name}
                                  >
                                    {group.name}: {group.values.map(v => v.value).join(', ')}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Chưa gắn thuộc tính</span>
                            )}
                          </div>
                        </td>
                        
                        {/* 4) SKU */}
                        <td className="p-2 align-middle hidden md:table-cell">
                          <span 
                            className="text-gray-500 text-xs truncate block" 
                            title={variant.code || undefined}
                          >
                            {variant.code || '-'}
                          </span>
                        </td>
                        
                        {/* 5) Price */}
                        <td className="p-2 align-middle text-right">
                          <span className="font-medium text-gray-900 tabular-nums">
                            {variant.price ? formatPrice(variant.price) : '-'}
                          </span>
                        </td>
                        
                        {/* 6) Actions */}
                        <td className="p-2 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditVariant(variant)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteVariantId(variant.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === DELETE GROUP CONFIRMATION === */}
      {deleteGroupId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium mb-2">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-4">
              Xóa nhóm thuộc tính này sẽ xóa tất cả các giá trị và biến thể liên quan. Bạn có chắc chắn?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteGroupId(null)}>Hủy</Button>
              <Button variant="destructive" onClick={confirmDeleteGroup}>Xóa</Button>
            </div>
          </div>
        </div>
      )}

      {/* === DELETE VALUE CONFIRMATION === */}
      {deleteValueInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium mb-2">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-4">
              Xóa giá trị &quot;{deleteValueInfo.valueName}&quot;?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteValueInfo(null)}>Hủy</Button>
              <Button variant="destructive" onClick={confirmDeleteValue}>Xóa</Button>
            </div>
          </div>
        </div>
      )}

      {/* === DELETE VARIANT CONFIRMATION === */}
      {deleteVariantId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium mb-2">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-4">
              Xóa biến thể này?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteVariantId(null)}>Hủy</Button>
              <Button variant="destructive" onClick={confirmDeleteVariant}>Xóa</Button>
            </div>
          </div>
        </div>
      )}

      {/* === EDIT VARIANT MODAL === */}
      {editingVariant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Edit className="h-4 w-4 text-blue-500" />
                Chỉnh sửa biến thể
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={resetEditVariantForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Variant Image */}
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {editVariantImage ? (
                    <div className="w-20 h-20 rounded-lg border bg-white overflow-hidden">
                      <img
                        src={resolveProductImage(editVariantImage)}
                        alt="Variant"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setEditVariantImage(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-20 h-20 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                      <div className="flex flex-col items-center">
                        <Upload className="h-6 w-6 text-gray-400" />
                        <span className="text-xs text-gray-400 mt-1">Ảnh</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            // Simpler: just set a placeholder or call upload
                            setEditVariantImage(editVariantImage); // Keep current
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Ảnh biến thể (tùy chọn)</p>
                  <p className="text-xs text-gray-400">Hỗ trợ JPG, PNG. Kích thước tối đa 5MB.</p>
                </div>
              </div>

              {/* Variant Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Tên biến thể *</label>
                <Input
                  value={editVariantName}
                  onChange={(e) => setEditVariantName(e.target.value)}
                  placeholder="Nhập tên biến thể..."
                />
              </div>

              {/* SKU and Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU (mã)</label>
                  <Input
                    value={editVariantCode}
                    onChange={(e) => setEditVariantCode(e.target.value)}
                    placeholder="Mã SKU..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Giá riêng (VND)</label>
                  <Input
                    type="number"
                    value={editVariantPrice}
                    onChange={(e) => setEditVariantPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Editable Attributes */}
              {attributeGroups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Thuộc tính *</label>
                  <div className="bg-gray-50 rounded-lg p-3 border space-y-3">
                    {attributeGroups.map((group) => (
                      <div key={group.id}>
                        <span className="text-xs font-medium text-gray-600 block mb-1">{group.name}</span>
                        <div className="flex flex-wrap gap-2">
                          {(group.values || []).map((value) => {
                            const isSelected = editVariantAttributes.has(value.id);
                            return (
                              <button
                                key={value.id}
                                onClick={() => toggleEditVariantAttribute(value.id)}
                                className={cn(
                                  'px-3 py-1 rounded-full text-sm transition-colors',
                                  isSelected 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white border hover:bg-gray-100'
                                )}
                              >
                                {value.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {attributeGroups.length > 0 && editVariantAttributes.size === 0 && (
                    <p className="text-xs text-red-500 mt-1">Vui lòng chọn ít nhất một thuộc tính</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={resetEditVariantForm}>
                  Hủy
                </Button>
                <Button 
                  onClick={handleSaveEditVariant}
                  disabled={!editVariantName.trim() || editVariantSaving || (attributeGroups.length > 0 && editVariantAttributes.size === 0)}
                >
                  {editVariantSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
