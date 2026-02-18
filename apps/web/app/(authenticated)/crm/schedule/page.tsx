'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Phone, Calendar, UserCheck, Clock,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { crmService } from '@/src/services/crm.service';
import { CrmActivity, CrmStage, FollowUpStatus } from '@tran-go-hoang-gia/shared';
import { useToast } from '@/components/toast-provider';

// Stage colors
const STAGE_COLORS: Record<CrmStage, { bg: string; text: string; label: string }> = {
  [CrmStage.LEAD]: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Lead' },
  [CrmStage.QUOTED]: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Đã báo giá' },
  [CrmStage.CONSIDERING]: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Đang phân vân' },
  [CrmStage.APPOINTMENT_SCHEDULED]: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Hẹn khảo sát' },
  [CrmStage.CONTRACT_SIGNED]: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã ký HĐ' },
  [CrmStage.CANCELLED]: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Hủy' },
};

type ViewMode = 'today' | 'overdue' | 'upcoming' | 'week';

interface ScheduleActivity extends CrmActivity {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  stage?: CrmStage;
  ownerName?: string;
}

export default function CrmSchedulePage() {
  const { token, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  
  const [activities, setActivities] = useState<ScheduleActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    // Check for focus param from navigation
    const focusCustomer = searchParams.get('customerId');
    if (focusCustomer) {
      // Will focus on this customer after loading
    }
    fetchSchedule();
  }, [token, viewMode, isAdmin, user?.id]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      let from: string | undefined;
      let to: string | undefined;
      
      switch (viewMode) {
        case 'today':
          // Today start and end
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
          from = todayStart.toISOString();
          to = todayEnd.toISOString();
          break;
        case 'overdue':
          // Before now (overdue)
          from = undefined;
          to = now.toISOString();
          break;
        case 'upcoming':
          // From now to next 7 days
          from = now.toISOString();
          to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'week':
          // This week
          const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay()), 23, 59, 59);
          from = weekStart.toISOString();
          to = weekEnd.toISOString();
          break;
      }

      const data = await crmService.getSchedule({
        from,
        to,
      });
      
      // Transform data to include customer info
      const transformed = (data || []).map((item: any) => ({
        ...item,
        customerName: item.customer?.name,
        customerPhone: item.customer?.phone,
        customerAddress: item.customer?.address,
        stage: item.stage,
        ownerName: item.ownerUser?.name,
      }));
      
      setActivities(transformed);
    } catch (error: any) {
      console.error('Failed to fetch schedule:', error);
      // Only show toast once, not on every render
      if (!activities.length) {
        showError('Lỗi', 'Không thể tải lịch hẹn');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate time until next follow-up
  const getTimeRemaining = (nextFollowUpAt: Date | null) => {
    if (!nextFollowUpAt) return null;
    
    const now = new Date();
    const followUp = new Date(nextFollowUpAt);
    const diff = followUp.getTime() - now.getTime();
    
    if (diff < 0) {
      const hours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
      const days = Math.floor(hours / 24);
      if (days > 0) return { text: `Quá hạn ${days} ngày`, isOverdue: true };
      return { text: `Quá hạn ${hours}h`, isOverdue: true };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return { text: `Còn ${days} ngày`, isOverdue: false };
    if (hours > 0) return { text: `Còn ${hours}h`, isOverdue: false };
    const minutes = Math.floor(diff / (1000 * 60));
    return { text: `Còn ${minutes}p`, isOverdue: false };
  };

  const handleMarkDone = async (activityId: string) => {
    try {
      setSaving(true);
      await crmService.updateActivity(activityId, { followUpStatus: FollowUpStatus.DONE });
      showSuccess('Thành công', 'Đã đánh dấu hoàn thành');
      fetchSchedule();
    } catch (error: any) {
      showError('Lỗi', error.message || 'Không thể cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetail = (customerId: string) => {
    router.push(`/crm/customers/${customerId}?tab=care-log`);
  };

  const getViewModeLabel = (mode: ViewMode) => {
    switch (mode) {
      case 'today': return 'Hôm nay';
      case 'overdue': return 'Quá hạn';
      case 'upcoming': return '7 ngày tới';
      case 'week': return 'Tuần này';
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      activity.customerName?.toLowerCase().includes(searchLower) ||
      activity.customerPhone?.toLowerCase().includes(searchLower) ||
      activity.nextFollowUpNote?.toLowerCase().includes(searchLower) ||
      activity.outcome?.toLowerCase().includes(searchLower)
    );
  });

  // Filter out done activities for pending views
  const displayActivities = viewMode === 'overdue' 
    ? filteredActivities.filter(a => a.followUpStatus === FollowUpStatus.PENDING || a.followUpStatus === FollowUpStatus.MISSED)
    : filteredActivities.filter(a => a.followUpStatus === FollowUpStatus.PENDING);

  return (
    <div>
      <PageHeader
        title="Lịch hẹn CRM"
        description="Lịch hẹn chăm sóc khách hàng"
      />

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['today', 'overdue', 'upcoming', 'week'] as ViewMode[]).map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'default' : 'outline'}
            onClick={() => setViewMode(mode)}
            className="shrink-0"
          >
            {getViewModeLabel(mode)}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm theo tên/SĐT/nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Schedule List */}
      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : displayActivities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            {viewMode === 'overdue' 
              ? 'Không có lịch hẹn quá hạn' 
              : viewMode === 'today'
              ? 'Không có lịch hẹn hôm nay'
              : viewMode === 'upcoming'
              ? 'Không có lịch hẹn trong 7 ngày tới'
              : 'Không có lịch hẹn nào'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {displayActivities.map((activity) => {
            const stageColor = STAGE_COLORS[activity.stage || CrmStage.LEAD];
            const timeRemaining = getTimeRemaining(activity.nextFollowUpAt);
            const isOverdue = activity.followUpStatus === FollowUpStatus.MISSED || timeRemaining?.isOverdue;

            return (
              <Card
                key={activity.id}
                className={`cursor-pointer transition-all hover:shadow-md ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}
                onClick={() => handleViewDetail(activity.customerId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                        <Calendar className={`h-6 w-6 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-semibold truncate">
                            {activity.customerName || 'Khách hàng'}
                          </span>
                          {stageColor && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColor.bg} ${stageColor.text}`}>
                              {stageColor.label}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {activity.customerPhone || 'Chưa có SDT'}
                          </span>
                          {activity.customerAddress && (
                            <span className="flex items-center gap-1 truncate">
                              <UserCheck className="h-3.5 w-3.5" />
                              {activity.customerAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {timeRemaining && (
                        <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {timeRemaining.text}
                          </div>
                          {activity.nextFollowUpAt && (
                            <div className="text-xs text-gray-500">
                              {new Date(activity.nextFollowUpAt).toLocaleString('vi-VN')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Note */}
                  {(activity.nextFollowUpNote || activity.outcome) && (
                    <div className="mt-2 pt-2 border-t text-sm">
                      {activity.nextFollowUpNote && (
                        <div className="text-gray-700">
                          <span className="font-medium">Hẹn:</span> {activity.nextFollowUpNote}
                        </div>
                      )}
                      {activity.outcome && (
                        <div className="text-gray-500 mt-1">
                          <span className="font-medium">KQ:</span> {activity.outcome}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Owner & Actions */}
                  <div className="mt-2 pt-2 border-t flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {activity.ownerName && (
                        <span>NV phụ trách: <span className="font-medium">{activity.ownerName}</span></span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {activity.followUpStatus === FollowUpStatus.PENDING && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkDone(activity.id);
                          }}
                          disabled={saving}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Xong
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
