'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { Customer } from '@tran-go-hoang-gia/shared';
import { X } from 'lucide-react';

interface EditOrderModalProps {
  order: {
    id: string;
    name: string;
    customerId: string | null;
    address: string | null;
    deadline: string | null;
    note: string | null;
  };
  customers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: (order: { id: string; name: string }) => void;
}

export function EditOrderModal({ order, customers, onClose, onSaved }: EditOrderModalProps) {
  const [form, setForm] = useState({
    name: order.name || '',
    customerId: order.customerId || '',
    address: order.address || '',
    deadline: order.deadline ? order.deadline.split('T')[0] : '',
    note: order.note || '',
  });
  const [loading, setLoading] = useState(false);

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
      const updated = await apiClient<{ id: string; name: string }>(`/projects/${order.id}`, {
        method: 'PUT',
        body: {
          name: form.name,
          customerId: form.customerId,
          address: form.address || undefined,
          deadline: form.deadline || undefined,
          note: form.note || undefined,
        },
      });
      onSaved(updated);
    } catch (error: any) {
      console.error('Failed to update order:', error);
      alert(error.message || 'Có lỗi xảy ra khi cập nhật đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sửa đơn hàng</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className="w-full"
            >
              <option value="">Chọn khách hàng...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
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

          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Nhập ghi chú..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

