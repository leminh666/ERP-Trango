'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient, resolveProductImage } from '@/lib/api';
import { Factory, ChevronDown, ChevronUp, Percent } from 'lucide-react';

interface WorkshopJob {
  id: string;
  code: string;
  title: string | null;
  amount: number;
  discountAmount: number; // Chiết khấu cho phiếu gia công
  paidAmount: number;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  workshopId: string;
  workshop: {
    id: string;
    name: string;
  } | null;
}

interface WorkshopJobsSummaryProps {
  projectId: string;
  token: string;
  onEditDiscount?: (job: {
    id: string;
    code: string;
    amount: number;
    discountAmount: number;
  }) => void;
}

export function WorkshopJobsSummary({ projectId, token, onEditDiscount }: WorkshopJobsSummaryProps) {
  const [workshopJobs, setWorkshopJobs] = useState<WorkshopJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorkshop, setExpandedWorkshop] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkshopJobs();
  }, [projectId, token]);

  const fetchWorkshopJobs = async () => {
    try {
      const data = await apiClient<any[]>(`/workshop-jobs?projectId=${projectId}`);
      setWorkshopJobs(data);
    } catch (error) {
      console.error('Failed to fetch workshop jobs:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'SENT': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'DONE': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Nháp';
      case 'SENT': return 'Đã gửi';
      case 'IN_PROGRESS': return 'Đang làm';
      case 'DONE': return 'Hoàn thành';
      case 'CANCELLED': return 'Hủy';
      default: return status;
    }
  };

  // Group by workshop
  const jobsByWorkshop = workshopJobs.reduce((acc, job) => {
    const workshopId = job.workshopId;
    if (!acc[workshopId]) {
      acc[workshopId] = {
        workshopName: job.workshop?.name || 'N/A',
        jobs: [],
        totalAmount: 0,
        totalDiscount: 0,
        totalPaid: 0,
      };
    }
    const jobAmount = Number(job.amount || 0);
    const jobDiscount = Number(job.discountAmount || 0);
    const netAmount = Math.max(0, jobAmount - jobDiscount);
    acc[workshopId].jobs.push(job);
    acc[workshopId].totalAmount += netAmount; // Use net amount (after discount)
    acc[workshopId].totalDiscount += jobDiscount;
    acc[workshopId].totalPaid += Number(job.paidAmount || 0);
    return acc;
  }, {} as Record<string, { workshopName: string; jobs: WorkshopJob[]; totalAmount: number; totalDiscount: number; totalPaid: number }>);

  const grandTotal = Object.values(jobsByWorkshop).reduce((sum, w) => sum + w.totalAmount, 0);
  const grandDiscount = Object.values(jobsByWorkshop).reduce((sum, w) => sum + w.totalDiscount, 0);
  const grandPaid = Object.values(jobsByWorkshop).reduce((sum, w) => sum + w.totalPaid, 0);
  const grandRemaining = grandTotal - grandPaid;

  if (loading) {
    return <Card><CardContent className="py-8 text-center">Đang tải...</CardContent></Card>;
  }

  if (workshopJobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Factory className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p>Chưa có phiếu gia công nào cho đơn hàng này</p>
          <p className="text-sm mt-2">Nhấn &quot;Tạo phiếu gia công&quot; để thêm mới</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary by Workshop */}
      {Object.entries(jobsByWorkshop).map(([workshopId, data]) => (
        <Card key={workshopId}>
          <CardHeader
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => setExpandedWorkshop(expandedWorkshop === workshopId ? null : workshopId)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="h-5 w-5 text-orange-600" />
                {data.workshopName}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">
                  {data.jobs.length} phiếu
                </span>
                <span className="font-medium">
                  Tổng: {formatCurrency(data.totalAmount)}
                </span>
                <span className="text-green-600">
                  Đã trả: {formatCurrency(data.totalPaid)}
                </span>
                <span className="text-red-600 font-medium">
                  Còn nợ: {formatCurrency(data.totalAmount - data.totalPaid)}
                </span>
                {expandedWorkshop === workshopId ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
          {expandedWorkshop === workshopId && (
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium">Mã phiếu</th>
                      <th className="text-left p-3 font-medium">Tiêu đề</th>
                      <th className="text-left p-3 font-medium">Trạng thái</th>
                      <th className="text-left p-3 font-medium">Ngày bắt đầu</th>
                      <th className="text-left p-3 font-medium">Hạn</th>
                      <th className="text-right p-3 font-medium">Tổng tiền</th>
                      <th className="text-right p-3 font-medium">Đã trả</th>
                      <th className="text-right p-3 font-medium">Còn nợ</th>
                      <th className="text-center p-3 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobs.map((job) => {
                      const netAmount = Math.max(0, Number(job.amount) - Number(job.discountAmount || 0));
                      const debt = netAmount - Number(job.paidAmount || 0);
                      
                      return (
                        <tr key={job.id} className="border-b">
                        <td className="p-3 font-medium">{job.code}</td>
                        <td className="p-3">{job.title || '-'}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${getStatusColor(job.status)}`}>
                            {getStatusLabel(job.status)}
                          </span>
                        </td>
                        <td className="p-3">{formatDate(job.startDate)}</td>
                        <td className="p-3">{formatDate(job.dueDate)}</td>
                        <td className="p-3 text-right">
                            <div className="font-medium">{formatCurrency(netAmount)}</div>
                            {Number(job.discountAmount) > 0 && (
                              <div className="text-xs text-orange-600">
                                CK: -{formatCurrency(Number(job.discountAmount))}
                              </div>
                            )}
                          </td>
                        <td className="p-3 text-right text-green-600">{formatCurrency(Number(job.paidAmount))}</td>
                        <td className="p-3 text-right text-red-600 font-medium">
                          {formatCurrency(Math.max(0, debt))}
                        </td>
                        <td className="p-3 text-center">
                          {onEditDiscount && (
                              <button
                                onClick={() => onEditDiscount?.({
                                  id: job.id,
                                  code: job.code,
                                  amount: Number(job.amount),
                                  discountAmount: Number(job.discountAmount),
                                })}
                                className="text-orange-600 hover:text-orange-800 p-1 rounded hover:bg-orange-50"
                                title="Chiết khấu phiếu gia công"
                              >
                                <Percent className="h-4 w-4" />
                              </button>
                            )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Grand Total */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between font-bold">
            <span className="text-orange-800">TỔNG CỘNG:</span>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-600">Tổng phải trả: <span className="font-bold text-orange-800">{formatCurrency(grandTotal)}</span></span>
              {grandDiscount > 0 && (
                <span className="text-orange-600">CK: -{formatCurrency(grandDiscount)}</span>
              )}
              <span className="text-green-600">Đã trả: {formatCurrency(grandPaid)}</span>
              <span className="text-red-600">Còn nợ: {formatCurrency(grandRemaining)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

