// =============================================================================
// API Configuration - Forward to centralized config
// DEPRECATED: Use @/src/config or @/lib/api instead
// =============================================================================
//
// This file exists for backward compatibility.
// Most functionality has been moved to @/src/config and @/lib/api
//
// NEW USAGE:
//   import { getApiBaseUrl, isUsingProxy } from '@/src/config';
//   import { buildApiUrl } from '@/lib/api';
//
// =============================================================================

export {
  isUsingProxy,
  getApiBaseUrl,
  isValidUrl,
} from '@/src/config';

// buildApiUrl is now exported from @/lib/api
// Re-export for backward compatibility
export { buildApiUrl } from '@/lib/api';

// getApiConfigInfo was removed - use getApiBaseUrl() instead
