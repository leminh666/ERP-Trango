// =============================================================================
// Configuration Index - Single import point for all config
// =============================================================================
//
// Re-exports all configuration functions and types from the config module.
// UI components and services should import from here.
//
// USAGE:
//   import { apiConfig, getApiBaseUrl, isUsingProxy } from '@/config';
//
// =============================================================================

// Environment Configuration
export {
  getEnvConfig,
  getApiBaseUrl,
  isUsingProxy,
  getApiTimeout,
  getAssetBaseUrl,
  isLoggingEnabled,
  isMockDataEnabled,
  getApiClientConfig,
  getEnvDebugInfo,
  type EnvConfig,
  type ApiClientConfig,
} from './env';

// Utilities
export {
  isValidUrl,
  isValidEmail,
  sanitizeString,
  parseQueryString,
  buildQueryString,
  deepClone,
  isEmpty,
  generateId,
  formatDateForApi,
  parseApiDate,
  formatNumber,
  formatCurrency,
  debounce,
  throttle,
  sleep,
  safeJsonParse,
  snakeToCamel,
  camelToSnake,
  capitalize,
  truncate,
} from './utils';

