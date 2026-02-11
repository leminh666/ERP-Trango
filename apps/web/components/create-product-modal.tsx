'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, X, Trash2, Edit2, Image as ImageIcon, ChevronDown, ChevronUp,
  Upload, AlertCircle, Building2, Package, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchJson, resolveProductImage, uploadFile } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Product } from '@tran-go-hoang-gia/shared';

// Types for the modal
interface DraftAttributeGroup {
  id: string;
  name: string;
  values: DraftAttributeValue[];
}

interface DraftAttributeValue {
  id: string;
  value: string;
}

interface DraftVariant {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  imageUrl?: string;
  attributeSelections: Record<string, string[]>; // groupId -> valueId[]
  attributeSummary: string;
}

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Badge component replacement
function Badge({ children, className, variant = 'default' }: { children: React.ReactNode; className?: string; variant?: 'default' | 'destructive' | 'secondary' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    destructive: 'bg-red-100 text-red-800',
    secondary: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

// Separator component replacement
function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px bg-gray-200', className)} />;
}

// Accordion Section Component
function AccordionSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
  required = false,
  errorCount = 0
}: {
  title: string;
  icon: any;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  required?: boolean;
  errorCount?: number;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left transition-colors',
          isOpen ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn('h-5 w-5', isOpen ? 'text-blue-600' : 'text-gray-500')} />
          <span className="font-medium">
            {title}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {errorCount > 0 && (
            <Badge variant="destructive" className="ml-2">{errorCount} lỗi</Badge>
          )}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export function CreateProductModal({ open, onOpenChange, onSuccess }: CreateProductModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Accordion state
  const [openSections, setOpenSections] = useState({
    general: true,
    attributes: false,
    variants: false,
  });

  // Section A: General Info
  const [generalInfo, setGeneralInfo] = useState({
    name: '',
    unit: 'm2',
    productType: 'CEILING_WOOD' as 'CEILING_WOOD' | 'FURNITURE' | 'OTHER_ITEM',
    imageUrl: '',
  });

  // Section B: Attribute Groups
  const [attributeGroups, setAttributeGroups] = useState<DraftAttributeGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});

  // Section C: Variants
  const [variants, setVariants] = useState<DraftVariant[]>([]);
  const [newVariant, setNewVariant] = useState<{
    name: string;
    sku: string;
    price: string;
    imageUrl: string;
    attributeSelections: Record<string, string[]>;
  }>({
    name: '',
    sku: '',
    price: '',
    imageUrl: '',
    attributeSelections: {},
  });
  const [variantUploading, setVariantUploading] = useState(false);

  // Generate unique IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: Record<string, string[]> = {};
    
    if (!generalInfo.name.trim()) {
      errors['general'] = errors['general'] || [];
      errors['general'].push('Tên sản phẩm là bắt buộc');
    }
    if (!generalInfo.unit.trim()) {
      errors['general'] = errors['general'] || [];
      errors['general'].push('Đơn vị tính là bắt buộc');
    }
    
    // Attribute validation
    attributeGroups.forEach((group, gi) => {
      if (!group.name.trim()) {
        errors[`attribute-${gi}`] = errors[`attribute-${gi}`] || [];
        errors[`attribute-${gi}`].push('Tên nhóm không được để trống');
      }
      group.values.forEach((value, vi) => {
        if (!value.value.trim()) {
          errors[`attribute-${gi}-value-${vi}`] = errors[`attribute-${gi}-value-${vi}`] || [];
          errors[`attribute-${gi}-value-${vi}`].push('Giá trị không được để trống');
        }
      });
    });

    return errors;
  }, [generalInfo, attributeGroups]);

  const totalErrors = Object.values(validationErrors).reduce((sum, arr) => sum + arr.length, 0);

  // Section A: Image upload
  const handleUploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadFile('/files/upload', file, { token });
      if (result.url) {
        setGeneralInfo(prev => ({ ...prev, imageUrl: result.url }));
      } else {
        setError(result.error || 'Upload thất bại');
      }
    } catch (err) {
      setError('Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  // Section B: Attribute Groups
  const addAttributeGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    
    setAttributeGroups(prev => [
      ...prev,
      {
        id: generateId(),
        name: newGroupName.trim(),
        values: [],
      },
    ]);
    setNewGroupName('');
  }, [newGroupName]);

  const removeAttributeGroup = useCallback((groupId: string) => {
    setAttributeGroups(prev => prev.filter(g => g.id !== groupId));
    setNewValueInputs(prev => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
    // Also remove from variant selections
    setNewVariant(prev => ({
      ...prev,
      attributeSelections: Object.fromEntries(
        Object.entries(prev.attributeSelections).filter(([key]) => key !== groupId)
      ),
    }));
  }, []);

  const addAttributeValue = useCallback((groupId: string) => {
    const value = newValueInputs[groupId]?.trim();
    if (!value) return;
    
    setAttributeGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          values: [...g.values, { id: generateId(), value }],
        };
      }
      return g;
    }));
    setNewValueInputs(prev => ({ ...prev, [groupId]: '' }));
  }, [newValueInputs]);

  const removeAttributeValue = useCallback((groupId: string, valueId: string) => {
    setAttributeGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, values: g.values.filter(v => v.id !== valueId) };
      }
      return g;
    }));
  }, []);

  const updateGroupName = useCallback((groupId: string, name: string) => {
    setAttributeGroups(prev => prev.map(g => g.id === groupId ? { ...g, name } : g));
  }, []);

  // Section C: Variants
  const canCreateVariant = useMemo(() => {
    return attributeGroups.length > 0 && 
           attributeGroups.every(g => g.values.length > 0);
  }, [attributeGroups]);

  const generateVariantName = useCallback(() => {
    const parts = Object.entries(newVariant.attributeSelections)
      .map(([groupId, valueIds]) => {
        const group = attributeGroups.find(g => g.id === groupId);
        if (!group || valueIds.length === 0) return null;
        const values = valueIds.map(vid => group.values.find(v => v.id === vid)?.value).filter(Boolean);
        return `${group.name}: ${values.join(', ')}`;
      })
      .filter(Boolean);
    
    const name = parts.length > 0 
      ? `${generalInfo.name} - ${parts.join('; ')}`
      : generalInfo.name;
    
    setNewVariant(prev => ({ ...prev, name }));
  }, [newVariant, attributeGroups, generalInfo.name]);

  const handleVariantAttributeToggle = useCallback((groupId: string, valueId: string) => {
    setNewVariant(prev => ({
      ...prev,
      attributeSelections: {
        ...prev.attributeSelections,
        [groupId]: prev.attributeSelections[groupId]?.includes(valueId)
          ? prev.attributeSelections[groupId].filter(id => id !== valueId)
          : [...(prev.attributeSelections[groupId] || []), valueId],
      },
    }));
  }, []);

  const handleUploadVariantImage = async (file: File) => {
    setVariantUploading(true);
    try {
      const result = await uploadFile('/files/upload', file, { token });
      if (result.url) {
        setNewVariant(prev => ({ ...prev, imageUrl: result.url }));
      }
    } finally {
      setVariantUploading(false);
    }
  };

  const addVariant = useCallback(() => {
    if (!newVariant.name.trim()) {
      setError('Tên biến thể là bắt buộc');
      return;
    }

    // Validate at least one attribute selected if groups exist
    const hasSelections = Object.values(newVariant.attributeSelections).some(arr => arr.length > 0);
    if (attributeGroups.length > 0 && !hasSelections) {
      setError('Vui lòng chọn ít nhất một thuộc tính');
      return;
    }

    // Generate attribute summary
    const summaryParts = Object.entries(newVariant.attributeSelections)
      .map(([groupId, valueIds]) => {
        const group = attributeGroups.find(g => g.id === groupId);
        if (!group || valueIds.length === 0) return null;
        const values = valueIds.map(vid => group.values.find(v => v.id === vid)?.value).filter(Boolean);
        return `${group.name}: ${values.join(', ')}`;
      })
      .filter(Boolean);

    const variant: DraftVariant = {
      id: generateId(),
      name: newVariant.name,
      sku: newVariant.sku || undefined,
      price: newVariant.price ? parseFloat(newVariant.price) : undefined,
      imageUrl: newVariant.imageUrl || undefined,
      attributeSelections: { ...newVariant.attributeSelections },
      attributeSummary: summaryParts.length > 0 ? summaryParts.join('; ') : 'Mặc định',
    };

    setVariants(prev => [...prev, variant]);
    
    // Reset form
    setNewVariant({
      name: '',
      sku: '',
      price: '',
      imageUrl: '',
      attributeSelections: {},
    });
  }, [newVariant, attributeGroups]);

  const removeVariant = useCallback((variantId: string) => {
    setVariants(prev => prev.filter(v => v.id !== variantId));
  }, []);

  // Submit
  const handleSubmit = async () => {
    // Client-side validation BEFORE sending to backend
    const validationErrors: string[] = [];

    if (!generalInfo.name.trim()) {
      validationErrors.push('Tên sản phẩm là bắt buộc');
    }

    if (!generalInfo.unit.trim()) {
      validationErrors.push('Đơn vị tính là bắt buộc');
    }

    // Validate productType
    const validTypes = ['CEILING_WOOD', 'FURNITURE', 'OTHER_ITEM'];
    if (!validTypes.includes(generalInfo.productType)) {
      validationErrors.push('Loại sản phẩm không hợp lệ');
    }

    // Validate imageUrl - MUST have a valid URL
    if (!generalInfo.imageUrl || generalInfo.imageUrl.trim() === '') {
      validationErrors.push('Logo sản phẩm là bắt buộc - vui lòng tải lên logo');
    } else {
      // Check if it's a valid URL format
      const urlPattern = /^https?:\/\//i;
      if (!urlPattern.test(generalInfo.imageUrl)) {
        validationErrors.push('Logo sản phẩm không hợp lệ - URL phải bắt đầu với http:// hoặc https://');
      }
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create Product - send ONLY required fields, no extra/undefined/null values
      console.log('[CreateProduct] Step 1: Creating product...');
      console.log('[CreateProduct] Payload:', JSON.stringify({
        name: generalInfo.name.trim(),
        unit: generalInfo.unit.trim(),
        productType: generalInfo.productType,
        imageUrl: generalInfo.imageUrl,
        visualType: 'IMAGE',
      }, null, 2));

      const product = await fetchJson<Product>('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: generalInfo.name.trim(),
          unit: generalInfo.unit.trim(),
          productType: generalInfo.productType,
          imageUrl: generalInfo.imageUrl,
          visualType: 'IMAGE',
          // NOTE: We intentionally do NOT send iconKey, color, or any other fields
          // to avoid Prisma errors with unknown fields
        }),
        token,
      });
      console.log('[CreateProduct] Product created:', product.id);

      // 2. Create Attribute Groups & Values with ID mapping
      if (attributeGroups.length > 0) {
        console.log('[CreateProduct] Step 2: Creating attribute groups...');
        
        // Map draft group IDs to real IDs
        const groupIdMap: Record<string, string> = {};
        // Map draft value IDs to real IDs
        const valueIdMap: Record<string, string> = {};
        
        for (const group of attributeGroups) {
          const groupEntity = await fetchJson<{ id: string }>(`/product-attributes/${product.id}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: group.name }),
            token,
          });
          
          // Store the mapping from draft group ID to real group ID
          groupIdMap[group.id] = groupEntity.id;
          
          for (const value of group.values) {
            const valueEntity = await fetchJson<{ id: string }>('/product-attributes/values', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                groupId: groupEntity.id, 
                value: value.value 
              }),
              token,
            });
            
            // Store the mapping from draft value ID to real value ID
            valueIdMap[value.id] = valueEntity.id;
          }
        }
        
        console.log('[CreateProduct] ID mappings:', { groupIdMap, valueIdMap });

        // 3. Create Variants using the ID mappings
        if (variants.length > 0) {
          console.log('[CreateProduct] Step 3: Creating variants...');
          
          for (const variant of variants) {
            // Convert draft value IDs to real IDs
            const realValueIds: string[] = [];
            
            for (const [draftGroupId, draftValueIds] of Object.entries(variant.attributeSelections)) {
              const realGroupId = groupIdMap[draftGroupId];
              if (realGroupId) {
                for (const draftValueId of draftValueIds) {
                  const realValueId = valueIdMap[draftValueId];
                  if (realValueId) {
                    realValueIds.push(realValueId);
                  }
                }
              }
            }
            
            console.log('[CreateProduct] Creating variant:', {
              name: variant.name,
              draftAttributeSelections: variant.attributeSelections,
              realValueIds
            });

            await fetchJson(`/product-attributes/${product.id}/variants`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: variant.name,
                code: variant.sku || undefined,
                price: variant.price,
                imageUrl: variant.imageUrl || undefined,
                attributeValueIds: realValueIds,
              }),
              token,
            });
          }
        }
      } else if (variants.length > 0) {
        // Variants without attributes
        console.log('[CreateProduct] Step 3: Creating variants without attributes...');
        for (const variant of variants) {
          await fetchJson(`/product-attributes/${product.id}/variants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: variant.name,
              code: variant.sku || undefined,
              price: variant.price,
              imageUrl: variant.imageUrl || undefined,
              attributeValueIds: [],
            }),
            token,
          });
        }
      }

      console.log('[CreateProduct] Success!');
      onSuccess();
      onOpenChange(false);
      alert('Tạo sản phẩm thành công!');

    } catch (err: any) {
      console.error('[CreateProduct] Error:', err);

      // Parse error response from backend for better error message
      let errorMessage = 'Có lỗi xảy ra khi tạo sản phẩm';

      if (err.message) {
        // Check if error is from backend (may contain structured info)
        try {
          // If error.message is a JSON string, parse it
          const parsed = JSON.parse(err.message);
          if (parsed.message) {
            errorMessage = parsed.message;
          } else {
            errorMessage = err.message;
          }
        } catch {
          // Not JSON, use as-is
          errorMessage = err.message;
        }
      }

      // Provide more helpful messages for common errors
      if (errorMessage.includes('Logo sản phẩm')) {
        errorMessage = 'Lỗi logo: ' + errorMessage + ' - Vui lòng tải lại logo sản phẩm';
      } else if (errorMessage.includes('đơn vị tính')) {
        errorMessage = 'Lỗi đơn vị: ' + errorMessage + ' - Vui lòng nhập lại';
      } else if (errorMessage.includes('tên sản phẩm')) {
        errorMessage = 'Lỗi tên: ' + errorMessage + ' - Vui lòng nhập lại';
      } else if (errorMessage.includes('Loại sản phẩm')) {
        errorMessage = 'Lỗi loại sản phẩm: ' + errorMessage + ' - Vui lòng chọn lại';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'CEILING_WOOD': return 'Trần gỗ';
      case 'FURNITURE': return 'Nội thất';
      case 'OTHER_ITEM': return 'Hạng mục khác';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle>Thêm sản phẩm mới</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Section A: Thông tin chung */}
          <AccordionSection
            title="A. Thông tin chung"
            icon={Building2}
            isOpen={openSections.general}
            onToggle={() => toggleSection('general')}
            required
            errorCount={validationErrors['general']?.length || 0}
          >
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tên sản phẩm *</Label>
                  <Input
                    id="name"
                    value={generalInfo.name}
                    onChange={(e) => setGeneralInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nhập tên sản phẩm..."
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Đơn vị tính *</Label>
                  <Input
                    id="unit"
                    value={generalInfo.unit}
                    onChange={(e) => setGeneralInfo(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="m2, cái, thùng..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="productType">Loại sản phẩm *</Label>
                <select
                  id="productType"
                  value={generalInfo.productType}
                  onChange={(e) => setGeneralInfo(prev => ({ 
                    ...prev, 
                    productType: e.target.value as 'CEILING_WOOD' | 'FURNITURE' | 'OTHER_ITEM' 
                  }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CEILING_WOOD">Trần gỗ</option>
                  <option value="FURNITURE">Nội thất</option>
                  <option value="OTHER_ITEM">Hạng mục khác</option>
                </select>
              </div>

              {/* Logo Upload */}
              <div>
                <Label>Logo sản phẩm</Label>
                {generalInfo.imageUrl ? (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border mt-1">
                    <img
                      src={resolveProductImage(generalInfo.imageUrl)}
                      alt="Logo"
                      className="w-20 h-20 object-contain rounded-lg border bg-white"
                      onError={(e) => {
                        // Fallback to placeholder on error
                        e.currentTarget.src = '/placeholder-product.png';
                        e.currentTarget.onError = null; // Prevent infinite loop
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">Logo đã tải lên</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('product-logo-upload')?.click()}
                        >
                          Thay đổi
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setGeneralInfo(prev => ({ ...prev, imageUrl: '' }))}
                        >
                          Xóa
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors mt-1"
                    onClick={() => document.getElementById('product-logo-upload')?.click()}
                  >
                    {uploading ? (
                      <div className="text-blue-500">Đang tải lên...</div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500">Nhấp để tải lên logo sản phẩm</p>
                        <p className="text-xs text-gray-400 mt-1">Chấp nhận: JPG, PNG, GIF, WebP (tối đa 5MB)</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="product-logo-upload"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleUploadLogo(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          </AccordionSection>

          {/* Section B: Thuộc tính */}
          <AccordionSection
            title="B. Thuộc tính (tùy chọn)"
            icon={Layers}
            isOpen={openSections.attributes}
            onToggle={() => toggleSection('attributes')}
            errorCount={Object.keys(validationErrors).filter(k => k.startsWith('attribute')).length}
          >
            <div className="space-y-4">
              {/* Add new group */}
              <div className="flex gap-2">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Tên nhóm thuộc tính mới (ví dụ: Cấp trần, Chất liệu)..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addAttributeGroup()}
                />
                <Button type="button" onClick={addAttributeGroup} disabled={!newGroupName.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm nhóm
                </Button>
              </div>

              {/* List of groups */}
              {attributeGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Layers className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Chưa có nhóm thuộc tính nào</p>
                  <p className="text-sm">Thêm nhóm để tạo biến thể sản phẩm</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {attributeGroups.map((group, gi) => (
                    <div key={group.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Input
                          value={group.name}
                          onChange={(e) => updateGroupName(group.id, e.target.value)}
                          placeholder="Tên nhóm..."
                          className="flex-1 font-medium"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeAttributeGroup(group.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Values */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {group.values.map((value) => (
                          <span
                            key={value.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded-full text-sm"
                          >
                            {value.value}
                            <button
                              type="button"
                              onClick={() => removeAttributeValue(group.id, value.id)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={newValueInputs[group.id] || ''}
                          onChange={(e) => setNewValueInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
                          placeholder="Thêm giá trị..."
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addAttributeValue(group.id);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addAttributeValue(group.id)}
                          disabled={!newValueInputs[group.id]?.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Validation errors */}
                      {validationErrors[`attribute-${gi}`]?.map((err, i) => (
                        <p key={i} className="text-xs text-red-500 mt-1">{err}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Section C: Biến thể */}
          <AccordionSection
            title="C. Biến thể sản phẩm (tùy chọn)"
            icon={Package}
            isOpen={openSections.variants}
            onToggle={() => toggleSection('variants')}
          >
            <div className="space-y-4">
              {!canCreateVariant ? (
                <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Chưa thể tạo biến thể</p>
                  <p className="text-sm">Vui lòng thêm ít nhất 1 nhóm thuộc tính có giá trị</p>
                </div>
              ) : (
                <>
                  {/* Create new variant form */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <h4 className="font-medium mb-3">Tạo biến thể mới</h4>
                    
                    {/* Attribute selection */}
                    <div className="space-y-3 mb-4">
                      {attributeGroups.map((group) => (
                        <div key={group.id}>
                          <Label className="text-xs font-medium text-gray-600 mb-1 block">{group.name}</Label>
                          <div className="flex flex-wrap gap-2">
                            {group.values.map((value) => {
                              const isSelected = newVariant.attributeSelections[group.id]?.includes(value.id);
                              return (
                                <span
                                  key={value.id}
                                  className={cn(
                                    'cursor-pointer px-3 py-1 rounded-full text-sm transition-colors',
                                    isSelected 
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-white border hover:bg-gray-100'
                                  )}
                                  onClick={() => handleVariantAttributeToggle(group.id, value.id)}
                                >
                                  {value.value}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Tên biến thể *</Label>
                        <Input
                          value={newVariant.name}
                          onChange={(e) => setNewVariant(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Tên biến thể..."
                        />
                      </div>
                      <div>
                        <Label>SKU (mã)</Label>
                        <Input
                          value={newVariant.sku}
                          onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                          placeholder="Mã SKU..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <Label>Giá riêng (VND)</Label>
                        <Input
                          type="number"
                          value={newVariant.price}
                          onChange={(e) => setNewVariant(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Ảnh biến thể</Label>
                        <div className="flex items-center gap-2">
                          {newVariant.imageUrl ? (
                            <img
                              src={resolveProductImage(newVariant.imageUrl)}
                              alt="Variant"
                              className="w-10 h-10 object-contain rounded border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded border bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById('variant-image-upload')?.click()}
                            disabled={variantUploading}
                          >
                            {variantUploading ? '...' : newVariant.imageUrl ? 'Thay đổi' : 'Tải ảnh'}
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="variant-image-upload"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUploadVariantImage(e.target.files[0]);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        type="button"
                        onClick={generateVariantName}
                        variant="outline"
                        size="sm"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Gợi ý tên
                      </Button>
                      <Button
                        type="button"
                        onClick={addVariant}
                        disabled={!newVariant.name.trim()}
                        className="ml-auto"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Thêm biến thể
                      </Button>
                    </div>
                  </div>

                  {/* Variants list */}
                  {variants.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-6 gap-2 p-3 bg-gray-50 border-b text-sm font-medium">
                        <div>Ảnh</div>
                        <div className="col-span-2">Tên biến thể</div>
                        <div className="col-span-2">Thuộc tính</div>
                        <div>Hành động</div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {variants.map((variant) => (
                          <div key={variant.id} className="grid grid-cols-6 gap-2 p-3 border-b items-center hover:bg-gray-50">
                            <div>
                              {variant.imageUrl ? (
                                <img
                                  src={resolveProductImage(variant.imageUrl)}
                                  alt={variant.name}
                                  className="w-10 h-10 object-contain rounded border"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded border bg-gray-100 flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="col-span-2">
                              <p className="font-medium text-sm">{variant.name}</p>
                              {variant.sku && <p className="text-xs text-gray-500">SKU: {variant.sku}</p>}
                              {variant.price && <p className="text-xs text-green-600">{variant.price.toLocaleString('vi-VN')} VND</p>}
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs">{variant.attributeSummary}</p>
                            </div>
                            <div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeVariant(variant.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </AccordionSection>
        </CardContent>

        <Separator className="my-2" />

        <div className="p-4 flex justify-between items-center bg-gray-50">
          <div className="text-sm text-gray-500">
            {totalErrors > 0 ? (
              <span className="text-red-500">{totalErrors} lỗi cần sửa</span>
            ) : (
              <span className="text-green-600">Sẵn sàng tạo</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || (!generalInfo.name.trim()) || (!generalInfo.unit.trim())}
            >
              {loading ? 'Đang tạo...' : 'Tạo mới'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
