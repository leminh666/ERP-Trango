// =============================================================================
// API Client - Unified API wrapper for all HTTP requests
// =============================================================================
//
// PRINCIPLES:
// 1. Single source of truth for API configuration
// 2. No hardcoded IPs/URLs - use @/src/config
// 3. Automatic token injection
// 4. Typed responses
// 5. Proper error handling
//
// USAGE:
//   import { apiClient, get, post, fetchJson } from '@/lib/api';
//
//   // GET request
//   const users = await apiClient.get<User[]>('/users');
//
//   // POST request
//   const newUser = await apiClient.post<User>('/users', { name: 'John' });
//
//   // Legacy fetchJson (backward compatible)
//   const users = await fetchJson<User[]>('/users');
//
// =============================================================================

import { getApiBaseUrl, getApiTimeout, isLoggingEnabled } from '@/src/config';

// =============================================================================
// Token Management (localStorage)
// =============================================================================

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/**
 * Get auth token from storage
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Set auth token in storage
 */
export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token === null) {
    window.localStorage.removeItem(TOKEN_KEY);
  } else {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Remove auth token from storage
 */
export function removeToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

/**
 * Get stored user object
 */
export function getUser<T = Record<string, unknown>>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = window.localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

/**
 * Set user object in storage
 */
export function setUser<T = Record<string, unknown>>(user: T | null): void {
  if (typeof window === 'undefined') return;
  if (user === null) {
    window.localStorage.removeItem(USER_KEY);
  } else {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * Remove user from storage
 */
export function removeUser(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_KEY);
}

// =============================================================================
// Types
// =============================================================================

/**
 * HTTP methods supported by the API client
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Options for API requests
 */
export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: Record<string, unknown> | unknown[] | string | null;
  headers?: Record<string, string>;
  timeout?: number;
  token?: string | null;
}

/**
 * API error response structure
 */
export interface ApiError {
  status: number;
  statusText: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Parsed error for display
 */
export interface ParsedError {
  title: string;
  message: string;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Parse API error to user-friendly format
 */
export function parseApiError(error: unknown): ParsedError {
  // Error from apiClient throw
  if (error instanceof Error) {
    const err = error as Error & { status?: number; statusText?: string; code?: string };

    // Handle Prisma errors from API
    if (err.message.includes('Prisma Error')) {
      const match = err.message.match(/Prisma Error \[(\w+)\]: (.+)/);
      if (match) {
        return {
          title: 'Lỗi dữ liệu',
          message: match[2] || 'Có lỗi với dữ liệu',
        };
      }
    }

    // Handle validation errors
    if (err.message.includes('required') || err.message.includes('bắt buộc')) {
      return {
        title: 'Thiếu thông tin',
        message: err.message,
      };
    }

    // Handle unauthorized
    if (err.message.includes('Unauthorized') || err.status === 401) {
      return {
        title: 'Chưa đăng nhập',
        message: 'Vui lòng đăng nhập lại',
      };
    }

    return {
      title: 'Lỗi',
      message: err.message,
    };
  }

  // Object error
  if (error && typeof error === 'object') {
    const err = error as { status?: number; statusText?: string; message?: string; code?: string };

    if (err.status) {
      return {
        title: `${err.status} ${err.statusText || 'Error'}`,
        message: err.message || 'Có lỗi xảy ra',
      };
    }

    if (err.message) {
      return {
        title: 'Thông báo',
        message: err.message,
      };
    }
  }

  // String error
  if (typeof error === 'string') {
    return {
      title: 'Lỗi',
      message: error,
    };
  }

  // Default fallback
  return {
    title: 'Lỗi hệ thống',
    message: 'Có lỗi không xác định. Vui lòng thử lại sau.',
  };
}

/**
 * Create API error object
 */
function createApiError(status: number, statusText: string, message: string, code?: string, details?: Record<string, unknown>): ApiError {
  return { status, statusText, message, code, details };
}

// =============================================================================
// API Client Implementation
// =============================================================================

/**
 * Build full URL from endpoint path
 * - Proxy mode: returns relative path (e.g., "/users")
 * - Direct mode: returns full URL (e.g., "http://localhost:4000/users")
 */
function buildUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  
  // Normalize path: ensure leading slash
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // In proxy mode, return relative path
  if (baseUrl === '/') {
    return normalizedPath;
  }
  
  // In direct mode, build full URL using URL constructor
  return new URL(normalizedPath, baseUrl).toString();
}

/**
 * Log request/response for debugging
 */
function log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void {
  if (isLoggingEnabled()) {
    console[level](`[API]`, ...args);
  }
}

/**
 * Main API client function
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = getApiTimeout(),
    token = getToken(),
  } = options;

  const fullUrl = buildUrl(endpoint);

  log('info', `📡 ${method} ${fullUrl}`, {
    hasToken: !!token,
    timeout,
  });

  // Guardrail: prevent calling frontend in dev
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    if (fullUrl.includes('localhost:3000')) {
      throw new Error(
        `[API ERROR] Request going to frontend (3000) instead of backend (4000)! ` +
        `URL: ${fullUrl}. Use proxy mode or set NEXT_PUBLIC_API_URL correctly.`
      );
    }
  }

  // Build headers
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'application/json');

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  // Prepare body
  const requestBody = typeof body === 'string' ? body : (body ? JSON.stringify(body) : undefined);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    log('warn', `⏰ Timeout after ${timeout}ms: ${fullUrl}`);
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
      credentials: 'include',
    });

    clearTimeout(timeoutId);
    log('info', `📥 ${response.status} ${fullUrl}`);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      log('warn', '🔒 401 Unauthorized - clearing invalid token');
      removeToken();
      removeUser();

      // Redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?reason=unauthorized';
      }
      throw new Error('Unauthorized - Vui lòng đăng nhập lại');
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text().catch(() => 'unknown');
      const preview = text.substring(0, 200).replace(/[\n\r]/g, ' ');
      log('error', `❌ Not JSON: ${response.status}`, preview);
      throw new Error(`API không trả JSON (${response.status}): ${preview}...`);
    }

    // Handle error statuses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || errorData.error || response.statusText || 'Lỗi không xác định';
      const code = errorData.code;

      // Map Prisma error codes
      let userMessage = message;
      if (code === 'P2002') {
        userMessage = 'Dữ liệu đã tồn tại (trùng lặp)';
      } else if (code === 'P2025') {
        userMessage = 'Bản ghi không tồn tại';
      } else if (code === 'P2003') {
        userMessage = 'Ràng buộc dữ liệu không hợp lệ';
      }

      log('error', `❌ ${response.status}:`, userMessage, { code, details: errorData });
      throw new Error(userMessage);
    }

    // Parse JSON response
    const data = await response.json();
    log('info', `✅ Success:`, Array.isArray(data) ? `${data.length} items` : 'data');
    return data;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// =============================================================================
// Convenience Methods
// =============================================================================

/**
 * Perform GET request
 */
export function get<T = unknown>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Perform POST request
 */
export function post<T = unknown>(endpoint: string, body?: ApiRequestOptions['body'], options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'POST', body });
}

/**
 * Perform PUT request
 */
export function put<T = unknown>(endpoint: string, body?: ApiRequestOptions['body'], options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'PUT', body });
}

/**
 * Perform PATCH request
 */
export function patch<T = unknown>(endpoint: string, body?: ApiRequestOptions['body'], options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'PATCH', body });
}

/**
 * Perform DELETE request
 */
export function del<T = unknown>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Generic request with custom method
 */
export function request<T = unknown>(
  method: HttpMethod,
  endpoint: string,
  body?: ApiRequestOptions['body'],
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method, body });
}

// =============================================================================
// Legacy fetchJson wrapper (backward compatible)
// =============================================================================

/**
 * Legacy wrapper for backward compatibility
 * @deprecated Use apiClient or get/post/etc instead
 */
export async function fetchJson<T = unknown>(
  path: string,
  options?: ApiRequestOptions
): Promise<T> {
  return apiClient<T>(path, options);
}

// =============================================================================
// File Upload
// =============================================================================

/**
 * Upload file to server
 * 
 * Usage:
 *   const result = await uploadFile('/files/upload', file);
 *   // Returns { url: string, ... }
 */
export async function uploadFile<T = Record<string, unknown>>(
  endpoint: string,
  file: File,
  options: { token?: string | null } = {}
): Promise<T> {
  const token = options.token ?? getToken();
  const fullUrl = buildUrl(endpoint);

  log('info', `📤 Upload → ${fullUrl}`);

  // Guardrail
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    if (fullUrl.includes('localhost:3000')) {
      throw new Error(`[UPLOAD ERROR] URL going to frontend (3000)! URL: ${fullUrl}. Check NEXT_PUBLIC_API_URL env var.`);
    }
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      // Note: NOT setting Content-Type - browser sets it with boundary for FormData
    },
    body: formData,
    credentials: 'include',
  });

  if (response.status === 401) {
    removeToken();
    removeUser();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login?reason=unauthorized';
    }
    throw new Error('Unauthorized - Vui lòng đăng nhập lại');
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text().catch(() => 'unknown');
    throw new Error(`Upload không trả JSON (${response.status}): ${text.substring(0, 100)}...`);
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Upload failed (${response.status})`);
  }

  log('info', '✅ Upload success');
  return data as T;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely unwrap an array from potentially nested API response
 */
export function unwrapItems<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === 'object') {
    if (Array.isArray((response as { items: unknown }).items)) {
      return (response as { items: T[] }).items;
    }
    if (Array.isArray((response as { data: unknown }).data)) {
      return (response as { data: T[] }).data;
    }
  }
  return [];
}

/**
 * Ensure returned value is always an array
 */
export function toArray<T>(data: T | T[] | undefined | null): T[] {
  return Array.isArray(data) ? data : [];
}

// =============================================================================
// Exports
// =============================================================================

export type { ApiRequestOptions, ApiError, ParsedError };

// Re-export media utilities for convenience
export {
  resolveAssetUrl,
  getPlaceholderImage,
  resolveProductImage,
  getFileUrl,
  type SafeImageProps,
  shouldUseFallback,
  isValidAssetUrl,
} from '@/lib/media';
