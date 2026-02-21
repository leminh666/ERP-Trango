// =============================================================================
// Order Service - Order API calls
// =============================================================================
//
// All order-related API calls should be made through this service.
//
// USAGE:
//   import { orderService } from '@/services/order.service';
//
//   // Get all orders
//   const orders = await orderService.getAll();
//
// =============================================================================

import { apiClient, get, post, put, patch, del } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  status: OrderStatus;
  totalAmount: number;
  deposit?: number;
  remainingAmount?: number;
  orderDate: string;
  expectedDate?: string;
  completedDate?: string;
  notes?: string;
  items: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus = 
  | 'draft' 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'completed' 
  | 'cancelled';

export interface OrderItem {
  id?: string;
  productId?: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  totalPrice: number;
}

export interface OrderCreate {
  customerId?: string;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  items: Omit<OrderItem, 'id' | 'totalPrice'>[];
}

export interface OrderUpdate extends Partial<OrderCreate> {
  id: string;
  status?: OrderStatus;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderSummary {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
}

// =============================================================================
// API Endpoints
// =============================================================================

const ENDPOINTS = {
  ORDERS: '/orders',
  ORDER_BY_ID: (id: string) => `/orders/${id}`,
  ORDER_SUMMARY: '/orders/summary',
  ORDER_REMINDERS: '/orders/reminders',
};

// =============================================================================
// Order Service
// =============================================================================

export const orderService = {
  /**
   * Get all orders with filters
   */
  async getAll(params?: OrderListParams): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.ORDERS}${queryString ? `?${queryString}` : ''}`;

    return get<Order[]>(endpoint);
  },

  /**
   * Get paginated orders
   */
  async getPaginated(params: OrderListParams): Promise<PaginatedOrders> {
    const query = new URLSearchParams();
    query.set('page', String(params.page || 1));
    query.set('limit', String(params.limit || 20));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.customerId) query.set('customerId', params.customerId);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);

    const endpoint = `${ENDPOINTS.ORDERS}/paginated?${query.toString()}`;
    return get<PaginatedOrders>(endpoint);
  },

  /**
   * Get order by ID
   */
  async getById(id: string): Promise<Order> {
    return get<Order>(ENDPOINTS.ORDER_BY_ID(id));
  },

  /**
   * Create new order
   */
  async create(data: OrderCreate): Promise<Order> {
    return post<Order>(ENDPOINTS.ORDERS, data);
  },

  /**
   * Update order
   */
  async update(id: string, data: Partial<OrderCreate>): Promise<Order> {
    return put<Order>(ENDPOINTS.ORDER_BY_ID(id), data);
  },

  /**
   * Partial update order
   */
  async patch(id: string, data: Partial<OrderUpdate>): Promise<Order> {
    return patch<Order>(ENDPOINTS.ORDER_BY_ID(id), data);
  },

  /**
   * Update order status
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return patch<Order>(ENDPOINTS.ORDER_BY_ID(id), { status });
  },

  /**
   * Delete order
   */
  async delete(id: string): Promise<void> {
    return del(ENDPOINTS.ORDER_BY_ID(id));
  },

  /**
   * Get order summary
   */
  async getSummary(params?: { fromDate?: string; toDate?: string }): Promise<OrderSummary> {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    
    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.ORDER_SUMMARY}${queryString ? `?${queryString}` : ''}`;
    
    return get<OrderSummary>(endpoint);
  },

  /**
   * Get order pipeline (Kanban view)
   */
  async getPipeline(): Promise<Record<OrderStatus, Order[]>> {
    return get<Record<OrderStatus, Order[]>>(`${ENDPOINTS.ORDERS}/pipeline`);
  },

  /**
   * Get order reminders
   */
  async getReminders(): Promise<Order[]> {
    return get<Order[]>(ENDPOINTS.ORDER_REMINDERS);
  },

  /**
   * Cancel order
   */
  async cancel(id: string, reason?: string): Promise<Order> {
    return patch<Order>(ENDPOINTS.ORDER_BY_ID(id), { 
      status: 'cancelled',
      notes: reason 
    });
  },
};

// =============================================================================
// Exports
// =============================================================================

// Types already exported above — no re-export needed

