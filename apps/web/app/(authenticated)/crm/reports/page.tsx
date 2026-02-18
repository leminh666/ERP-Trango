'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, Users, Phone, Calendar, CheckCircle, 
  XCircle, ArrowUpRight, Filter, BarChart3
} from 'lucide-react';
import { crmService, CrmReportFilters } from '@/src/services/crm.service';
import { CrmReport, CrmStage } from '@tran-go-hoang-gia/shared';
import { useToast } from '@/components/toast-provider';

// Stage colors
const STAGE_LABELS: Record<CrmStage, string> = {
  [CrmStage.LEAD]: 'Lead',
  [CrmStage.QUOTED]: 'Đã báo giá',
  [CrmStage.CONSIDERING]: 'Đang phân vân',
  [CrmStage.APPOINTMENT_SCHEDULED]: 'Hẹn khảo sát',
  [CrmStage.CONTRACT_SIGNED]: 'Đã ký HĐ',
  [CrmStage.CANCELLED]: 'Hủy',
};

export default function CrmReportsPage() {
  const { token, user } = useAuth();
  const { showError } = useToast();
  
  const [report, setReport] = useState<CrmReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchReport();
  }, [token, fromDate, toDate, sourceFilter]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      
      const filters: CrmReportFilters = {
        from: fromDate || undefined,
        to: toDate || undefined,
        source: sourceFilter || undefined,
      };

      const data = await crmService.getReport(filters);
      setReport(data);
    } catch (error: any) {
      console.error('Failed to fetch report:', error);
      showError('Lỗi', 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Báo cáo Sale"
          description="Thống kê hiệu quả kinh doanh"
        />
        <div className="text-center py-8">Đang tải...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <PageHeader
          title="Báo cáo Sale"
          description="Thống kê hiệu quả kinh doanh"
        />
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Không có dữ liệu báo cáo
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Báo cáo Sale"
        description="Thống kê hiệu quả kinh doanh"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Từ ngày:</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Đến ngày:</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Leads */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{report.totalLeads}</div>
                <div className="text-sm text-gray-500">Tổng Lead</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{report.activitiesCount}</div>
                <div className="text-sm text-gray-500">Hoạt động CS</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{report.totalFollowUps}</div>
                <div className="text-sm text-gray-500">Lịch hẹn</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{report.conversionRates.leadToContract}%</div>
                <div className="text-sm text-gray-500">Chuyển đổi</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Distribution */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Phân bổ Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(CrmStage).map(([stageKey, _]) => {
              const stage = stageKey as CrmStage;
              const count = report.stageDistribution[stage] || 0;
              const percent = report.totalLeads > 0 
                ? Math.round((count / report.totalLeads) * 100) 
                : 0;
              
              return (
                <div key={stage} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-800">{count}</div>
                  <div className="text-sm text-gray-500">{STAGE_LABELS[stage] || stage}</div>
                  <div className="text-xs text-gray-400">{percent}%</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Tỷ lệ chuyển đổi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Lead to Quoted */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
                <span>Lead → Đã báo giá</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${Math.min(report.conversionRates.leadToQuoted, 100)}%` }}
                  />
                </div>
                <span className="font-medium w-16 text-right">{report.conversionRates.leadToQuoted}%</span>
              </div>
            </div>

            {/* Quoted to Contract */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-green-600" />
                <span>Đã báo giá → Ký HĐ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ width: `${Math.min(report.conversionRates.quotedToContract, 100)}%` }}
                  />
                </div>
                <span className="font-medium w-16 text-right">{report.conversionRates.quotedToContract}%</span>
              </div>
            </div>

            {/* Overall Lead to Contract */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span>Lead → Ký HĐ (tổng)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500" 
                    style={{ width: `${Math.min(report.conversionRates.leadToContract, 100)}%` }}
                  />
                </div>
                <span className="font-medium w-16 text-right">{report.conversionRates.leadToContract}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* By User */}
      {report.byUser && report.byUser.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Theo nhân viên</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Nhân viên</th>
                    <th className="text-right py-2 px-3">Số Lead</th>
                    <th className="text-right py-2 px-3">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byUser.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-3">
                        {item.user?.name || item.user?.email || 'Chưa phân công'}
                      </td>
                      <td className="text-right py-2 px-3 font-medium">
                        {item.count}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-500">
                        {report.totalLeads > 0 
                          ? Math.round((item.count / report.totalLeads) * 100) 
                          : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-medium">
                    <td className="py-2 px-3">Tổng cộng</td>
                    <td className="text-right py-2 px-3">{report.totalLeads}</td>
                    <td className="text-right py-2 px-3">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

