'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  code: string;
  supplierName: string | null;
  totalAmount: number;
  paidAmount: number;
  status: string;
  date: string | null;
}

interface PurchaseOrdersSummaryProps {
  projectId: string;
  token: string;
}

export function PurchaseOrdersSummary({ projectId, token }: PurchaseOrdersSummaryProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [projectId, token]);

  const fetchPurchaseOrders = async () => {
    try {
      // Tạm thời gọi API placeholder - chưa có module mua hàng
      // Khi có module mua hàng thì thay thế bằng API thật
      const res = await fetch(`/api/purchase-orders?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPurchaseOrders(data);
      }
    } catch (error) {
      console.log('No purchase orders module yet or error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return <Card><CardContent className="py-8 text-center">Đang tải...</CardContent></Card>;
  }

  if (purchaseOrders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p>Chưa có dữ liệu mua hàng cho đơn này</p>
          <p className="text-sm mt-2">Module mua hàng đang được phát triển</p>
        </CardContent>
      </Card>
    );
  }

  const grandTotal = purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0);
  const grandPaid = purchaseOrders.reduce((sum, po) => sum + Number(po.paidAmount), 0);
  const grandRemaining = grandTotal - grandPaid;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">Mã đơn</th>
                  <th className="text-left p-3 font-medium">Nhà cung cấp</th>
                  <th className="text-left p-3 font-medium">Ngày</th>
                  <th className="text-left p-3 font-medium">Trạng thái</th>
                  <th className="text-right p-3 font-medium">Tổng tiền</th>
                  <th className="text-right p-3 font-medium">Đã trả</th>
                  <th className="text-right p-3 font-medium">Còn nợ</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-b">
                    <td className="p-3 font-medium">{po.code}</td>
                    <td className="p-3">{po.supplierName || '-'}</td>
                    <td className="p-3">{formatDate(po.date)}</td>
                    <td className="p-3">{po.status}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(Number(po.totalAmount))}</td>
                    <td className="p-3 text-right text-green-600">{formatCurrency(Number(po.paidAmount))}</td>
                    <td className="p-3 text-right text-red-600 font-medium">
                      {formatCurrency(Number(po.totalAmount) - Number(po.paidAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Grand Total */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between font-bold">
            <span className="text-blue-800">TỔNG CỘNG:</span>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-600">Tổng mua: <span className="font-bold text-blue-800">{formatCurrency(grandTotal)}</span></span>
              <span className="text-green-600">Đã trả: {formatCurrency(grandPaid)}</span>
              <span className="text-red-600">Còn nợ: {formatCurrency(grandRemaining)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

