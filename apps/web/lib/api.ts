// =============================================================================
// API Client - Direct-to-backend API calls
// NOTE: All requests go directly to backend (http://localhost:4000)
// No Next.js API proxy needed
// =============================================================================

import type { User } from '@/contexts/auth-context';
import { getApiBaseUrl, buildApiUrl } from '@/lib/config';
import { resolveAssetUrl, getPlaceholderImage, resolveProductImage } from '@/lib/media';

// =============================================================================
// API Configuration - Using centralized config
// =============================================================================

const API_CONFIG = {
  // Get base URL from centralized config
  baseUrl: (() => {
    if (typeof window !== 'undefined') {
      const baseUrl = getApiBaseUrl();
      console.log('[API CONFIG] Using baseUrl:', baseUrl);
      return baseUrl;
    }
    // Server-side fallback
    return 'http://localhost:4000';
  })(),
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '15000', 10), // Increased to 15s for LAN
} as const;

// Log config on client-side only
if (typeof window !== 'undefined') {
  console.log('[API] Configuration:', {
    baseUrl: API_CONFIG.baseUrl,
    timeout: API_CONFIG.timeout,
  });
}

// =============================================================================
// Token Management (localStorage)
// =============================================================================

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token === null) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

export function setUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user === null) {
    localStorage.removeItem(USER_KEY);
  } else {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function removeUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

// =============================================================================
// API Error Helper
// =============================================================================

/**
 * Parse API error response to get user-friendly message
 */
export function parseApiError(error: unknown): { title: string; message: string } {
  // Error from our apiClient throw
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

// =============================================================================
// API Client
// =============================================================================

interface FetchOptions extends Omit<RequestInit, 'body'> {
  token?: string | null;
  timeout?: number;
  body?: Record<string, unknown> | unknown[] | string | null;
}

/**
 * Main API client - calls backend DIRECTLY (not through Next.js proxy)
 *
 * Usage:
 *   await apiClient('/users');  // → http://localhost:4000/users
 *   await apiClient('/auth/login', { method: 'POST', body: {...} });
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token = getToken(), timeout = API_CONFIG.timeout, ...fetchOptions } = options;

  // Build FULL URL using centralized helper (uses new URL() for proper parsing)
  const fullUrl = buildApiUrl(endpoint);

  console.log('[API] =========================================');
  console.log('[API] 📡 Request:', {
    endpoint,
    fullUrl,
    hasToken: !!token,
    timeout,
    timestamp: new Date().toISOString()
  });

  // Guardrail: prevent calling frontend in dev
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    if (fullUrl.includes('localhost:3000')) {
      throw new Error(
        `[API ERROR] Request going to frontend (3000) instead of backend (4000)! ` +
        `URL: ${fullUrl}. Remove /api prefix and use direct backend URL.`
      );
    }
  }

  const headers = new Headers(fetchOptions.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Prepare body - convert object to JSON string if needed
  const { body: rawBody, ...restOptions } = fetchOptions;
  const body = typeof rawBody === 'string' ? rawBody : (rawBody ? JSON.stringify(rawBody) : undefined);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[API] ⏰ Request timeout after', timeout, 'ms:', fullUrl);
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(fullUrl, {
      ...restOptions,
      headers,
      body,
      signal: controller.signal,
      credentials: 'include', // Include cookies for cross-origin requests
    });

    clearTimeout(timeoutId);
    console.log('[API] 📥 Response:', { status: response.status, url: fullUrl });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn('[API] 401 Unauthorized - Clearing invalid token');
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
      console.error(`[API] ❌ Not JSON: ${response.status}`, preview);
      throw new Error(`API không trả JSON (${response.status}): ${preview}...`);
    }

    // Handle other error statuses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || errorData.error || response.statusText || 'Lỗi không xác định';
      const code = errorData.code;

      // Map Prisma error codes to user-friendly messages
      let userMessage = message;
      if (code === 'P2002') {
        userMessage = 'Dữ liệu đã tồn tại (trùng lặp)';
      } else if (code === 'P2025') {
        userMessage = 'Bản ghi không tồn tại';
      } else if (code === 'P2003') {
        userMessage = 'Ràng buộc dữ liệu không hợp lệ';
      }

      console.error(`[API] ❌ Error ${response.status}:`, userMessage, { code, details: errorData });
      throw new Error(userMessage);
    }

    // Parse JSON response
    const data = await response.json();
    console.log(`[API] ✅ Success:`, Array.isArray(data) ? `${data.length} items` : 'data');
    return data;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Legacy wrapper for backward compatibility.
 * @deprecated Use apiClient instead
 */
export async function fetchJson<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  return apiClient<T>(path, options);
}

/**
 * File upload helper - uses raw fetch for FormData (browser sets Content-Type automatically)
 * 
 * Usage:
 *   const result = await uploadFile('/files/upload', file, { token });
 *   // Returns { url: string, ... }
 */
export async function uploadFile(
  endpoint: string,
  file: File,
  options: { token?: string | null } = {}
): Promise<any> {
  const token = options.token ?? getToken();

  // Build full URL using centralized helper
  const fullUrl = buildApiUrl(endpoint);

  console.log(`[UPLOAD] → ${fullUrl}`);

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

  clearTimeout(0); // No timeout for uploads

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

  console.log(`[UPLOAD] ✅ Success`);
  return data;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely unwraps an array from a potentially nested API response.
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
 * Ensure returned value is always an array.
 */
export function toArray<T>(data: T | T[] | undefined | null): T[] {
  return Array.isArray(data) ? data : [];
}

/**
 * Get the full URL for an uploaded file/image.
 * Uses resolveAssetUrl for proper LAN/mobile support.
 */
export function getFileUrl(url: string | null | undefined): string {
  const resolved = resolveAssetUrl(url);
  if (resolved) {
    return resolved;
  }
  console.log('[getFileUrl] ❌ No URL provided, returning placeholder');
  return getPlaceholderImage();
}

// =============================================================================
// Types
// =============================================================================

export type { FetchOptions };
export { API_CONFIG as apiConfig };

// Re-export config functions for convenience
export { getApiBaseUrl, buildApiUrl } from '@/lib/config';

// Re-export media utilities for convenience
export { resolveAssetUrl, getPlaceholderImage, resolveProductImage } from '@/lib/media';
