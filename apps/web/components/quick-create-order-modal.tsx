'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api';
import { X, FileText, Phone } from 'lucide-react';

interface QuickCreateOrderModalProps {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  onClose: () => void;
  onCreated: (orderId: string, orderName: string) => void;
}

export function QuickCreateOrderModal({
  customerId,
  customerName,
  customerPhone,
  customerAddress,
  onClose,
  onCreated,
}: QuickCreateOrderModalProps) {
  const [form, setForm] = useState({
    name: '',
    address: customerAddress || '',
    deadline: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên đơn hàng');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const project = await apiClient<{ id: string; name: string }>('/projects', {
        method: 'POST',
        body: {
          name: form.name,
          customerId: customerId,
          address: form.address || undefined,
          deadline: form.deadline || undefined,
          note: form.note || undefined,
        },
      });

      onCreated(project.id, project.name);
    } catch (err: any) {
      console.error('Failed to create order:', err);
      setError(err.message || 'Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Tạo đơn hàng mới
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Info - Readonly */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-700">Khách hàng</span>
            </div>
            <p className="font-semibold text-gray-900">{customerName}</p>
            {customerPhone && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                <Phone className="h-3.5 w-3.5" />
                {customerPhone}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tên đơn hàng / Dự án <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nhập tên đơn hàng..."
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Địa chỉ thi công
              </label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Nhập địa chỉ thi công..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Ngày hẹn thi công
              </label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Ghi chú
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px]"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Nhập ghi chú..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo đơn hàng'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

