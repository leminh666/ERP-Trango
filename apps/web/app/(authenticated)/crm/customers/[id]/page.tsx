'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { get, post, put } from '@/lib/api';
import { crmService } from '@/src/services/crm.service';
import { CrmCustomer, CrmActivity, CrmStage, CrmActivityType, FollowUpStatus, Priority, SourceChannel } from '@tran-go-hoang-gia/shared';
import { useToast } from '@/components/toast-provider';
import { 
  ArrowLeft, Phone, MapPin, Calendar, UserCheck, 
  Plus, Clock, Edit, CheckCircle, XCircle, MessageSquare,
  Filter, Search, FileText, Receipt, DollarSign, Eye, X, ShoppingBag
} from 'lucide-react';
import Link from 'next/link';
import { CreateOrderModal } from '@/components/create-order-modal';

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
  
  // Related data states
  const [orders, setOrders] = useState<any[]>([]);
  const [incomeReceipts, setIncomeReceipts] = useState<any[]>([]);
  const [expenseReceipts, setExpenseReceipts] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // KPI States
  const [kpiData, setKpiData] = useState({
    totalAmount: 0,
    paidAmount: 0,
    debtAmount: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(false);

  // Form states
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

  // Local form state for needs (Nhu cầu)
  // Modal state for needs (Nhu cầu)
  const [showNeedsModal, setShowNeedsModal] = useState(false);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  
  const [needsForm, setNeedsForm] = useState({
    area: '',
    layout: '',
    style: '',
    architectureType: '',
    briefNote: '',
  });
  const [needsSaving, setNeedsSaving] = useState(false);
  const [needsSaveTimeout, setNeedsSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Update local form when customer data loads
  useEffect(() => {
    if (customer) {
      setNeedsForm({
        area: customer.area || '',
        layout: customer.layout || '',
        style: customer.style || '',
        architectureType: customer.architectureType || '',
        briefNote: customer.briefNote || '',
      });
    }
  }, [customer?.id]); // Only update when customer ID changes

  // Handle input change with debounced auto-save
  const handleNeedsChange = (field: string, value: string) => {
    // Update local form state immediately for UI responsiveness
    setNeedsForm(prev => ({ ...prev, [field]: value }));
    
    // Clear existing timeout
    if (needsSaveTimeout) {
      clearTimeout(needsSaveTimeout);
    }
    
    // Set new timeout for debounced save (800ms)
    const timeout = setTimeout(() => {
      if (customer?.customerId) {
        handleNeedsSave(field, value);
      }
    }, 800);
    
    setNeedsSaveTimeout(timeout);
  };

  // Save individual field to API
  const handleNeedsSave = async (field: string, value: string) => {
    if (!customer?.customerId) return;
    
    try {
      setNeedsSaving(true);
      await put(`/crm/customers/${customer.customerId}`, { [field]: value });
      // Don't refetch - local state is already updated
    } catch (error: any) {
      console.error('Failed to save needs:', error);
      showError('Lỗi', 'Không thể lưu: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setNeedsSaving(false);
    }
  };

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

  const fetchRelatedData = async () => {
    // customer.customerId = core Customer ID (Project.customerId FK)
    // customer.id         = CRM record ID — DO NOT use for project queries
    if (!customer?.customerId) return;

    try {
      setRelatedLoading(true);

      // Use core Customer ID (customer.customerId) — matches Project.customerId FK
      const ordersData = await get<any[]>(`/projects?customerId=${customer.customerId}`);
      setOrders((ordersData || []).slice(0, 5));

      // Transactions also keyed by core Customer ID via project relation
      const incomeData = await get<any[]>(`/transactions?type=INCOME&customerId=${customer.customerId}&take=5&orderBy=desc`);
      setIncomeReceipts(incomeData || []);

      const expenseData = await get<any[]>(`/transactions?type=EXPENSE&customerId=${customer.customerId}&take=5&orderBy=desc`);
      setExpenseReceipts(expenseData || []);
    }catch (error: any) {
      console.error('Failed to fetch related data:', error);
    }finally {
      setRelatedLoading(false);
    }
  };

  // Fetch KPI data (total amount, paid, debt)
  const fetchKpiData = async () => {
    // KPI endpoint expects core Customer ID, not CRM record ID
    if (!customer?.customerId) return;

    try {
      setKpiLoading(true);

      // Pass core Customer ID — backend queries Project.customerId with this value
      const kpiData = await get<{ totalAmount: number; paidAmount: number; debtAmount: number }>(
        `/crm/customers/${customer.customerId}/kpi`
      );
      
      setKpiData({
        totalAmount: kpiData.totalAmount || 0,
        paidAmount: kpiData.paidAmount || 0,
        debtAmount: kpiData.debtAmount || 0,
      });
    } catch (error: any) {
      console.error('Failed to fetch KPI data:', error);
    } finally {
      setKpiLoading(false);
    }
  };

  // Fetch related data when customer is loaded and tab is info
  useEffect(() => {
    if (customer?.customerId) {
      fetchRelatedData();
      fetchKpiData();
    }
  }, [customer?.customerId]);

  const handleStageChange = async (newStage: CrmStage) => {
    if (!customer?.customerId) return;
    try {
      setSaving(true);
      await put(`/crm/customers/${customer.customerId}`, { stage: newStage });
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
      if (!customer?.customerId) return;
      await crmService.createActivity(customer.customerId, {
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
    if (!customer?.customerId) return;
    try {
      setSaving(true);
      await put(`/crm/customers/${customer.customerId}`, { [field]: value });
      showSuccess('Thành công', 'Đã lưu thông tin');
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
  
  // Check if customer has needs data
  const hasNeedsData = !!(customer.area || customer.layout || customer.style || customer.architectureType || customer.briefNote);

  return (
    <div>
      {/* ===== HEADER KHACH HANG ===== */}
      <div className="mb-6 bg-white border rounded-xl shadow-sm overflow-hidden">

        {/* Row 1: Avatar + Tên + SĐT + Actions + Quay lại */}
        <div className="px-5 pt-4 pb-3 flex items-start gap-3">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
            <UserCheck className="h-5 w-5 text-blue-600" />
          </div>

          {/* Tên + SĐT + Actions */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{customer.customer?.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${stageColor.bg} ${stageColor.text}`}>
                {stageColor.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {customer.customer?.phone && (
                <span className="flex items-center gap-1 text-sm text-gray-600">
                  <Phone className="h-3.5 w-3.5" />
                  <a href={`tel:${customer.customer.phone}`} className="hover:text-blue-600 font-medium">
                    {customer.customer.phone}
                  </a>
                </span>
              )}
              {customer.customer?.phone && (
                <a
                  href={"tel:" + customer.customer.phone}
                  title="Gọi điện"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-gray-200 bg-white hover:bg-green-50 hover:text-green-600 hover:border-green-300 text-gray-500 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}
              {customer.customer?.phone && (
                <a
                  href={"https://zalo.me/" + (customer.customer.phone.replace(/\s+/g, "").startsWith("0") ? "84" + customer.customer.phone.replace(/\s+/g, "").slice(1) : customer.customer.phone.replace(/\s+/g, "").replace(/^\+/, ""))}
                  target="_blank" rel="noopener noreferrer" title="Nhắn Zalo"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors overflow-hidden"
                >
                  <img src="/icons/zalo.svg" alt="Zalo" className="h-4 w-4" />
                </a>
              )}
              <button
                onClick={() => setShowCreateOrderModal(true)}
                title="Tạo đơn hàng"
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-gray-200 bg-white hover:bg-accent text-xs font-medium text-gray-600 transition-colors"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Tạo đơn</span>
              </button>
            </div>
          </div>

          {/* Quay lại — top-right */}
          <button
            onClick={() => router.push('/crm/customers')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0 mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </button>
        </div>

        {/* Row 2: Chips thông tin + Dropdown trạng thái */}
        <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
          {customer.customer?.code && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
              <FileText className="h-3 w-3" />
              Mã: <span className="font-medium">{customer.customer.code}</span>
            </span>
          )}
          {sourceLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
              Nguồn: <span className="font-medium">{sourceLabel}</span>
              {customer.customer?.sourceDetail && <span className="text-gray-400">({customer.customer.sourceDetail})</span>}
            </span>
          )}
          {customer.customer?.createdAt && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
              <Calendar className="h-3 w-3" />
              Tạo: <span className="font-medium">{new Date(customer.customer.createdAt).toLocaleDateString('vi-VN')}</span>
            </span>
          )}
          {customer.customer?.address && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600 max-w-[240px]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.customer.address}</span>
            </span>
          )}
          {customer.createdAt && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-full text-xs text-blue-600">
              CRM từ: <span className="font-medium">{new Date(customer.createdAt).toLocaleDateString('vi-VN')}</span>
            </span>
          )}

          {/* Dropdown trạng thái CRM — nằm cuối hàng chip */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {customer.ownerUser && (
              <span className="hidden md:inline text-xs text-gray-400 whitespace-nowrap">
                {customer.ownerUser.name}
              </span>
            )}
            <select
              className="px-2.5 py-1 border rounded-md text-xs bg-white text-gray-700 cursor-pointer font-medium"
              value={customer.stage}
              onChange={(e) => handleStageChange(e.target.value as CrmStage)}
              disabled={saving}
              title="Cập nhật trạng thái CRM"
            >
              {Object.entries(STAGE_COLORS).map(([stage, { label }]) => (
                <option key={stage} value={stage}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: KPI 3 ô */}
        <div className="border-t grid grid-cols-3 divide-x divide-gray-200 bg-gray-50">
          <div className="px-4 py-3 text-center" title="Tổng giá trị các đơn hàng của khách">
            {kpiLoading ? (
              <div className="animate-pulse space-y-1">
                <div className="h-3 bg-gray-200 rounded w-14 mx-auto" />
                <div className="h-5 bg-gray-200 rounded w-20 mx-auto" />
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 font-medium">Tổng tiền</p>
                <p className="text-base font-bold text-blue-700 leading-tight tabular-nums mt-0.5">
                  {kpiData.totalAmount.toLocaleString('vi-VN')}đ
                </p>
              </>
            )}
          </div>
          <div className="px-4 py-3 text-center" title="Tổng số tiền khách đã thanh toán (phiếu thu)">
            {kpiLoading ? (
              <div className="animate-pulse space-y-1">
                <div className="h-3 bg-gray-200 rounded w-20 mx-auto" />
                <div className="h-5 bg-gray-200 rounded w-20 mx-auto" />
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 font-medium">Đã thanh toán</p>
                <p className="text-base font-bold text-green-700 leading-tight tabular-nums mt-0.5">
                  {kpiData.paidAmount.toLocaleString('vi-VN')}đ
                </p>
              </>
            )}
          </div>
          <div className="px-4 py-3 text-center" title="Công nợ = Tổng tiền - Đã thanh toán">
            {kpiLoading ? (
              <div className="animate-pulse space-y-1">
                <div className="h-3 bg-gray-200 rounded w-12 mx-auto" />
                <div className="h-5 bg-gray-200 rounded w-20 mx-auto" />
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 font-medium">Công nợ</p>
                <p className={`text-base font-bold leading-tight tabular-nums mt-0.5 ${kpiData.debtAmount > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {kpiData.debtAmount.toLocaleString('vi-VN')}đ
                </p>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Layout 2 cột: Thông tin chung (2/3) + Nhật ký chăm sóc (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Cột TRÁI: Thông tin chung (2/3) */}
        <div className="lg:col-span-2 space-y-6">
            {/* Nhu cầu / Mong muốn của khách */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Nhu cầu / Mong muốn của khách
                  </CardTitle>
                  <Button 
                    variant={hasNeedsData ? "outline" : "default"} 
                    size="sm"
                    onClick={() => setShowNeedsModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {hasNeedsData ? 'Cập nhật nhu cầu' : 'Tạo nhu cầu'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {hasNeedsData ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {customer.area && (
                        <div>
                          <span className="text-sm text-gray-500">Diện tích:</span>
                          <p className="font-medium">{customer.area} m²</p>
                        </div>
                      )}
                      {customer.layout && (
                        <div>
                          <span className="text-sm text-gray-500">Mặt bằng/Không gian:</span>
                          <p className="font-medium">{customer.layout}</p>
                        </div>
                      )}
                      {customer.style && (
                        <div>
                          <span className="text-sm text-gray-500">Phong cách:</span>
                          <p className="font-medium">{customer.style}</p>
                        </div>
                      )}
                      {customer.architectureType && (
                        <div>
                          <span className="text-sm text-gray-500">Kiến trúc nhà:</span>
                          <p className="font-medium">{customer.architectureType}</p>
                        </div>
                      )}
                    </div>
                    {customer.briefNote && (
                      <div className="pt-2 border-t">
                        <span className="text-sm text-gray-500">Ghi chú thêm:</span>
                        <p className="text-sm mt-1">{customer.briefNote}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Chưa có thông tin nhu cầu. Bấm &quot;Tạo nhu cầu&quot; để nhập thông tin.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orders Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Đơn hàng ({orders.length})
                  </CardTitle>
                  <Link href={`/orders?customerId=${customer.customerId}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      Xem tất cả
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {relatedLoading ? (
                  <div className="text-center py-4 text-gray-500">Đang tải...</div>
                ) : orders.length > 0 ? (
                  <div className="space-y-2">
                    {orders.map((order: any) => (
                      <Link key={order.id} href={`/orders/${order.id}`}>
                        <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50 border">
                          <div>
                            <p className="font-medium text-sm">{order.name || order.code}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {order.status === 'COMPLETED' ? 'Hoàn thành' : 
                               order.status === 'CANCELLED' ? 'Đã hủy' :
                               order.status === 'PENDING' ? 'Chờ xử lý' : order.status}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">Chưa có đơn hàng</div>
                )}
              </CardContent>
            </Card>

            {/* Income Receipts */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-green-600" />
                    Phiếu thu ({incomeReceipts.length})
                  </CardTitle>
                  <Link href={`/cashbook/income`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      Xem tất cả
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {relatedLoading ? (
                  <div className="text-center py-4 text-gray-500">Đang tải...</div>
                ) : incomeReceipts.length > 0 ? (
                  <div className="space-y-2">
                    {incomeReceipts.map((receipt: any) => (
                      <div key={receipt.id} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <p className="font-medium text-sm">{receipt.code}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(receipt.date).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm text-green-600">
                            +{Number(receipt.amount).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">Chưa có phiếu thu</div>
                )}
              </CardContent>
            </Card>

            {/* Expense Receipts */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    Phiếu chi ({expenseReceipts.length})
                  </CardTitle>
                  <Link href={`/cashbook/expense`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      Xem tất cả
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {relatedLoading ? (
                  <div className="text-center py-4 text-gray-500">Đang tải...</div>
                ) : expenseReceipts.length > 0 ? (
                  <div className="space-y-2">
                    {expenseReceipts.map((receipt: any) => (
                      <div key={receipt.id} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <p className="font-medium text-sm">{receipt.code}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(receipt.date).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm text-red-600">
                            -{Number(receipt.amount).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">Chưa có phiếu chi</div>
                )}
              </CardContent>
            </Card>
        </div>

        {/* Cột PHẢI: Nhật ký chăm sóc (1/3) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Nhật ký chăm sóc</CardTitle>
                <Button size="sm" onClick={() => setShowActivityForm(!showActivityForm)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm xử lý
                </Button>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
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
          </div>
        </div>
      </div>



      {/* Modal: Nhu cầu / Mong muốn */}
      {showNeedsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {hasNeedsData ? 'Cập nhật nhu cầu' : 'Tạo nhu cầu'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowNeedsModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Diện tích */}
              <div>
                <Label className="block text-sm font-medium mb-1">Diện tích (m²)</Label>
                <Input
                  type="number"
                  value={needsForm.area}
                  onChange={(e) => setNeedsForm({ ...needsForm, area: e.target.value })}
                  placeholder="Nhập diện tích..."
                />
              </div>

              {/* Mặt bằng/Không gian */}
              <div>
                <Label className="block text-sm font-medium mb-1">Mặt bằng / Không gian</Label>
                <Input
                  value={needsForm.layout}
                  onChange={(e) => setNeedsForm({ ...needsForm, layout: e.target.value })}
                  placeholder="Nhập mặt bằng hoặc không gian..."
                />
              </div>

              {/* Phong cách */}
              <div>
                <Label className="block text-sm font-medium mb-1">Phong cách</Label>
                <Input
                  value={needsForm.style}
                  onChange={(e) => setNeedsForm({ ...needsForm, style: e.target.value })}
                  placeholder="Nhập phong cách..."
                />
              </div>

              {/* Kiến trúc nhà */}
              <div>
                <Label className="block text-sm font-medium mb-1">Kiến trúc nhà</Label>
                <Input
                  value={needsForm.architectureType}
                  onChange={(e) => setNeedsForm({ ...needsForm, architectureType: e.target.value })}
                  placeholder="Nhập kiểu kiến trúc..."
                />
              </div>

              {/* Ghi chú thêm */}
              <div>
                <Label className="block text-sm font-medium mb-1">Ghi chú thêm</Label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={4}
                  value={needsForm.briefNote}
                  onChange={(e) => setNeedsForm({ ...needsForm, briefNote: e.target.value })}
                  placeholder="Ghi chú về nhu cầu khách hàng..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => setShowNeedsModal(false)}>
                Hủy
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    setNeedsSaving(true);
                    await put(`/crm/customers/${customer.customerId}`, {
                      area: needsForm.area || null,
                      layout: needsForm.layout || null,
                      style: needsForm.style || null,
                      architectureType: needsForm.architectureType || null,
                      briefNote: needsForm.briefNote || null,
                    });
                    showSuccess('Thành công', 'Đã lưu nhu cầu khách hàng');
                    setShowNeedsModal(false);
                    fetchCustomer();
                  } catch (error: any) {
                    console.error('Failed to save needs:', error);
                    showError('Lỗi', 'Không thể lưu nhu cầu');
                  } finally {
                    setNeedsSaving(false);
                  }
                }} 
                disabled={needsSaving}
              >
                {needsSaving ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tao don hang */}
      {showCreateOrderModal && (
        <CreateOrderModal
          customers={customer.customer ? [{ id: customer.customer.id, name: customer.customer.name }] : []}
          lockedCustomerId={customer.customer?.id}
          onClose={() => setShowCreateOrderModal(false)}
          onCreated={(_newOrder) => {
            setShowCreateOrderModal(false);
            // Refresh orders list + KPI — stay on page so user sees the new order
            fetchRelatedData();
            fetchKpiData();
          }}
        />
      )}
    </div>
  );
}
