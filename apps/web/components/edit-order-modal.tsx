'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput }from '@/components/common/date-input';
import { Select } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { Customer } from '@tran-go-hoang-gia/shared';
import { X } from 'lucide-react';
import { useToast } from '@/components/toast-provider';

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
  const { showError, showWarning }= useToast();
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
      showWarning('Thiáº¿u thÃ´ng tin', 'Vui lÃ²ng nháº­p tÃªn Ä‘Æ¡n hÃ ng');
      return;
    }
    if (!form.customerId) {
      showWarning('Thiáº¿u thÃ´ng tin', 'Vui lÃ²ng chá»n khÃ¡ch hÃ ng');
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
      showError('Cáº­p nháº­t tháº¥t báº¡i', error.message || 'CÃ³ lá»—i xáº£y ra khi cáº­p nháº­t Ä‘Æ¡n hÃ ng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sá»­a Ä‘Æ¡n hÃ ng</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">TÃªn Ä‘Æ¡n hÃ ng *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nháº­p tÃªn Ä‘Æ¡n hÃ ng"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">KhÃ¡ch hÃ ng *</label>
            <Select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className="w-full"
            >
              <option value="">Chá»n khÃ¡ch hÃ ng...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Äá»‹a chá»‰ thi cÃ´ng</label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Nháº­p Ä‘á»‹a chá»‰"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lá»‹ch háº¹n thi cÃ´ng</label>
            <DateInput
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              placeholder="Chá»n ngÃ y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ghi chÃº</label>
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Nháº­p ghi chÃº..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Há»§y</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Äang lÆ°u...' : 'LÆ°u'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


