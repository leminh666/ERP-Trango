// =============================================================================
// API Hooks - React hooks for API operations
// =============================================================================
//
// Provides typed hooks for common API operations with automatic error handling.
// Uses toast notifications for better UX.
//
// USAGE:
//   import { useApi, useMutation } from '@/hooks';
//
//   // Read operations
//   const { data, loading, error, refresh } = useApi(() => orderService.getAll());
//
//   // Write operations
//   const { mutate, loading } = useMutation(
//     (data) => orderService.create(data),
//     { onSuccess: 'Tạo đơn hàng thành công!' }
//   );
//
// =============================================================================

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/toast-provider';
import { parseApiError } from '@/lib/apiClient';

// =============================================================================
// Types
// =============================================================================

/**
 * State for async operations
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Options for useMutation hook
 */
export interface UseMutationOptions<TData, TVariables> {
  onSuccess?: string | ((data: TData) => void);
  onError?: string | ((error: Error) => void);
}

/**
 * Result of useMutation hook
 */
export interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  loading: boolean;
  error: Error | null;
  data: TData | null;
}

// =============================================================================
// useApi Hook - For read operations
// =============================================================================

/**
 * Hook for data fetching with automatic loading and error states
 *
 * USAGE:
 *   const { data, loading, error, refresh } = useApi(
 *     () => orderService.getAll({ status: 'pending' }),
 *     { deps: [status] }
 *   );
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  options: {
    deps?: unknown[];
    onError?: (error: Error) => void;
    immediate?: boolean;
  } = {}
): AsyncState<T> & { refresh: () => void } {
  const { deps = [], onError, immediate = true } = options;
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const { showError } = useToast();

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const parsedError = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, loading: false, error: parsedError }));

      if (onError) {
        onError(parsedError);
      } else {
        const { title, message } = parseApiError(error);
        showError(title, message);
      }

      throw error;
    }
  }, [fetcher, onError, showError]);

  // Refetch when dependencies change
  useEffect(() => {
    if (immediate) {
      fetch();
    }
  }, deps);

  return {
    ...state,
    refresh: fetch,
  };
}

/**
 * Simplified useApi for components
 */
export function useReadApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): AsyncState<T> & { refresh: () => void } {
  return useApi(fetcher, { deps, immediate: true });
}

// =============================================================================
// useMutation Hook - For write operations
// =============================================================================

/**
 * Hook for mutations (create, update, delete) with toast notifications
 *
 * USAGE:
 *   const { mutate, loading } = useMutation(
 *     (data) => orderService.create(data),
 *     { onSuccess: 'Tạo đơn hàng thành công!' }
 *   );
 *
 *   // Call it
 *   await mutate(orderData);
 */
export function useMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    setLoading(true);
    setError(null);

    try {
      const result = await mutationFn(variables);
      setData(result);

      // Show success message
      if (options.onSuccess) {
        if (typeof options.onSuccess === 'string') {
          showSuccess('Thành công', options.onSuccess);
        } else {
          options.onSuccess(result);
        }
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      // Show error message
      if (options.onError) {
        if (typeof options.onError === 'string') {
          showError('Lỗi', options.onError);
        } else {
          options.onError(error);
        }
      } else {
        const { title, message } = parseApiError(err);
        showError(title, message);
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, options, showSuccess, showError]);

  return { mutate, loading, error, data };
}

// =============================================================================
// useLazyApi Hook - For conditional fetching
// =============================================================================

/**
 * Hook for lazy data fetching (doesn't fetch immediately)
 *
 * USAGE:
 *   const { data, execute, loading } = useLazyApi(
 *     (id) => orderService.getById(id)
 *   );
 *
 *   // Later...
 *   await execute(orderId);
 */
export function useLazyApi<T, TArgs extends unknown[]>(
  fetcher: (...args: TArgs) => Promise<T>
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: TArgs) => Promise<T>;
} {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const { showError } = useToast();

  const execute = useCallback(async (...args: TArgs): Promise<T> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetcher(...args);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const parsedError = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, loading: false, error: parsedError }));
      showError('Lỗi', parsedError.message);
      throw error;
    }
  }, [fetcher, showError]);

  return { ...state, execute };
}

// =============================================================================
// useInfiniteQuery Hook - For pagination
// =============================================================================

/**
 * Hook for infinite scrolling/pagination
 */
export function useInfiniteQuery<T>(
  fetcher: (page: number) => Promise<{ items: T[]; total: number }>,
  options: {
    initialPage?: number;
    limit?: number;
  } = {}
) {
  const { initialPage = 1, limit = 20 } = options;
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { showError } = useToast();

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher(page);
      setItems(prev => [...prev, ...result.items]);
      setHasMore(items.length + result.items.length < result.total);
      setPage(prev => prev + 1);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      showError('Lỗi', error.message);
    } finally {
      setLoading(false);
    }
  }, [fetcher, page, loading, hasMore, items.length, showError]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
  }, [initialPage]);

  return { items, loading, error, hasMore, loadMore, reset, page };
}

