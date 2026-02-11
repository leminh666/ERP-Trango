'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VisualSelector } from '@/components/visual-selector';
import { VisualType } from '@tran-go-hoang-gia/shared';

export default function CustomerCreatePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    region: '',
    city: '',
    district: '',
    tags: '',
    note: '',
    visualType: 'ICON' as VisualType,
    iconKey: 'user',
    imageUrl: '',
    color: '#3b82f6',
  });

  useEffect(() => {
    if (!isLoading) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const userData = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      if (!token) {
        router.replace('/login');
      } else if (userData.role !== 'ADMIN') {
        router.replace('/403');
      }
    }
  }, [isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  if (!token || currentUser.role !== 'ADMIN') return null;

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Vui lòng nhập tên khách hàng');
      return;
    }
    if (form.visualType === 'ICON' && !form.iconKey) {
      alert('Vui lòng chọn icon');
      return;
    }
    if (form.visualType === 'IMAGE' && !form.imageUrl) {
      alert('Vui lòng tải lên logo');
      return;
    }

    try {
      setSaving(true);
      const created = await apiClient<{ id: string }>('/customers', {
        method: 'POST',
        body: {
          name: form.name,
          phone: form.phone || undefined,
          address: form.address || undefined,
          region: form.region || undefined,
          city: form.city || undefined,
          district: form.district || undefined,
          tags: form.tags || undefined,
          note: form.note || undefined,
          visualType: form.visualType,
          iconKey: form.iconKey || null,
          imageUrl: form.imageUrl || null,
          color: form.color || null,
        },
      });

      alert('Tạo khách hàng thành công!');
      router.push(`/partners/customers/${created.id}`);
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      alert(error.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tạo khách hàng"
        description="Thêm khách hàng mới (Phase 6 Visual)"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/partners/customers')}>
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
          <div>
            <label className="text-sm font-medium">Tên khách hàng *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nhập tên khách hàng"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Số điện thoại</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Địa chỉ</label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Nhập địa chỉ"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Miền</label>
              <Input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="Miền Bắc, Trung, Nam"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tỉnh/Thành</label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Tỉnh/Thành phố"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Quận/Huyện</label>
              <Input
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder="Quận/Huyện"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Tags</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Tag1, Tag2, Tag3"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Ghi chú</label>
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ghi chú thêm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Icon/Logo</label>
            <VisualSelector
              visualType={form.visualType}
              iconKey={form.iconKey}
              imageUrl={form.imageUrl}
              onVisualTypeChange={(vt) => setForm((prev) => ({ ...prev, visualType: vt }))}
              onIconKeyChange={(ik) => setForm((prev) => ({ ...prev, iconKey: ik }))}
              onImageUrlChange={(iu) => setForm((prev) => ({ ...prev, imageUrl: iu }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
