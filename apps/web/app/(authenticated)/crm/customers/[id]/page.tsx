'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { get, post, put } from '@/lib/api';
import { crmService } from '@/src/services/crm.service';
import { CrmCustomer, CrmActivity, CrmStage, CrmActivityType, FollowUpStatus, Priority, SourceChannel } from '@tran-go-hoang-gia/shared';
import { useToast } from '@/components/toast-provider';
import { 
  ArrowLeft, Phone, MapPin, Calendar, UserCheck, 
  Plus, Clock, Edit, CheckCircle, XCircle, MessageSquare,
  Filter, Search
} from 'lucide-react';

// Stage colors
const STAGE_COLORS: Record<CrmStage, { bg: string; text: string; label: string }> = {
  [CrmStage.LEAD]: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Lead' },
  [CrmStage.QUOTED]: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Đã báo giá' },
  [CrmStage.CONSIDERING]: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Đang phân vân' },
  [CrmStage.APPOINTMENT_SCHEDULED]: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Hẹn khảo sát' },
  [CrmStage.CONTRACT_SIGNED]: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã ký HĐ' },
  [CrmStage.CANCELLED]: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Hủy' },
};

// Activity type labels
const ACTIVITY_TYPE_LABELS: Record<CrmActivityType, string> = {
  [CrmActivityType.CALL]: 'Gọi điện',
  [CrmActivityType.MEETING]: 'Gặp trực tiếp',
  [CrmActivityType.MESSAGE]: 'Zalo/Facebook',
  [CrmActivityType.NOTE]: 'Ghi chú',
  [CrmActivityType.QUOTE]: 'Báo giá',
  [CrmActivityType.OTHER]: 'Khác',
};

// Activity type icons
const ACTIVITY_TYPE_ICONS: Record<CrmActivityType, string> = {
  [CrmActivityType.CALL]: '📞',
  [CrmActivityType.MEETING]: '🤝',
  [CrmActivityType.MESSAGE]: '💬',
  [CrmActivityType.NOTE]: '📝',
  [CrmActivityType.QUOTE]: '📋',
  [CrmActivityType.OTHER]: '📌',
};

// Source labels
const SOURCE_LABELS: Record<SourceChannel, string> = {
  [SourceChannel.FACEBOOK]: 'Facebook',
  [SourceChannel.TIKTOK]: 'Tiktok',
  [SourceChannel.WEBSITE]: 'Web',
  [SourceChannel.ZALO]: 'Zalo',
  [SourceChannel.INTRODUCED]: 'Giới thiệu',
  [SourceChannel.REFERRAL]: 'Referral',
  [SourceChannel.WALK_IN]: 'Đến trực tiếp',
  [SourceChannel.OTHER]: 'Khác',
};

// Follow-up status
const FOLLOWUP_STATUS_LABELS: Record<FollowUpStatus, { label: string; color: string }> = {
  [FollowUpStatus.PENDING]: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800' },
  [FollowUpStatus.DONE]: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
  [FollowUpStatus.MISSED]: { label: 'Quá hạn', color: 'bg-red-100 text-red-800' },
};

// Priority labels
const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: 'Thấp',
  [Priority.MEDIUM]: 'Trung bình',
  [Priority.HIGH]: 'Cao',
};

type ActivityFilter = 'all' | 'today' | 'overdue' | 'upcoming';

export default function CrmCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [customer, setCustomer] = useState<CrmCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [activeTab, setActiveTab] = useState('info');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [activitySearch, setActivitySearch] = useState('');
  
  const [activityForm, setActivityForm] = useState({
    type: CrmActivityType.CALL,
    outcome: '',
    note: '',
    hasNextFollowUp: false,
    nextFollowUpAt: '',
    nextFollowUpNote: '',
    priority: Priority.MEDIUM,
  });

  const customerId = params?.id;

  useEffect(() => {
    if (!authLoading && customerId) {
      fetchCustomer();
    }
  }, [authLoading, customerId]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const data = await get<CrmCustomer>(`/crm/customers/${customerId}`);
      setCustomer(data);
    } catch (error: any) {
      console.error('Failed to fetch customer:', error);
      showError('Lỗi', error.message || 'Không thể tải thông tin khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (newStage: CrmStage) => {
    if (!customer) return;
    try {
      setSaving(true);
      await put(`/crm/customers/${customerId}`, { stage: newStage });
      showSuccess('Thành công', 'Đã cập nhật trạng thái');
      fetchCustomer();
    } catch (error: any) {
      showError('Lỗi', error.message || 'Không thể cập nhật trạng thái');
    } finally {
      setSaving(false);
    }
  };

  const handleActivitySubmit = async () => {
    if (!activityForm.outcome.trim()) {
      showError('Lỗi', 'Vui lòng nhập kết quả xử lý');
      return;
    }
    if (activityForm.hasNextFollowUp && !activityForm.nextFollowUpAt) {
      showError('Lỗi', 'Vui lòng chọn thời gian hẹn tiếp theo');
      return;
    }
    if (activityForm.hasNextFollowUp && !activityForm.nextFollowUpNote.trim()) {
      showError('Lỗi', 'Vui lòng nhập nội dung hẹn');
      return;
    }

    try {
      setSaving(true);
      await crmService.createActivity(customerId as string, {
        type: activityForm.type,
        outcome: activityForm.outcome,
        note: activityForm.note || undefined,
        nextFollowUpAt: activityForm.hasNextFollowUp ? activityForm.nextFollowUpAt : undefined,
        nextFollowUpNote: activityForm.hasNextFollowUp ? activityForm.nextFollowUpNote : undefined,
        priority: activityForm.priority,
      });
      
      showSuccess('Thành công', 'Đã thêm hoạt động và đặt lịch hẹn');
      setShowActivityForm(false);
      setActivityForm({
        type: CrmActivityType.CALL,
        outcome: '',
        note: '',
        hasNextFollowUp: false,
        nextFollowUpAt: '',
        nextFollowUpNote: '',
        priority: Priority.MEDIUM,
      });
      fetchCustomer();
    } catch (error: any) {
      showError('Lỗi', error.message || 'Không thể thêm hoạt động');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async (activityId: string) => {
    try {
      setSaving(true);
      await crmService.updateActivity(activityId, { followUpStatus: FollowUpStatus.DONE });
      showSuccess('Thành công', 'Đã đánh dấu hoàn thành');
      fetchCustomer();
    } catch (error: any) {
      showError('Lỗi', error.message || 'Không thể cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const handleBriefUpdate = async (field: string, value: string) => {
    try {
      setSaving(true);
      await put(`/crm/customers/${customerId}`, { [field]: value });
      fetchCustomer();
    } catch (error: any) {
      showError('Lỗi', error.message || 'Không thể cập nhật');
    } finally {
      setSaving(false);
    }
  };

  // Filter activities
  const getFilteredActivities = () => {
    if (!customer?.activities) return [];
    
    let filtered = [...customer.activities];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Filter by search
    if (activitySearch) {
      const search = activitySearch.toLowerCase();
      filtered = filtered.filter(a => 
        a.outcome?.toLowerCase().includes(search) ||
        a.note?.toLowerCase().includes(search) ||
        a.nextFollowUpNote?.toLowerCase().includes(search)
      );
    }

    // Filter by time
    switch (activityFilter) {
      case 'today':
        filtered = filtered.filter(a => {
          const created = new Date(a.createdAt);
          return created >= todayStart && created < todayEnd;
        });
        break;
      case 'overdue':
        filtered = filtered.filter(a => 
          a.followUpStatus === FollowUpStatus.PENDING && 
          a.nextFollowUpAt && 
          new Date(a.nextFollowUpAt) < now
        );
        break;
      case 'upcoming':
        filtered = filtered.filter(a => 
          a.followUpStatus === FollowUpStatus.PENDING && 
          a.nextFollowUpAt && 
          new Date(a.nextFollowUpAt) >= now && 
          new Date(a.nextFollowUpAt) <= weekEnd
        );
        break;
    }

    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // Calculate time remaining
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <PageHeader
          title="Không tìm thấy"
          description="Khách hàng không tồn tại"
          action={
            <Button onClick={() => router.push('/crm/customers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          }
        />
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Khách hàng không tồn tại hoặc đã bị xóa
          </CardContent>
        </Card>
      </div>
    );
  }

  const stageColor = STAGE_COLORS[customer.stage] || STAGE_COLORS[CrmStage.LEAD];
  const sourceLabel = customer.customer?.sourceChannel 
    ? SOURCE_LABELS[customer.customer.sourceChannel] || customer.customer.sourceChannel 
    : null;
  const filteredActivities = getFilteredActivities();

  return (
    <div>
      <PageHeader
        title={customer.customer?.name || 'Khách hàng CRM'}
        description="Chi tiết khách hàng và lịch sử chăm sóc"
        action={
          <Button variant="outline" onClick={() => router.push('/crm/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        }
      />

      {/* Customer Header Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{customer.customer?.name}</h2>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-1">
                  {customer.customer?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {customer.customer.phone}
                    </span>
                  )}
                  {sourceLabel && (
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                      {sourceLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <select
                className="px-3 py-2 border rounded-md"
                value={customer.stage}
                onChange={(e) => handleStageChange(e.target.value as CrmStage)}
                disabled={saving}
              >
                {Object.entries(STAGE_COLORS).map(([stage, { label }]) => (
                  <option key={stage} value={stage}>{label}</option>
                ))}
              </select>
              {customer.ownerUser && (
                <span className="text-sm text-gray-500">
                  NV phụ trách: <span className="font-medium">{customer.ownerUser.name}</span>
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="brief">Nhu cầu</TabsTrigger>
          <TabsTrigger value="care-log">Nhật ký chăm sóc</TabsTrigger>
        </TabsList>

        {/* Tab: Thông tin */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin khách hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Mã khách hàng</Label>
                  <p className="font-medium">{customer.customer?.code}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Số điện thoại</Label>
                  <p className="font-medium">{customer.customer?.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Địa chỉ</Label>
                  <p className="font-medium">{customer.customer?.address || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Nguồn</Label>
                  <p className="font-medium">{sourceLabel || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Ngày tạo</Label>
                  <p className="font-medium">
                    {customer.customer?.createdAt 
                      ? new Date(customer.customer.createdAt).toLocaleDateString('vi-VN')
                      : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Trạng thái CRM</Label>
                  <p className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${stageColor.bg} ${stageColor.text}`}>
                    {stageColor.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Nhu cầu */}
        <TabsContent value="brief">
          <Card>
            <CardHeader>
              <CardTitle>Nhu cầu khách hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-500">Diện tích (m²)</Label>
                <Input
                  value={customer.area || ''}
                  onBlur={(e) => handleBriefUpdate('area', e.target.value)}
                  placeholder="Nhập diện tích..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-500">Mặt bằng / Không gian</Label>
                <Input
                  value={customer.layout || ''}
                  onBlur={(e) => handleBriefUpdate('layout', e.target.value)}
                  placeholder="Nhập mặt bằng..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-500">Phong cách</Label>
                <Input
                  value={customer.style || ''}
                  onBlur={(e) => handleBriefUpdate('style', e.target.value)}
                  placeholder="Nhập phong cách..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-500">Kiến trúc nhà</Label>
                <Input
                  value={customer.architectureType || ''}
                  onBlur={(e) => handleBriefUpdate('architectureType', e.target.value)}
                  placeholder="Nhập kiểu kiến trúc..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-500">Ghi chú thêm</Label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md mt-1"
                  rows={4}
                  value={customer.briefNote || ''}
                  onBlur={(e) => handleBriefUpdate('briefNote', e.target.value)}
                  placeholder="Ghi chú về nhu cầu khách hàng..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Nhật ký chăm sóc (MERGED) */}
        <TabsContent value="care-log">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Nhật ký chăm sóc</CardTitle>
              <Button size="sm" onClick={() => setShowActivityForm(!showActivityForm)}>
                <Plus className="h-4 w-4 mr-1" />
                Thêm xử lý
              </Button>
            </CardHeader>
            <CardContent>
              {/* Activity Form */}
              {showActivityForm && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Kênh xử lý</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md mt-1"
                        value={activityForm.type}
                        onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as CrmActivityType })}
                      >
                        {Object.entries(ACTIVITY_TYPE_LABELS).map(([type, label]) => (
                          <option key={type} value={type}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Mức ưu tiên</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md mt-1"
                        value={activityForm.priority}
                        onChange={(e) => setActivityForm({ ...activityForm, priority: e.target.value as Priority })}
                      >
                        {Object.entries(PRIORITY_LABELS).map(([p, label]) => (
                          <option key={p} value={p}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Kết quả xử lý *</Label>
                    <Input
                      value={activityForm.outcome}
                      onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })}
                      placeholder="Tóm tắt kết quả..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Ghi chú</Label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      rows={2}
                      value={activityForm.note}
                      onChange={(e) => setActivityForm({ ...activityForm, note: e.target.value })}
                      placeholder="Chi tiết xử lý..."
                    />
                  </div>
                  
                  {/* Next Follow-up */}
                  <div className="border-t pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activityForm.hasNextFollowUp}
                        onChange={(e) => setActivityForm({ 
                          ...activityForm, 
                          hasNextFollowUp: e.target.checked,
                          nextFollowUpAt: e.target.checked ? activityForm.nextFollowUpAt : '',
                          nextFollowUpNote: e.target.checked ? activityForm.nextFollowUpNote : '',
                        })}
                        className="w-4 h-4"
                      />
                      <span className="font-medium">Đặt lịch hẹn tiếp theo</span>
                    </label>
                    
                    {activityForm.hasNextFollowUp && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <Label>Thời gian hẹn *</Label>
                          <Input
                            type="datetime-local"
                            value={activityForm.nextFollowUpAt}
                            onChange={(e) => setActivityForm({ ...activityForm, nextFollowUpAt: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Nội dung hẹn *</Label>
                          <Input
                            value={activityForm.nextFollowUpNote}
                            onChange={(e) => setActivityForm({ ...activityForm, nextFollowUpNote: e.target.value })}
                            placeholder="Nội dung cần làm..."
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleActivitySubmit} disabled={saving}>
                      Lưu & Hẹn
                    </Button>
                    <Button variant="outline" onClick={() => setShowActivityForm(false)}>
                      Hủy
                    </Button>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex gap-1">
                  {(['all', 'today', 'overdue', 'upcoming'] as ActivityFilter[]).map((filter) => (
                    <Button
                      key={filter}
                      variant={activityFilter === filter ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityFilter(filter)}
                    >
                      {filter === 'all' ? 'Tất cả' : 
                       filter === 'today' ? 'Hôm nay' :
                       filter === 'overdue' ? 'Quá hạn' : '7 ngày tới'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Activity Timeline */}
              {filteredActivities.length > 0 ? (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => {
                    const timeRemaining = getTimeRemaining(activity.nextFollowUpAt);
                    const statusInfo = FOLLOWUP_STATUS_LABELS[activity.followUpStatus];
                    
                    return (
                      <div key={activity.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">{ACTIVITY_TYPE_ICONS[activity.type]}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{ACTIVITY_TYPE_LABELS[activity.type]}</span>
                                <span className="text-sm text-gray-500">
                                  {new Date(activity.createdAt).toLocaleString('vi-VN')}
                                </span>
                                {activity.user && (
                                  <span className="text-sm text-gray-400">
                                    by {activity.user.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm mt-1">{activity.outcome}</p>
                              {activity.note && (
                                <p className="text-sm text-gray-600 mt-1">{activity.note}</p>
                              )}
                              
                              {/* Follow-up info */}
                              {activity.nextFollowUpAt && (
                                <div className={`mt-2 p-2 rounded text-sm ${
                                  activity.followUpStatus === FollowUpStatus.DONE ? 'bg-green-50' :
                                  activity.followUpStatus === FollowUpStatus.MISSED ? 'bg-red-50' :
                                  timeRemaining?.isOverdue ? 'bg-red-50' : 'bg-yellow-50'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span className="font-medium">
                                      Hẹn: {new Date(activity.nextFollowUpAt).toLocaleString('vi-VN')}
                                    </span>
                                    {timeRemaining && (
                                      <span className={timeRemaining.isOverdue ? 'text-red-600' : 'text-gray-600'}>
                                        ({timeRemaining.text})
                                      </span>
                                    )}
                                  </div>
                                  {activity.nextFollowUpNote && (
                                    <p className="text-gray-600 mt-1">{activity.nextFollowUpNote}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${statusInfo.color}`}>
                                      {statusInfo.label}
                                    </span>
                                    {activity.followUpStatus === FollowUpStatus.PENDING && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleMarkDone(activity.id)}
                                        disabled={saving}
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Đánh dấu xong
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Chưa có hoạt động nào
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
