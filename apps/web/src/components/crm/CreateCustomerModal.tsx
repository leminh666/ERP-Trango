'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { SourceChannel } from '@tran-go-hoang-gia/shared';
import { post } from '@/lib/api';
import { useToast } from '@/components/toast-provider';
import { VIETNAM_PROVINCES } from '@/src/config/provinces';

interface CreateCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  userRole?: string;
  userId?: string;
}

const SOURCE_OPTIONS = [
  { value: SourceChannel.FACEBOOK, label: 'Facebook' },
  { value: SourceChannel.TIKTOK, label: 'Tiktok' },
  { value: SourceChannel.WEBSITE, label: 'Web' },
  { value: SourceChannel.INTRODUCED, label: 'Giới thiệu' },
  { value: 'OTHER', label: 'Khác' },
];

export function CreateCustomerModal({ open, onClose, onCreated, userRole, userId }: CreateCustomerModalProps) {
  const { showSuccess, showError } = useToast();
  const [creating, setCreating] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');
  
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    address: '',
    provinceCode: '',
    provinceName: '',
    source: '' as SourceChannel | 'OTHER',
    sourceNote: '',
    note: '',
  });

  const filteredProvinces = VIETNAM_PROVINCES.filter(p => 
    p.name.toLowerCase().includes(provinceSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!createForm.name.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập tên khách hàng');
      return;
    }
    if (!createForm.phone.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập số điện thoại');
      return;
    }
    if (!createForm.source) {
      showError('Lỗi nhập liệu', 'Vui lòng chọn nguồn khách hàng');
      return;
    }
    if (createForm.source === 'OTHER' && !createForm.sourceNote.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập nguồn khác');
      return;
    }

    try {
      setCreating(true);
      const source = createForm.source === 'OTHER' ? SourceChannel.OTHER : createForm.source;
      const sourceDetail = createForm.source === 'OTHER' ? createForm.sourceNote : undefined;

      await post('/customers', {
        name: createForm.name,
        phone: createForm.phone,
        address: createForm.address || undefined,
        provinceCode: createForm.provinceCode || undefined,
        provinceName: createForm.provinceName || undefined,
        sourceChannel: source,
        sourceDetail: sourceDetail || undefined,
        note: createForm.note || undefined,
        ownerUserId: userRole === 'ADMIN' ? undefined : userId,
      });

      showSuccess('Thành công', 'Tạo khách hàng thành công!');
      resetForm();
      onCreated();
      onClose(); // Close modal after successful creation
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setCreateForm({
      name: '',
      phone: '',
      address: '',
      provinceCode: '',
      provinceName: '',
      source: '' as SourceChannel | 'OTHER',
      sourceNote: '',
      note: '',
    });
    setProvinceSearch('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Tạo khách hàng mới</h2>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Modal Content */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <Label className="block text-sm font-medium mb-1">
              Tên khách hàng <span className="text-red-500">*</span>
            </Label>
            <Input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Nhập tên khách hàng"
            />
          </div>

          {/* Phone */}
          <div>
            <Label className="block text-sm font-medium mb-1">
              Số điện thoại <span className="text-red-500">*</span>
            </Label>
            <Input
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              placeholder="Nhập số điện thoại"
            />
          </div>

          {/* Source */}
          <div>
            <Label className="block text-sm font-medium mb-1">
              Nguồn khách hàng <span className="text-red-500">*</span>
            </Label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={createForm.source}
              onChange={(e) => setCreateForm({ 
                ...createForm, 
                source: e.target.value as SourceChannel | 'OTHER',
                sourceNote: e.target.value !== 'OTHER' ? '' : createForm.sourceNote 
              })}
            >
              <option value="">Chọn nguồn...</option>
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Source Note (if OTHER) */}
          {createForm.source === 'OTHER' && (
            <div>
              <Label className="block text-sm font-medium mb-1">
                Nguồn khác <span className="text-red-500">*</span>
              </Label>
              <Input
                value={createForm.sourceNote}
                onChange={(e) => setCreateForm({ ...createForm, sourceNote: e.target.value })}
                placeholder="VD: Google search, qua bạn bè..."
              />
            </div>
          )}

          {/* Province */}
          <div>
            <Label className="block text-sm font-medium mb-1">Tỉnh/Thành</Label>
            <div className="relative">
              <Input
                value={provinceSearch || createForm.provinceName || ''}
                onChange={(e) => {
                  setProvinceSearch(e.target.value);
                  setCreateForm({ ...createForm, provinceCode: '', provinceName: e.target.value });
                }}
                placeholder="Gõ để tìm..."
                className="w-full"
              />
              {provinceSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredProvinces.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                      onClick={() => {
                        setCreateForm({ 
                          ...createForm, 
                          provinceCode: p.code, 
                          provinceName: p.name 
                        });
                        setProvinceSearch('');
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {createForm.provinceName && (
              <p className="text-xs text-gray-500 mt-1">Đã chọn: {createForm.provinceName}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <Label className="block text-sm font-medium mb-1">Địa chỉ</Label>
            <Input
              value={createForm.address}
              onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              placeholder="Số nhà, đường, phường/xã..."
            />
          </div>

          {/* Note */}
          <div>
            <Label className="block text-sm font-medium mb-1">Ghi chú</Label>
            <textarea
              className="w-full px-3 py-2 border rounded-md text-sm"
              rows={2}
              value={createForm.note}
              onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
              placeholder="Ghi chú thêm..."
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </div>
    </div>
  );
}

