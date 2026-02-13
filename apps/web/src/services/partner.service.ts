// =============================================================================
// Partner Service - Customer/Supplier API calls
// =============================================================================
//
// All partner-related API calls should be made through this service.
//
// USAGE:
//   import { partnerService } from '@/services/partner.service';
//
//   // Get all customers
//   const customers = await partnerService.getCustomers();
//
//   // Get all suppliers
//   const suppliers = await partnerService.getSuppliers();
//
// =============================================================================

import { apiClient, get, post, put, patch, del } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface Partner {
  id: string;
  code: string;
  name: string;
  type: 'customer' | 'supplier';
  email?: string;
  phone?: string;
  address?: string;
  district?: string;
  city?: string;
  region?: string;
  taxCode?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartnerCreate {
  code: string;
  name: string;
  type: 'customer' | 'supplier';
  email?: string;
  phone?: string;
  address?: string;
  district?: string;
  city?: string;
  region?: string;
  taxCode?: string;
  contactPerson?: string;
  notes?: string;
}

export interface PartnerUpdate extends Partial<PartnerCreate> {
  id: string;
}

export interface PartnerListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'customer' | 'supplier';
  region?: string;
  city?: string;
  isActive?: boolean;
}

export interface PaginatedPartners {
  items: Partner[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// API Endpoints
// =============================================================================

const ENDPOINTS = {
  PARTNERS: '/partners',
  PARTNER_BY_ID: (id: string) => `/partners/${id}`,
  CUSTOMERS: '/partners/customers',
  SUPPLIERS: '/partners/suppliers',
  CUSTOMER_REGIONS: '/reports/customer-regions',
};

// =============================================================================
// Partner Service
// =============================================================================

export const partnerService = {
  // ==================== Customers ====================

  /**
   * Get all customers
   */
  async getCustomers(params?: Omit<PartnerListParams, 'type'>): Promise<Partner[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.region) query.set('region', params.region);
    if (params?.city) query.set('city', params.city);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.CUSTOMERS}${queryString ? `?${queryString}` : ''}`;
    return get<Partner[]>(endpoint);
  },

  /**
   * Get paginated customers
   */
  async getCustomersPaginated(params: PartnerListParams): Promise<PaginatedPartners> {
    const query = new URLSearchParams();
    query.set('type', 'customer');
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.region) query.set('region', params.region);
    if (params.city) query.set('city', params.city);
    if (params.isActive !== undefined) query.set('isActive', String(params.isActive));

    const endpoint = `${ENDPOINTS.PARTNERS}/paginated?${query.toString()}`;
    return get<PaginatedPartners>(endpoint);
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string): Promise<Partner> {
    return get<Partner>(`${ENDPOINTS.CUSTOMERS}/${id}`);
  },

  /**
   * Create new customer
   */
  async createCustomer(data: PartnerCreate): Promise<Partner> {
    return post<Partner>(ENDPOINTS.CUSTOMERS, data);
  },

  /**
   * Update customer
   */
  async updateCustomer(id: string, data: Partial<PartnerCreate>): Promise<Partner> {
    return put<Partner>(`${ENDPOINTS.CUSTOMERS}/${id}`, data);
  },

  /**
   * Delete customer
   */
  async deleteCustomer(id: string): Promise<void> {
    return del(`${ENDPOINTS.CUSTOMERS}/${id}`);
  },

  // ==================== Suppliers ====================

  /**
   * Get all suppliers
   */
  async getSuppliers(params?: Omit<PartnerListParams, 'type'>): Promise<Partner[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.region) query.set('region', params.region);
    if (params?.city) query.set('city', params.city);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.SUPPLIERS}${queryString ? `?${queryString}` : ''}`;
    return get<Partner[]>(endpoint);
  },

  /**
   * Get paginated suppliers
   */
  async getSuppliersPaginated(params: PartnerListParams): Promise<PaginatedPartners> {
    const query = new URLSearchParams();
    query.set('type', 'supplier');
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.region) query.set('region', params.region);
    if (params.city) query.set('city', params.city);
    if (params.isActive !== undefined) query.set('isActive', String(params.isActive));

    const endpoint = `${ENDPOINTS.PARTNERS}/paginated?${query.toString()}`;
    return get<PaginatedPartners>(endpoint);
  },

  /**
   * Get supplier by ID
   */
  async getSupplierById(id: string): Promise<Partner> {
    return get<Partner>(`${ENDPOINTS.SUPPLIERS}/${id}`);
  },

  /**
   * Create new supplier
   */
  async createSupplier(data: PartnerCreate): Promise<Partner> {
    return post<Partner>(ENDPOINTS.SUPPLIERS, data);
  },

  /**
   * Update supplier
   */
  async updateSupplier(id: string, data: Partial<PartnerCreate>): Promise<Partner> {
    return put<Partner>(`${ENDPOINTS.SUPPLIERS}/${id}`, data);
  },

  /**
   * Delete supplier
   */
  async deleteSupplier(id: string): Promise<void> {
    return del(`${ENDPOINTS.SUPPLIERS}/${id}`);
  },

  // ==================== Generic Partner Methods ====================

  /**
   * Get all partners (both customers and suppliers)
   */
  async getAll(params?: PartnerListParams): Promise<Partner[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.type) query.set('type', params.type);
    if (params?.region) query.set('region', params.region);
    if (params?.city) query.set('city', params.city);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.PARTNERS}${queryString ? `?${queryString}` : ''}`;
    return get<Partner[]>(endpoint);
  },

  /**
   * Get partner by ID
   */
  async getById(id: string): Promise<Partner> {
    return get<Partner>(ENDPOINTS.PARTNER_BY_ID(id));
  },

  /**
   * Create new partner
   */
  async create(data: PartnerCreate): Promise<Partner> {
    return post<Partner>(ENDPOINTS.PARTNERS, data);
  },

  /**
   * Update partner
   */
  async update(id: string, data: Partial<PartnerCreate>): Promise<Partner> {
    return put<Partner>(ENDPOINTS.PARTNER_BY_ID(id), data);
  },

  /**
   * Delete partner
   */
  async delete(id: string): Promise<void> {
    return del(ENDPOINTS.PARTNER_BY_ID(id));
  },

  /**
   * Search partners
   */
  async search(query: string, type?: 'customer' | 'supplier'): Promise<Partner[]> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (type) params.set('type', type);

    const endpoint = `${ENDPOINTS.PARTNERS}/search?${params.toString()}`;
    return get<Partner[]>(endpoint);
  },

  /**
   * Get customer regions report
   */
  async getCustomerRegions(): Promise<{ region: string; count: number; revenue: number }[]> {
    return get<{ region: string; count: number; revenue: number }[]>(ENDPOINTS.CUSTOMER_REGIONS);
  },
};

// =============================================================================
// Exports
// =============================================================================

export type { 
  Partner, 
  PartnerCreate, 
  PartnerUpdate, 
  PartnerListParams, 
  PaginatedPartners 
};

