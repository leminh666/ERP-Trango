// =============================================================================
// Product Service - Product/Catalog API calls
// =============================================================================
//
// All product-related API calls should be made through this service.
//
// USAGE:
//   import { productService } from '@/services/product.service';
//
//   // Get all products
//   const products = await productService.getAll();
//
//   // Get product by ID
//   const product = await productService.getById(id);
//
// =============================================================================

import { apiClient, get, post, put, patch, del, type ApiRequestOptions, unwrapItems } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  unit?: string;
  costPrice?: number;
  sellPrice?: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCreate {
  code: string;
  name: string;
  description?: string;
  categoryId?: string;
  unit?: string;
  costPrice?: number;
  sellPrice?: number;
  imageUrl?: string;
}

export interface ProductUpdate extends Partial<ProductCreate> {
  id: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  isActive: boolean;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IncomeItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'income' | 'expense';
  categoryId?: string;
  isActive: boolean;
}

// =============================================================================
// API Endpoints
// =============================================================================

const ENDPOINTS = {
  PRODUCTS: '/products',
  PRODUCT_BY_ID: (id: string) => `/products/${id}`,
  PRODUCT_CATEGORIES: '/product-categories',
  INCOME_ITEMS: '/income-items',
  EXPENSE_ITEMS: '/expense-items',
} as const;

// =============================================================================
// Product Service
// =============================================================================

export const productService = {
  /**
   * Get all products with optional filters
   */
  async getAll(params?: ProductListParams): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.PRODUCTS}${queryString ? `?${queryString}` : ''}`;

    return get<Product[]>(endpoint);
  },

  /**
   * Get paginated products
   */
  async getPaginated(params: ProductListParams): Promise<PaginatedResponse<Product>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.isActive !== undefined) query.set('isActive', String(params.isActive));

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.PRODUCTS}/paginated${queryString ? `?${queryString}` : ''}`;

    return get<PaginatedResponse<Product>>(endpoint);
  },

  /**
   * Get product by ID
   */
  async getById(id: string): Promise<Product> {
    return get<Product>(ENDPOINTS.PRODUCT_BY_ID(id));
  },

  /**
   * Create new product
   */
  async create(data: ProductCreate): Promise<Product> {
    return post<Product>(ENDPOINTS.PRODUCTS, data);
  },

  /**
   * Update product
   */
  async update(id: string, data: Partial<ProductCreate>): Promise<Product> {
    return put<Product>(ENDPOINTS.PRODUCT_BY_ID(id), data);
  },

  /**
   * Partial update product
   */
  async patch(id: string, data: Partial<ProductCreate>): Promise<Product> {
    return patch<Product>(ENDPOINTS.PRODUCT_BY_ID(id), data);
  },

  /**
   * Delete product
   */
  async delete(id: string): Promise<void> {
    return del(ENDPOINTS.PRODUCT_BY_ID(id));
  },

  /**
   * Search products
   */
  async search(query: string, limit = 20): Promise<Product[]> {
    const endpoint = `${ENDPOINTS.PRODUCTS}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    return get<Product[]>(endpoint);
  },

  /**
   * Get product categories
   */
  async getCategories(): Promise<ProductCategory[]> {
    return get<ProductCategory[]>(ENDPOINTS.PRODUCT_CATEGORIES);
  },

  /**
   * Create product category
   */
  async createCategory(data: Omit<ProductCategory, 'id'>): Promise<ProductCategory> {
    return post<ProductCategory>(ENDPOINTS.PRODUCT_CATEGORIES, data);
  },

  /**
   * Update product category
   */
  async updateCategory(id: string, data: Partial<ProductCategory>): Promise<ProductCategory> {
    return put<ProductCategory>(`${ENDPOINTS.PRODUCT_CATEGORIES}/${id}`, data);
  },

  /**
   * Delete product category
   */
  async deleteCategory(id: string): Promise<void> {
    return del(`${ENDPOINTS.PRODUCT_CATEGORIES}/${id}`);
  },
};

// =============================================================================
// Income/Expense Items Service
// =============================================================================

export const transactionItemService = {
  /**
   * Get all income items
   */
  async getIncomeItems(params?: { isActive?: boolean }): Promise<IncomeItem[]> {
    const query = params?.isActive !== undefined 
      ? `?isActive=${params.isActive}` 
      : '';
    return get<IncomeItem[]>(`${ENDPOINTS.INCOME_ITEMS}${query}`);
  },

  /**
   * Get all expense items
   */
  async getExpenseItems(params?: { isActive?: boolean }): Promise<IncomeItem[]> {
    const query = params?.isActive !== undefined 
      ? `?isActive=${params.isActive}` 
      : '';
    return get<IncomeItem[]>(`${ENDPOINTS.EXPENSE_ITEMS}${query}`);
  },

  /**
   * Create income item
   */
  async createIncomeItem(data: Omit<IncomeItem, 'id'>): Promise<IncomeItem> {
    return post<IncomeItem>(ENDPOINTS.INCOME_ITEMS, data);
  },

  /**
   * Create expense item
   */
  async createExpenseItem(data: Omit<IncomeItem, 'id'>): Promise<IncomeItem> {
    return post<IncomeItem>(ENDPOINTS.EXPENSE_ITEMS, data);
  },

  /**
   * Update income item
   */
  async updateIncomeItem(id: string, data: Partial<IncomeItem>): Promise<IncomeItem> {
    return put<IncomeItem>(`${ENDPOINTS.INCOME_ITEMS}/${id}`, data);
  },

  /**
   * Update expense item
   */
  async updateExpenseItem(id: string, data: Partial<IncomeItem>): Promise<IncomeItem> {
    return put<IncomeItem>(`${ENDPOINTS.EXPENSE_ITEMS}/${id}`, data);
  },

  /**
   * Delete income item
   */
  async deleteIncomeItem(id: string): Promise<void> {
    return del(`${ENDPOINTS.INCOME_ITEMS}/${id}`);
  },

  /**
   * Delete expense item
   */
  async deleteExpenseItem(id: string): Promise<void> {
    return del(`${ENDPOINTS.EXPENSE_ITEMS}/${id}`);
  },
};

// =============================================================================
// Exports
// =============================================================================

export type { Product, ProductCreate, ProductUpdate, ProductCategory, ProductListParams, PaginatedResponse, IncomeItem };

