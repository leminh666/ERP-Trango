// =============================================================================
// API Client - Forward to centralized implementation
// DEPRECATED: Use @/src/lib/apiClient instead
// =============================================================================
//
// This file exists for backward compatibility.
// All functionality has been moved to @/src/lib/apiClient
//
// NEW USAGE:
//   import { apiClient, get, post, uploadFile } from '@/src/lib/apiClient';
//
// =============================================================================

// Re-export API client and convenience methods
export {
  apiClient,
  get,
  post,
  put,
  patch,
  del,
  request,
  uploadFile,
  // Token management
  getToken,
  setToken,
  removeToken,
  getUser,
  setUser,
  removeUser,
  // Helpers
  unwrapItems,
  toArray,
  parseApiError,
  // Types
  type ApiRequestOptions,
  type ApiError,
  type ParsedError,
} from '@/src/lib/apiClient';

// Legacy wrapper for backward compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchJson<T = any>(
  path: string,
  options?: Parameters<typeof apiClient>[1]
): Promise<T> {
  return apiClient<T>(path, options);
}

// Re-export media utilities (keep in lib/ for now)
export {
  resolveAssetUrl,
  getPlaceholderImage,
  resolveProductImage,
  getFileUrl,
  type SafeImageProps,
  shouldUseFallback,
  isValidAssetUrl,
} from '@/lib/media';

// Re-export config functions
export {
  getApiBaseUrl,
  buildApiUrl,
  isUsingProxy,
} from '@/src/config';
