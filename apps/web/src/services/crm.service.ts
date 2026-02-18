// CRM Service - API client for CRM module
import { get, post, put } from '@/lib/api';
import { CrmCustomer, CrmActivity, CrmScheduleItem, CrmReport, CrmStage, CrmActivityType, FollowUpStatus, Priority } from '@tran-go-hoang-gia/shared';

export interface CrmCustomerFilters {
  search?: string;
  stage?: CrmStage;
  ownerUserId?: string;
  source?: string;
  includeOverdue?: boolean;
}

export interface CrmCreateActivityInput {
  type: CrmActivityType;
  outcome?: string;
  note?: string;
  nextFollowUpAt?: string;
  nextFollowUpNote?: string;
  priority?: Priority;
}

export interface CrmUpdateActivityInput {
  followUpStatus?: FollowUpStatus;
  outcome?: string;
  note?: string;
}

export interface CrmUpdateCustomerInput {
  stage?: CrmStage;
  area?: string;
  layout?: string;
  style?: string;
  architectureType?: string;
  briefNote?: string;
  ownerUserId?: string;
  nextFollowUpAt?: string;
  nextFollowUpNote?: string;
}

export interface CrmReportFilters {
  from?: string;
  to?: string;
  ownerUserId?: string;
  source?: string;
}

export const crmService = {
  // ========== CUSTOMERS ==========
  
  async getCustomers(filters?: CrmCustomerFilters): Promise<CrmCustomer[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.stage) params.append('stage', filters.stage);
    if (filters?.ownerUserId) params.append('ownerUserId', filters.ownerUserId);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.includeOverdue) params.append('includeOverdue', 'true');
    
    return get<CrmCustomer[]>(`/crm/customers?${params.toString()}`);
  },

  async getCustomer(customerId: string): Promise<CrmCustomer> {
    return get<CrmCustomer>(`/crm/customers/${customerId}`);
  },

  async createCrmCustomer(customerId: string, data: {
    ownerUserId?: string;
    source?: string;
    sourceNote?: string;
  }): Promise<CrmCustomer> {
    return post<CrmCustomer>(`/crm/customers/${customerId}`, data);
  },

  async updateCrmCustomer(customerId: string, data: CrmUpdateCustomerInput): Promise<CrmCustomer> {
    return put<CrmCustomer>(`/crm/customers/${customerId}`, data);
  },

  // ========== ACTIVITIES ==========

  async createActivity(customerId: string, data: CrmCreateActivityInput): Promise<CrmActivity> {
    return post<CrmActivity>(`/crm/customers/${customerId}/activities`, data);
  },

  async updateActivity(activityId: string, data: CrmUpdateActivityInput): Promise<CrmActivity> {
    return put<CrmActivity>(`/crm/activities/${activityId}`, data);
  },

  async getCustomerActivities(customerId: string): Promise<CrmActivity[]> {
    return get<CrmActivity[]>(`/crm/customers/${customerId}/activities`);
  },

  // ========== SCHEDULE ==========

  async getSchedule(filters?: {
    from?: string;
    to?: string;
    ownerUserId?: string;
  }): Promise<CrmScheduleItem[]> {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.ownerUserId) params.append('ownerUserId', filters.ownerUserId);
    
    return get<CrmScheduleItem[]>(`/crm/schedule?${params.toString()}`);
  },

  // ========== REPORTS ==========

  async getReport(filters?: CrmReportFilters): Promise<CrmReport> {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.ownerUserId) params.append('ownerUserId', filters.ownerUserId);
    if (filters?.source) params.append('source', filters.source);
    
    return get<CrmReport>(`/crm/reports?${params.toString()}`);
  },
};
