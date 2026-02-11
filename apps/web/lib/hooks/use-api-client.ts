'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/toast-provider';
import { apiClient, parseApiError, FetchOptions } from '@/lib/api';

/**
 * API Hook with automatic toast notifications
 *
 * Features:
 * - Automatic success toast for create/update/delete operations
 * - Automatic error toast for failed operations
 * - Parses API error messages for better UX
 * - Returns helper functions for common operations
 *
 * Usage:
 *   const { create, update, remove, loading } = useApiClient();
 *
 *   // Create with auto-toast
 *   await create('/products', data);
 *
 *   // Update with auto-toast
 *   await update('/products/123', data);
 *
 *   // Delete with auto-toast
 *   await remove('/products/123');
 */
export function useApiClient() {
  const { showSuccess, showError } = useToast();

  /**
   * Perform GET request with toast on error
   */
  const get = useCallback(async <T = unknown>(
    endpoint: string,
    options?: FetchOptions
  ): Promise<T> => {
    try {
      return await apiClient<T>(endpoint, { ...options, method: 'GET' });
    } catch (error) {
      const { title, message } = parseApiError(error);
      showError(title, message);
      throw error;
    }
  }, [showError]);

  /**
   * Perform POST request with success toast
   */
  const create = useCallback(async <T = unknown>(
    endpoint: string,
    data: Record<string, unknown> | unknown[] | string,
    options?: FetchOptions
  ): Promise<T> => {
    try {
      const result = await apiClient<T>(endpoint, {
        ...options,
        method: 'POST',
        body: data,
      });
      showSuccess('Thành công', 'Đã tạo mới thành công');
      return result;
    } catch (error) {
      const { title, message } = parseApiError(error);
      showError(title, message);
      throw error;
    }
  }, [showSuccess, showError]);

  /**
   * Perform PUT request with success toast
   */
  const update = useCallback(async <T = unknown>(
    endpoint: string,
    data: Record<string, unknown> | unknown[] | string,
    options?: FetchOptions
  ): Promise<T> => {
    try {
      const result = await apiClient<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: data,
      });
      showSuccess('Thành công', 'Đã cập nhật thành công');
      return result;
    } catch (error) {
      const { title, message } = parseApiError(error);
      showError(title, message);
      throw error;
    }
  }, [showSuccess, showError]);

  /**
   * Perform PATCH request with success toast
   */
  const patch = useCallback(async <T = unknown>(
    endpoint: string,
    data: Record<string, unknown> | unknown[] | string,
    options?: FetchOptions
  ): Promise<T> => {
    try {
      const result = await apiClient<T>(endpoint, {
        ...options,
        method: 'PATCH',
        body: data,
      });
      showSuccess('Thành công', 'Đã cập nhật thành công');
      return result;
    } catch (error) {
      const { title, message } = parseApiError(error);
      showError(title, message);
      throw error;
    }
  }, [showSuccess, showError]);

  /**
   * Perform DELETE request with success toast
   */
  const remove = useCallback(async <T = unknown>(
    endpoint: string,
    options?: FetchOptions
  ): Promise<T> => {
    try {
      const result = await apiClient<T>(endpoint, {
        ...options,
        method: 'DELETE',
      });
      showSuccess('Đã xóa', 'Xóa thành công');
      return result;
    } catch (error) {
      const { title, message } = parseApiError(error);
      showError(title, message);
      throw error;
    }
  }, [showSuccess, showError]);

  /**
   * Generic request with custom method
   */
  const request = useCallback(async <T = unknown>(
    method: string,
    endpoint: string,
    data?: Record<string, unknown> | unknown[] | string,
    options?: FetchOptions
  ): Promise<T> => {
    try {
      const result = await apiClient<T>(endpoint, {
        ...options,
        method,
        body: data,
      });

      // Show success toast for mutations (POST, PUT, PATCH, DELETE)
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        showSuccess('Thành công');
      }

      return result;
    } catch (error) {
      const { title, message } = parseApiError(error);
      showError(title, message);
      throw error;
    }
  }, [showSuccess, showError]);

  return {
    get,
    create,
    update,
    patch,
    remove,
    request,
  };
}

/**
 * Simplified hook for read-only operations (GET)
 * No success toast for reads
 */
export function useReadApiClient() {
  const { showError } = useToast();

  const get = useCallback(async <T = unknown>(
    endpoint: string,
    options?: FetchOptions
  ): Promise<T> => {
    try {
      return await apiClient<T>(endpoint, { ...options, method: 'GET' });
    } catch (error) {
      const { title, message } = parseApiError(error);
      showError(title, message);
      throw error;
    }
  }, [showError]);

  return { get };
}

/**
 * Hook for mutation operations (POST, PUT, PATCH, DELETE)
 * With automatic success/error toasts
 */
export function useMutationApiClient() {
  const { showSuccess, showError } = useToast();

  const mutate = useCallback(async <T = unknown>(
    method: string,
    endpoint: string,
    data?: Record<string, unknown> | unknown[] | string
  ): Promise<T> => {
    try {
      const result = await apiClient<T>(endpoint, { method, body: data });
      showSuccess('Thành công');
      return result;
    } catch (error) {
      const { title, message } = parseApiError(error);
      showError(title, message);
      throw error;
    }
  }, [showSuccess, showError]);

  const create = useCallback((endpoint: string, data: Record<string, unknown>) =>
    mutate<T>('POST', endpoint, data), [mutate]);

  const update = useCallback((endpoint: string, data: Record<string, unknown>) =>
    mutate<T>('PUT', endpoint, data), [mutate]);

  const patch = useCallback((endpoint: string, data: Record<string, unknown>) =>
    mutate<T>('PATCH', endpoint, data), [mutate]);

  const remove = useCallback((endpoint: string) =>
    mutate<T>('DELETE', endpoint), [mutate]);

  return { create, update, patch, remove, mutate };
}

