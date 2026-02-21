'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Phone, Calendar, UserCheck,
  Plus, ChevronRight, Filter, Trash2
}from 'lucide-react';
import { crmService, CrmCustomerFilters } from '@/src/services/crm.service';
import { CrmCustomer, CrmStage, SourceChannel } from '@tran-go-hoang-gia/shared';
import { useToast }from '@/components/toast-provider';
import { CreateCustomerModal } from '@/src/components/crm/CreateCustomerModal';
import { del }from '@/lib/api';

// Stage colors
const STAGE_COLORS: Record<CrmStage, { bg: string; text: string; label: string }> = {
  [CrmStage.LEAD]: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Lead' },
  [CrmStage.QUOTED]: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Đã báo giá' },
  [CrmStage.CONSIDERING]: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Đang phân vân' },
  [CrmStage.APPOINTMENT_SCHEDULED]: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Hẹn khảo sát' },
  [CrmStage.CONTRACT_SIGNED]: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã ký HĐ' },
  [CrmStage.CANCELLED]: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Hủy' },
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

export default function CrmCustomersPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<CrmStage | ''>('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<CrmCustomer | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  // Zalo link helper
  const buildZaloLink = (phone: string) => {
    const normalized = phone.replace(/\s+/g, '');
    const num = normalized.startsWith('0') ? '84' + normalized.slice(1) : normalized.replace(/^\+/, '');
    return `https://zalo.me/${num}`;
  };

  const handleDelete = async (e: React.MouseEvent, item: CrmCustomer) => {
    e.stopPropagation();
    setConfirmDeleteItem(item);
  };

  const doDelete = async (item: CrmCustomer) => {
    try {
      await del(`/customers/${item.customerId}`);
      setConfirmDeleteItem(null);
      showSuccess('Đã xóa', `Đã xóa khách hàng ${item.customer?.name}`);
      fetchCustomers();
    }catch (error: any) {
      showError('Lỗi', error.message || 'Không thể xóa khách hàng');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [token, search, stageFilter, showOverdueOnly]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const filters: CrmCustomerFilters = {
        search: search || undefined,
        stage: stageFilter as CrmStage || undefined,
        includeOverdue: showOverdueOnly,
      };
      const data = await crmService.getCustomers(filters);
      setCustomers(data);
    } catch (error: any) {
      console.error('Failed to fetch CRM customers:', error);
      showError('Lỗi', 'Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  // Calculate time until next follow-up
  const getNextFollowUpText = (nextFollowUpAt: string | null) => {
    if (!nextFollowUpAt) return null;
    
    const now = new Date();
    const followUp = new Date(nextFollowUpAt);
    const diff = followUp.getTime() - now.getTime();
    
    if (diff < 0) {
      // Overdue
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

  return (
    <div>
      <PageHeader
        title="CRM - CSKH"
        description="Quản lý khách hàng và chăm sóc"
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo khách hàng
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm khách hàng..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <select
              className="px-3 py-2 border rounded-md text-sm"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as CrmStage | '')}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STAGE_COLORS).map(([stage, { label }]) => (
                <option key={stage} value={stage}>{label}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOverdueOnly}
                onChange={(e) => setShowOverdueOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Chỉ hiện quá hạn</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Chưa có khách hàng CRM nào
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {customers.map((item) => {
            const stageColor = STAGE_COLORS[item.stage] || STAGE_COLORS[CrmStage.LEAD];
            
            // Get next follow-up from CrmActivity (not from Customer)
            const nextActivity = item.activities && item.activities.length > 0 
              ? item.activities[0] 
              : null;
            const followUpInfo = nextActivity?.nextFollowUpAt 
              ? getNextFollowUpText(nextActivity.nextFollowUpAt as unknown as string)
              : null;
            const sourceLabel = item.customer?.sourceChannel 
              ? SOURCE_LABELS[item.customer.sourceChannel] || item.customer.sourceChannel 
              : null;

            return (
              <Card
                key={item.id}
                className="transition-all hover:shadow-md"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <UserCheck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            className="text-lg font-semibold truncate hover:text-blue-600 transition-colors text-left"
                            onClick={() => router.push(`/crm/customers/${item.customerId}`)}
                          >
                            {item.customer?.name || 'Khách hàng'}
                          </button>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColor.bg} ${stageColor.text}`}>
                            {stageColor.label}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                          {item.customer?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {item.customer.phone}
                            </span>
                          )}
                          {sourceLabel && (
                            <span className="flex items-center gap-1">
                              <Filter className="h-3.5 w-3.5" />
                              {sourceLabel}
                            </span>
                          )}
                        </div>

                        {/* Brief info */}
                        {(item.area || item.style) && (
                          <div className="text-sm text-gray-500 mt-1">
                            {item.area && <span>Diện tích: {item.area}m²</span>}
                            {item.area && item.style && <span> | </span>}
                            {item.style && <span>Style: {item.style}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Follow-up countdown */}
                      {followUpInfo ? (
                        <div className={`text-sm mr-1 ${followUpInfo.isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span className="hidden sm:inline">{followUpInfo.text}</span>
                            {nextActivity?.nextFollowUpAt && (
                              <span className="text-xs hidden md:inline">
                                ({new Date(nextActivity.nextFollowUpAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })})
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded hidden sm:inline">
                          Chưa hẹn
                        </span>
                      )}

                      {/* Action icons */}
                      {item.customer?.phone && (
                        <a
                          href={"tel:" + item.customer.phone}
                          title="Gọi điện"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-green-50 hover:text-green-600 hover:border-green-300 text-gray-500 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {item.customer?.phone && (
                        <a
                          href={buildZaloLink(item.customer.phone)}
                          target="_blank" rel="noopener noreferrer"
                          title="Nhắn Zalo"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors overflow-hidden"
                        >
                          <img src="/icons/zalo.svg" alt="Zalo" className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        title="Xem chi tiết"
                        onClick={() => router.push(`/crm/customers/${item.customerId}`)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          title="Xóa khách hàng"
                          onClick={(e) => handleDelete(e, item)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-red-100 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-300 text-gray-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Owner info */}
                  {(item.ownerUser || item.customer?.owner) && (
                    <div className="mt-2 pt-2 border-t text-sm text-gray-500">
                      <span>NV phụ trách: </span>
                      <span className="font-medium">
                        {item.ownerUser?.name || item.customer?.owner?.name || 'Chưa phân công'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Customer Modal */}
      <CreateCustomerModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchCustomers}
        userRole={user?.role}
        userId={user?.id}
      />

      {/* Confirm Delete Dialog */}
      {confirmDeleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">Xác nhận xóa?</h3>
            <p className="text-sm text-gray-600 mb-4">Bạn có chắc muốn xóa khách hàng <strong>{confirmDeleteItem.customer?.name}</strong>? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm border rounded hover:bg-gray-50" onClick={() => setConfirmDeleteItem(null)}>Hủy</button>
              <button className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700" onClick={() => doDelete(confirmDeleteItem)}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
