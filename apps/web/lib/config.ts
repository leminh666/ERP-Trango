// =============================================================================
// API Configuration - Forward to centralized config
// DEPRECATED: Use @/src/config instead
// =============================================================================
//
// This file exists for backward compatibility.
// All functionality has been moved to @/src/config
//
// NEW USAGE:
//   import { getApiBaseUrl, buildApiUrl, isUsingProxy } from '@/src/config';
//
// =============================================================================

export {
  isUsingProxy,
  getApiBaseUrl,
  buildApiUrl,
  isValidUrl,
  getApiConfigInfo,
} from '@/src/config';
