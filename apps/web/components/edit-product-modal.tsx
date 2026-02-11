'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus, X, Trash2, Edit2, Image as ImageIcon, ChevronDown, ChevronUp,
  Upload, AlertCircle, Building2, Package, Layers, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchJson, resolveProductImage, uploadFile } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Product, ProductAttributeGroup, ProductAttributeValue, ProductVariant } from '@tran-go-hoang-gia/shared';
import { useToast } from '@/components/toast-provider';

// Colors for attribute groups (same as product detail page)
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

// Badge component
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

// Separator
function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px bg-gray-200', className)} />;
}

// Accordion Section
function AccordionSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
  errorCount = 0
}: {
  title: string;
  icon: any;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
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

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onSuccess: () => void;
}

// Types for local state
interface DraftAttributeGroup {
  id: string;
  name: string;
  serverId?: string;
  values: DraftAttributeValue[];
}

interface DraftAttributeValue {
  id: string;
  value: string;
  serverId?: string;
}

interface DraftVariant {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  imageUrl?: string;
  attributeSelections: Record<string, string[]>; // groupId -> valueId[]
  attributeSummary: string;
  serverId?: string;
}

export function EditProductModal({ open, onOpenChange, product, onSuccess }: EditProductModalProps) {
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Accordion state
  const [openSections, setOpenSections] = useState({
    general: true,
    attributes: false,
    variants: false,
  });

  // Form state
  const [formData, setFormData] = useState({
    name: product.name,
    unit: product.unit,
    productType: product.productType || 'OTHER_ITEM',
    imageUrl: product.imageUrl || '',
  });

  // Attribute groups state
  const [attributeGroups, setAttributeGroups] = useState<DraftAttributeGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});

  // Variants state
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

  // Edit variant modal state
  const [editingVariant, setEditingVariant] = useState<DraftVariant | null>(null);
  const [editVariantName, setEditVariantName] = useState('');
  const [editVariantCode, setEditVariantCode] = useState('');
  const [editVariantPrice, setEditVariantPrice] = useState('');
  const [editVariantImage, setEditVariantImage] = useState<string | null>(null);
  const [editVariantSelections, setEditVariantSelections] = useState<Record<string, string[]>>({});
  const [editVariantSaving, setEditVariantSaving] = useState(false);

  // Delete confirmations
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteValueInfo, setDeleteValueInfo] = useState<{ groupId: string; valueId: string; valueName: string } | null>(null);
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Fetch existing data on mount
  useEffect(() => {
    if (open && product.id) {
      fetchExistingData();
    }
  }, [open, product.id]);

  const fetchExistingData = async () => {
    setLoading(true);
    try {
      console.log('[EditProduct] Fetching existing data for:', product.id);

      // Fetch attribute groups
      const groupsData = await fetchJson<ProductAttributeGroup[]>(`/product-attributes/${product.id}/groups`, { token });
      const groups: DraftAttributeGroup[] = Array.isArray(groupsData) ? groupsData.map(g => ({
        id: g.id, // Use server ID as primary
        serverId: g.id,
        name: g.name,
        values: (g.values || []).map(v => ({
          id: v.id,
          serverId: v.id,
          value: v.value
        }))
      })) : [];
      setAttributeGroups(groups);

      // Fetch variants
      const variantsData = await fetchJson<ProductVariant[]>(`/product-attributes/${product.id}/variants`, { token });
      const loadedVariants: DraftVariant[] = Array.isArray(variantsData) ? variantsData.map(v => {
        // Build attribute selections from existing attributes
        const selections: Record<string, string[]> = {};
        (v.attributes || []).forEach(attr => {
          if (attr.value?.groupId) {
            if (!selections[attr.value.groupId]) {
              selections[attr.value.groupId] = [];
            }
            selections[attr.value.groupId].push(attr.valueId);
          }
        });

        // Build summary
        const summaryParts = Object.entries(selections).map(([groupId, valueIds]) => {
          const group = groups.find(g => g.id === groupId);
          if (!group) return null;
          const values = valueIds.map(vid => group.values.find(v => v.id === vid)?.value).filter(Boolean);
          return values.length > 0 ? `${group.name}: ${values.join(', ')}` : null;
        }).filter(Boolean);

        return {
          id: v.id,
          serverId: v.id,
          name: v.name,
          sku: v.code || undefined,
          price: v.price || undefined,
          imageUrl: v.imageUrl || undefined,
          attributeSelections: selections,
          attributeSummary: summaryParts.length > 0 ? summaryParts.join('; ') : 'Mặc định'
        };
      }) : [];
      setVariants(loadedVariants);

      console.log('[EditProduct] Data loaded:', { groups: groups.length, variants: loadedVariants.length });
    } catch (err: any) {
      console.error('[EditProduct] Error fetching data:', err);
      setError(err.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const validationErrors = useMemo(() => {
    const errors: Record<string, string[]> = {};
    if (!formData.name.trim()) {
      errors['general'] = errors['general'] || [];
      errors['general'].push('Tên sản phẩm là bắt buộc');
    }
    return errors;
  }, [formData]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Logo upload
  const handleUploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadFile('/files/upload', file, { token });
      if (result.url) {
        setFormData(prev => ({ ...prev, imageUrl: result.url }));
      } else {
        setError(result.error || 'Upload thất bại');
      }
    } catch (err) {
      setError('Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  // ========== ATTRIBUTE GROUPS CRUD ==========

  const addAttributeGroup = useCallback(async () => {
    if (!newGroupName.trim()) return;

    try {
      const result = await fetchJson<{ id: string; name: string }>(`/product-attributes/${product.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
        token,
      });

      setAttributeGroups(prev => [...prev, {
        id: result.id,
        serverId: result.id,
        name: result.name,
        values: []
      }]);
      setNewGroupName('');
      showSuccess('Thành công', `Đã thêm nhóm "${result.name}"`);
    } catch (err: any) {
      showError('Lỗi', err.message || 'Không thể thêm nhóm');
    }
  }, [newGroupName, product.id, token, showSuccess, showError]);

  const removeAttributeGroup = useCallback(async (groupId: string) => {
    try {
      await fetchJson(`/product-attributes/groups/${groupId}`, {
        method: 'DELETE',
        token,
      });

      setAttributeGroups(prev => prev.filter(g => g.id !== groupId));
      // Also remove from variant selections
      setVariants(prev => prev.map(v => ({
        ...v,
        attributeSelections: Object.fromEntries(
          Object.entries(v.attributeSelections).filter(([key]) => key !== groupId)
        )
      })));
      showSuccess('Đã xóa', 'Nhóm thuộc tính đã được xóa');
    } catch (err: any) {
      showError('Lỗi', err.message || 'Không thể xóa nhóm');
    }
  }, [token, showSuccess, showError]);

  const addAttributeValue = useCallback(async (groupId: string) => {
    const value = newValueInputs[groupId]?.trim();
    if (!value) return;

    try {
      const result = await fetchJson<{ id: string; value: string }>('/product-attributes/values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, value }),
        token,
      });

      setAttributeGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            values: [...g.values, { id: result.id, serverId: result.id, value: result.value }]
          };
        }
        return g;
      }));
      setNewValueInputs(prev => ({ ...prev, [groupId]: '' }));
      showSuccess('Thành công', `Đã thêm "${result.value}"`);
    } catch (err: any) {
      showError('Lỗi', err.message || 'Không thể thêm giá trị');
    }
  }, [newValueInputs, token, showSuccess, showError]);

  const removeAttributeValue = useCallback(async (groupId: string, valueId: string) => {
    try {
      await fetchJson(`/product-attributes/values/${valueId}`, {
        method: 'DELETE',
        token,
      });

      setAttributeGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return { ...g, values: g.values.filter(v => v.id !== valueId) };
        }
        return g;
      }));

      // Remove from variant selections
      setVariants(prev => prev.map(v => ({
        ...v,
        attributeSelections: Object.fromEntries(
          Object.entries(v.attributeSelections).map(([gid, vids]) => [gid, vids.filter(id => id !== valueId)])
        )
      })));
    } catch (err: any) {
      showError('Lỗi', err.message || 'Không thể xóa giá trị');
    }
  }, [token, showError]);

  // ========== VARIANTS CRUD ==========

  const canCreateVariant = useMemo(() => {
    return attributeGroups.length > 0 && attributeGroups.every(g => g.values.length > 0);
  }, [attributeGroups]);

  const handleVariantAttributeToggle = (groupId: string, valueId: string) => {
    setNewVariant(prev => ({
      ...prev,
      attributeSelections: {
        ...prev.attributeSelections,
        [groupId]: prev.attributeSelections[groupId]?.includes(valueId)
          ? prev.attributeSelections[groupId].filter(id => id !== valueId)
          : [...(prev.attributeSelections[groupId] || []), valueId],
      },
    }));
  };

  const generateVariantName = () => {
    const parts = Object.entries(newVariant.attributeSelections)
      .map(([groupId, valueIds]) => {
        const group = attributeGroups.find(g => g.id === groupId);
        if (!group || valueIds.length === 0) return null;
        const values = valueIds.map(vid => group.values.find(v => v.id === vid)?.value).filter(Boolean);
        return `${group.name}: ${values.join(', ')}`;
      })
      .filter(Boolean);
    
    const name = parts.length > 0 ? `${formData.name} - ${parts.join('; ')}` : formData.name;
    setNewVariant(prev => ({ ...prev, name }));
  };

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

  const addVariant = useCallback(async () => {
    if (!newVariant.name.trim()) {
      setError('Tên biến thể là bắt buộc');
      return;
    }

    const hasSelections = Object.values(newVariant.attributeSelections).some(arr => arr.length > 0);
    if (attributeGroups.length > 0 && !hasSelections) {
      setError('Vui lòng chọn ít nhất một thuộc tính');
      return;
    }

    try {
      const summaryParts = Object.entries(newVariant.attributeSelections)
        .map(([groupId, valueIds]) => {
          const group = attributeGroups.find(g => g.id === groupId);
          if (!group || valueIds.length === 0) return null;
          const values = valueIds.map(vid => group.values.find(v => v.id === vid)?.value).filter(Boolean);
          return `${group.name}: ${values.join(', ')}`;
        })
        .filter(Boolean);

      const realValueIds = Object.values(newVariant.attributeSelections).flat();

      const result = await fetchJson<ProductVariant>(`/product-attributes/${product.id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVariant.name,
          code: newVariant.sku || undefined,
          price: newVariant.price ? parseFloat(newVariant.price) : undefined,
          imageUrl: newVariant.imageUrl || undefined,
          attributeValueIds: realValueIds,
        }),
        token,
      });

      setVariants(prev => [...prev, {
        id: result.id,
        serverId: result.id,
        name: result.name,
        sku: result.code || undefined,
        price: result.price || undefined,
        imageUrl: result.imageUrl || undefined,
        attributeSelections: { ...newVariant.attributeSelections },
        attributeSummary: summaryParts.length > 0 ? summaryParts.join('; ') : 'Mặc định'
      }]);

      // Reset form
      setNewVariant({
        name: '',
        sku: '',
        price: '',
        imageUrl: '',
        attributeSelections: {},
      });
      showSuccess('Thành công', 'Đã thêm biến thể');
    } catch (err: any) {
      showError('Lỗi', err.message || 'Không thể tạo biến thể');
    }
  }, [newVariant, attributeGroups, formData.name, product.id, token, showSuccess, showError]);

  const removeVariant = useCallback(async (variantId: string) => {
    try {
      await fetchJson(`/product-attributes/variants/${variantId}`, {
        method: 'DELETE',
        token,
      });

      setVariants(prev => prev.filter(v => v.id !== variantId));
      showSuccess('Đã xóa', 'Biến thể đã được xóa');
    } catch (err: any) {
      showError('Lỗi', err.message || 'Không thể xóa biến thể');
    }
  }, [token, showSuccess, showError]);

  // ========== EDIT VARIANT ==========

  const openEditVariant = (variant: DraftVariant) => {
    setEditingVariant(variant);
    setEditVariantName(variant.name);
    setEditVariantCode(variant.sku || '');
    setEditVariantPrice(variant.price ? String(variant.price) : '');
    setEditVariantImage(variant.imageUrl || null);
    setEditVariantSelections({ ...variant.attributeSelections });
  };

  const toggleEditVariantAttribute = (groupId: string, valueId: string) => {
    setEditVariantSelections(prev => ({
      ...prev,
      [groupId]: prev[groupId]?.includes(valueId)
        ? prev[groupId].filter(id => id !== valueId)
        : [...(prev[groupId] || []), valueId],
    }));
  };

  const saveEditVariant = useCallback(async () => {
    if (!editingVariant) return;

    if (!editVariantName.trim()) {
      setError('Tên biến thể là bắt buộc');
      return;
    }

    if (attributeGroups.length > 0 && Object.values(editVariantSelections).every(arr => arr.length === 0)) {
      setError('Vui lòng chọn ít nhất một thuộc tính');
      return;
    }

    setEditVariantSaving(true);
    try {
      const realValueIds = Object.values(editVariantSelections).flat();

      const summaryParts = Object.entries(editVariantSelections)
        .map(([groupId, valueIds]) => {
          const group = attributeGroups.find(g => g.id === groupId);
          if (!group || valueIds.length === 0) return null;
          const values = valueIds.map(vid => group.values.find(v => v.id === vid)?.value).filter(Boolean);
          return `${group.name}: ${values.join(', ')}`;
        })
        .filter(Boolean);

      const result = await fetchJson<ProductVariant>(`/product-attributes/variants/${editingVariant.serverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editVariantName.trim(),
          code: editVariantCode.trim() || null,
          price: editVariantPrice ? parseFloat(editVariantPrice) : null,
          imageUrl: editVariantImage,
          attributeValueIds: realValueIds,
        }),
        token,
      });

      // Update local state
      setVariants(prev => prev.map(v => {
        if (v.id === editingVariant.id) {
          return {
            ...v,
            name: result.name,
            sku: result.code || undefined,
            price: result.price || undefined,
            imageUrl: result.imageUrl || undefined,
            attributeSelections: { ...editVariantSelections },
            attributeSummary: summaryParts.length > 0 ? summaryParts.join('; ') : 'Mặc định'
          };
        }
        return v;
      }));

      setEditingVariant(null);
      showSuccess('Thành công', 'Đã cập nhật biến thể');
    } catch (err: any) {
      showError('Lỗi', err.message || 'Không thể cập nhật biến thể');
    } finally {
      setEditVariantSaving(false);
    }
  }, [editingVariant, editVariantName, editVariantCode, editVariantPrice, editVariantImage, editVariantSelections, attributeGroups, token, showSuccess, showError]);

  // ========== MAIN SAVE ==========

  const handleSave = async () => {
    if (Object.keys(validationErrors).length > 0) {
      setError('Vui lòng kiểm tra lại thông tin');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await fetchJson(`/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit,
          productType: formData.productType,
          imageUrl: formData.imageUrl || null,
          visualType: 'IMAGE',
        }),
        token,
      });

      showSuccess('Thành công', 'Đã cập nhật sản phẩm');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('[EditProduct] Error saving:', err);
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const getVariantAttributeGroups = (variant: DraftVariant) => {
    const groupMap = new Map<string, { name: string; values: string[]; colorIndex: number }>();
    
    Object.entries(variant.attributeSelections).forEach(([groupId, valueIds]) => {
      const group = attributeGroups.find(g => g.id === groupId);
      if (group) {
        const colorIndex = attributeGroups.findIndex(g => g.id === groupId) % ATTRIBUTE_GROUP_COLORS.length;
        groupMap.set(groupId, {
          name: group.name,
          values: valueIds.map(vid => group.values.find(v => v.id === vid)?.value).filter(Boolean) as string[],
          colorIndex
        });
      }
    });
    
    return Array.from(groupMap.values());
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Đang tải dữ liệu...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle>Sửa sản phẩm</CardTitle>
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
          >
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Tên sản phẩm *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nhập tên sản phẩm..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-unit">Đơn vị tính *</Label>
                  <Input
                    id="edit-unit"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="m2, cái, thùng..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-productType">Loại sản phẩm *</Label>
                <select
                  id="edit-productType"
                  value={formData.productType}
                  onChange={(e) => setFormData(prev => ({ ...prev, productType: e.target.value as 'CEILING_WOOD' | 'FURNITURE' | 'OTHER_ITEM' }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-white"
                >
                  <option value="CEILING_WOOD">Trần gỗ</option>
                  <option value="FURNITURE">Nội thất</option>
                  <option value="OTHER_ITEM">Hạng mục khác</option>
                </select>
              </div>

              {/* Logo Upload */}
              <div>
                <Label>Logo sản phẩm</Label>
                {formData.imageUrl ? (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border mt-1">
                    <img
                      src={resolveProductImage(formData.imageUrl)}
                      alt="Logo"
                      className="w-20 h-20 object-contain rounded-lg border bg-white"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">Logo hiện tại</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('edit-logo-upload')?.click()}
                        >
                          Thay đổi
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        >
                          Xóa
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors mt-1"
                    onClick={() => document.getElementById('edit-logo-upload')?.click()}
                  >
                    {uploading ? (
                      <div className="text-blue-500">Đang tải lên...</div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500">Nhấp để tải lên logo</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="edit-logo-upload"
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
            title="B. Thuộc tính"
            icon={Layers}
            isOpen={openSections.attributes}
            onToggle={() => toggleSection('attributes')}
          >
            <div className="space-y-4">
              {/* Add new group */}
              <div className="flex gap-2">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Tên nhóm thuộc tính mới..."
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
                </div>
              ) : (
                <div className="space-y-4">
                  {attributeGroups.map((group) => (
                    <div key={group.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Input
                          value={group.name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            setAttributeGroups(prev => prev.map(g => g.id === group.id ? { ...g, name: newName } : g));
                          }}
                          placeholder="Tên nhóm..."
                          className="flex-1 font-medium"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteGroupId(group.id)}
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
                              onClick={() => setDeleteValueInfo({ groupId: group.id, valueId: value.id, valueName: value.value })}
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Section C: Biến thể */}
          <AccordionSection
            title="C. Biến thể sản phẩm"
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
                            onClick={() => document.getElementById('edit-variant-image-upload')?.click()}
                            disabled={variantUploading}
                          >
                            {variantUploading ? '...' : newVariant.imageUrl ? 'Thay đổi' : 'Tải ảnh'}
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="edit-variant-image-upload"
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
                      <Button type="button" onClick={generateVariantName} variant="outline" size="sm">
                        <Edit2 className="h-3 w-3 mr-1" />
                        Gợi ý tên
                      </Button>
                      <Button type="button" onClick={addVariant} disabled={!newVariant.name.trim()} className="ml-auto">
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
                        {variants.map((variant) => {
                          const groups = getVariantAttributeGroups(variant);
                          return (
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
                                {groups.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {groups.map((group, idx) => (
                                      <span
                                        key={idx}
                                        className={cn(
                                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                                          ATTRIBUTE_GROUP_COLORS[group.colorIndex]
                                        )}
                                      >
                                        {group.name}: {group.values.join(', ')}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">Chưa gắn thuộc tính</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditVariant(variant)}
                                >
                                  <Edit2 className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteVariantId(variant.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </AccordionSection>
        </CardContent>

        <Separator className="my-2" />

        <div className="p-4 flex justify-end items-center bg-gray-50">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : <><Save className="h-4 w-4 mr-1" />Lưu thay đổi</>}
            </Button>
          </div>
        </div>
      </Card>

      {/* === DELETE GROUP CONFIRMATION === */}
      {deleteGroupId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium mb-2">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-4">Xóa nhóm thuộc tính này? Tất cả giá trị và biến thể liên quan sẽ bị ảnh hưởng.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteGroupId(null)}>Hủy</Button>
              <Button variant="destructive" onClick={() => { removeAttributeGroup(deleteGroupId); setDeleteGroupId(null); }}>Xóa</Button>
            </div>
          </div>
        </div>
      )}

      {/* === DELETE VALUE CONFIRMATION === */}
      {deleteValueInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium mb-2">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-4">Xóa giá trị "{deleteValueInfo.valueName}"?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteValueInfo(null)}>Hủy</Button>
              <Button variant="destructive" onClick={() => { removeAttributeValue(deleteValueInfo.groupId, deleteValueInfo.valueId); setDeleteValueInfo(null); }}>Xóa</Button>
            </div>
          </div>
        </div>
      )}

      {/* === DELETE VARIANT CONFIRMATION === */}
      {deleteVariantId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium mb-2">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-4">Xóa biến thể này?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteVariantId(null)}>Hủy</Button>
              <Button variant="destructive" onClick={() => { removeVariant(deleteVariantId); setDeleteVariantId(null); }}>Xóa</Button>
            </div>
          </div>
        </div>
      )}

      {/* === EDIT VARIANT MODAL === */}
      {editingVariant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-blue-500" />
                Chỉnh sửa biến thể
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Variant Name */}
              <div>
                <Label>Tên biến thể *</Label>
                <Input
                  value={editVariantName}
                  onChange={(e) => setEditVariantName(e.target.value)}
                  placeholder="Tên biến thể..."
                />
              </div>

              {/* SKU and Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SKU (mã)</Label>
                  <Input
                    value={editVariantCode}
                    onChange={(e) => setEditVariantCode(e.target.value)}
                    placeholder="Mã SKU..."
                  />
                </div>
                <div>
                  <Label>Giá riêng (VND)</Label>
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
                  <Label className="mb-2 block">Thuộc tính *</Label>
                  <div className="space-y-3 bg-gray-50 rounded-lg p-3 border">
                    {attributeGroups.map((group) => (
                      <div key={group.id}>
                        <span className="text-xs font-medium text-gray-600 block mb-1">{group.name}</span>
                        <div className="flex flex-wrap gap-2">
                          {group.values.map((value) => {
                            const isSelected = editVariantSelections[group.id]?.includes(value.id);
                            return (
                              <button
                                key={value.id}
                                type="button"
                                onClick={() => toggleEditVariantAttribute(group.id, value.id)}
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
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingVariant(null)}>Hủy</Button>
                <Button 
                  onClick={saveEditVariant} 
                  disabled={editVariantSaving || (!editVariantName.trim()) || (attributeGroups.length > 0 && Object.values(editVariantSelections).every(arr => arr.length === 0))}
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

