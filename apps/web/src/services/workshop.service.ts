// =============================================================================
// Workshop Service - Workshop Job API calls
// =============================================================================
//
// All workshop-related API calls should be made through this service.
//
// USAGE:
//   import { workshopService } from '@/services/workshop.service';
//
//   // Get all jobs
//   const jobs = await workshopService.getJobs();
//
// =============================================================================

import { apiClient, get, post, put, patch, del } from '@/lib/apiClient';

// =============================================================================
// Types
// =============================================================================

export interface WorkshopJob {
  id: string;
  jobNumber: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  status: JobStatus;
  description?: string;
  totalAmount: number;
  deposit?: number;
  startDate?: string;
  expectedCompletionDate?: string;
  completedDate?: string;
  notes?: string;
  items: JobItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type JobStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'waiting_parts' 
  | 'completed' 
  | 'delivered' 
  | 'cancelled';

export interface JobItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface JobCreate {
  orderId?: string;
  customerId?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  description?: string;
  totalAmount?: number;
  deposit?: number;
  startDate?: string;
  expectedCompletionDate?: string;
  notes?: string;
  items: Omit<JobItem, 'id' | 'amount'>[];
}

export interface JobUpdate extends Partial<JobCreate> {
  id: string;
  status?: JobStatus;
}

export interface JobListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: JobStatus;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PaginatedJobs {
  items: WorkshopJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JobSummary {
  totalJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  totalRevenue: number;
}

// =============================================================================
// API Endpoints
// =============================================================================

const ENDPOINTS = {
  JOBS: '/workshops/jobs',
  JOB_BY_ID: (id: string) => `/workshops/jobs/${id}`,
  JOB_SUMMARY: '/workshops/jobs/summary',
  JOB_PAYABLES: '/workshops/payables',
};

// =============================================================================
// Workshop Service
// =============================================================================

export const workshopService = {
  /**
   * Get all jobs with filters
   */
  async getJobs(params?: JobListParams): Promise<WorkshopJob[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.JOBS}${queryString ? `?${queryString}` : ''}`;
    return get<WorkshopJob[]>(endpoint);
  },

  /**
   * Get paginated jobs
   */
  async getPaginated(params: JobListParams): Promise<PaginatedJobs> {
    const query = new URLSearchParams();
    query.set('page', String(params.page || 1));
    query.set('limit', String(params.limit || 20));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.customerId) query.set('customerId', params.customerId);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);

    const endpoint = `${ENDPOINTS.JOBS}/paginated?${query.toString()}`;
    return get<PaginatedJobs>(endpoint);
  },

  /**
   * Get job by ID
   */
  async getById(id: string): Promise<WorkshopJob> {
    return get<WorkshopJob>(ENDPOINTS.JOB_BY_ID(id));
  },

  /**
   * Create new job
   */
  async create(data: JobCreate): Promise<WorkshopJob> {
    return post<WorkshopJob>(ENDPOINTS.JOBS, data);
  },

  /**
   * Update job
   */
  async update(id: string, data: Partial<JobCreate>): Promise<WorkshopJob> {
    return put<WorkshopJob>(ENDPOINTS.JOB_BY_ID(id), data);
  },

  /**
   * Partial update job
   */
  async patch(id: string, data: Partial<JobUpdate>): Promise<WorkshopJob> {
    return patch<WorkshopJob>(ENDPOINTS.JOB_BY_ID(id), data);
  },

  /**
   * Update job status
   */
  async updateStatus(id: string, status: JobStatus): Promise<WorkshopJob> {
    return patch<WorkshopJob>(ENDPOINTS.JOB_BY_ID(id), { status });
  },

  /**
   * Delete job
   */
  async delete(id: string): Promise<void> {
    return del(ENDPOINTS.JOB_BY_ID(id));
  },

  /**
   * Get job summary
   */
  async getSummary(params?: { fromDate?: string; toDate?: string }): Promise<JobSummary> {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.JOB_SUMMARY}${queryString ? `?${queryString}` : ''}`;
    return get<JobSummary>(endpoint);
  },

  /**
   * Get job payables (outstanding amounts)
   */
  async getPayables(): Promise<WorkshopJob[]> {
    return get<WorkshopJob[]>(ENDPOINTS.JOB_PAYABLES);
  },

  /**
   * Cancel job
   */
  async cancel(id: string, reason?: string): Promise<WorkshopJob> {
    return patch<WorkshopJob>(ENDPOINTS.JOB_BY_ID(id), { 
      status: 'cancelled',
      notes: reason 
    });
  },
};

// =============================================================================
// Exports
// =============================================================================

export type { 
  WorkshopJob, 
  JobStatus, 
  JobItem, 
  JobCreate, 
  JobUpdate, 
  JobListParams, 
  PaginatedJobs,
  JobSummary 
};

