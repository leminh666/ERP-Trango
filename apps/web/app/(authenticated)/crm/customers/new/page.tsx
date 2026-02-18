'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { post } from '@/lib/api';
import { SourceChannel } from '@tran-go-hoang-gia/shared';
import { useToast } from '@/components/toast-provider';
import { ArrowLeft } from 'lucide-react';

// Source options
const SOURCE_OPTIONS = [
  { value: SourceChannel.FACEBOOK, label: 'Facebook' },
  { value: SourceChannel.TIKTOK, label: 'Tiktok' },
  { value: SourceChannel.WEBSITE, label: 'Web' },
  { value: SourceChannel.INTRODUCED, label: 'Giới thiệu' },
  { value: 'OTHER', label: 'Khác' },
];

export default function CrmCustomerCreatePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    region: '',
    city: '',
    source: '' as SourceChannel | 'OTHER',
    sourceNote: '',
    note: '',
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const handleSave = async () => {
    // Validation
    if (!form.name.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập tên khách hàng');
      return;
    }
    if (!form.phone.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập số điện thoại');
      return;
    }
    if (!form.source) {
      showError('Lỗi nhập liệu', 'Vui lòng chọn nguồn khách hàng');
      return;
    }
    if (form.source === 'OTHER' && !form.sourceNote.trim()) {
      showError('Lỗi nhập liệu', 'Vui lòng nhập nguồn khác');
      return;
    }

    try {
      setSaving(true);

      // Prepare data - map "OTHER" to SourceChannel.OTHER and add sourceNote
      const source = form.source === 'OTHER' ? SourceChannel.OTHER : form.source;
      const sourceDetail = form.source === 'OTHER' ? form.sourceNote : undefined;

      await post('/customers', {
        name: form.name,
        phone: form.phone,
        address: form.address || undefined,
        region: form.region || undefined,
        city: form.city || undefined,
        sourceChannel: source,
        sourceDetail: sourceDetail || undefined,
        note: form.note || undefined,
        ownerUserId: user?.role === 'ADMIN' ? undefined : user?.id,
      });

      showSuccess('Thành công', 'Tạo khách hàng thành công!');
      router.push('/crm/customers');
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tạo khách hàng CRM"
        description="Thêm khách hàng mới vào hệ thống CRM"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/crm/customers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <Label className="block text-sm font-medium mb-1">
              Tên khách hàng <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nhập tên khách hàng"
            />
          </div>

          {/* Phone */}
          <div>
            <Label className="block text-sm font-medium mb-1">
              Số điện thoại <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
              value={form.source}
              onChange={(e) => setForm({ 
                ...form, 
                source: e.target.value as SourceChannel | 'OTHER',
                sourceNote: e.target.value !== 'OTHER' ? '' : form.sourceNote 
              })}
            >
              <option value="">Chọn nguồn...</option>
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Source Note (if OTHER) */}
          {form.source === 'OTHER' && (
            <div>
              <Label className="block text-sm font-medium mb-1">
                Nguồn khác <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.sourceNote}
                onChange={(e) => setForm({ ...form, sourceNote: e.target.value })}
                placeholder="Nhập nguồn khách hàng (VD: Google search, qua bạn bè...)"
              />
            </div>
          )}

          {/* Address */}
          <div>
            <Label className="block text-sm font-medium mb-1">Địa chỉ</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Nhập địa chỉ"
            />
          </div>

          {/* Region & City */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium mb-1">Miền</Label>
              <Input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="Miền Bắc/Trung/Nam"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Tỉnh/Thành</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Tỉnh/Thành phố"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <Label className="block text-sm font-medium mb-1">Ghi chú</Label>
            <textarea
              className="w-full px-3 py-2 border rounded-md text-sm"
              rows={3}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ghi chú thêm..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

