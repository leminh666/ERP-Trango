// =============================================================================
// Environment Configuration - Single source of truth for all env vars
// =============================================================================
//
// PRINCIPLES:
// 1. All environment variables are read and validated here
// 2. No hardcoded IPs/URLs anywhere else
// 3. Missing required vars trigger clear warnings with safe fallbacks
//
// USAGE:
//   import { env, apiConfig, getApiBaseUrl } from '@/config';
//
// =============================================================================

import { isValidUrl } from './utils';

// =============================================================================
// Environment Variables Type Definition
// =============================================================================

export interface EnvConfig {
  // API Configuration
  readonly API_URL: string;
  readonly USE_PROXY: boolean;
  readonly API_TIMEOUT: number;
  
  // Asset Configuration
  readonly ASSET_URL: string | null;
  
  // Feature Flags
  readonly ENABLE_LOGGING: boolean;
  readonly ENABLE_MOCK_DATA: boolean;
}

// =============================================================================
// Default Values (Development)
// =============================================================================

const DEFAULTS = {
  API_URL: 'http://localhost:4000',
  USE_PROXY: true, // Recommended for LAN/mobile
  API_TIMEOUT: 15000, // 15s for LAN
  ASSET_URL: null,
  ENABLE_LOGGING: process.env.NODE_ENV === 'development',
  ENABLE_MOCK_DATA: false,
} as const;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Sanitize environment variable - remove quotes, spaces, newlines
 */
function sanitizeEnvValue(value: string | undefined): string {
  if (!value) return '';
  
  let sanitized = value.trim();
  
  // Remove surrounding quotes (single or double)
  if (
    (sanitized.startsWith('"') && sanitized.endsWith('"')) ||
    (sanitized.startsWith("'") && sanitized.endsWith("'"))
  ) {
    sanitized = sanitized.slice(1, -1);
    sanitized = sanitized.trim();
  }
  
  return sanitized;
}

/**
 * Validate API URL format
 */
function validateApiUrl(url: string): { valid: boolean; message?: string } {
  if (!url) {
    return { valid: false, message: 'API URL is empty' };
  }
  
  if (!isValidUrl(url)) {
    return { valid: false, message: `Invalid URL format: "${url}"` };
  }
  
  // Check for localhost warning
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return { 
      valid: true, 
      message: 'Using localhost - mobile/LAN access will not work. Set USE_PROXY=true for LAN access.' 
    };
  }
  
  return { valid: true };
}

/**
 * Parse and validate timeout value
 */
function parseTimeout(value: string | undefined): number {
  if (!value) return DEFAULTS.API_TIMEOUT;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(`[ENV] Invalid timeout "${value}", using default: ${DEFAULTS.API_TIMEOUT}`);
    return DEFAULTS.API_TIMEOUT;
  }
  
  return parsed;
}

// =============================================================================
// Build Environment Configuration
// =============================================================================

function buildEnvConfig(): EnvConfig {
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiUrl = sanitizeEnvValue(rawApiUrl);
  
  const rawUseProxy = process.env.NEXT_PUBLIC_USE_PROXY;
  const useProxy = sanitizeEnvValue(rawUseProxy).toLowerCase() === 'true';
  
  const rawTimeout = process.env.NEXT_PUBLIC_API_TIMEOUT;
  const timeout = parseTimeout(rawTimeout);
  
  const rawAssetUrl = process.env.NEXT_PUBLIC_ASSET_URL;
  const assetUrl = sanitizeEnvValue(rawAssetUrl) || null;
  
  const rawEnableLogging = process.env.NEXT_PUBLIC_ENABLE_LOGGING;
  const enableLogging = sanitizeEnvValue(rawEnableLogging).toLowerCase() === 'true';
  
  const rawMockData = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;
  const enableMockData = sanitizeEnvValue(rawMockData).toLowerCase() === 'true';
  
  return {
    API_URL: apiUrl || DEFAULTS.API_URL,
    USE_PROXY: useProxy,
    API_TIMEOUT: timeout,
    ASSET_URL: assetUrl,
    ENABLE_LOGGING: enableLogging || DEFAULTS.ENABLE_LOGGING,
    ENABLE_MOCK_DATA: enableMockData,
  };
}

// =============================================================================
// Singleton Configuration Instance
// =============================================================================

let cachedConfig: EnvConfig | null = null;

/**
 * Get environment configuration (cached for performance)
 */
export function getEnvConfig(): EnvConfig {
  if (cachedConfig) return cachedConfig;
  
  cachedConfig = buildEnvConfig();
  
  // Log configuration on initialization
  if (typeof window !== 'undefined' && cachedConfig.ENABLE_LOGGING) {
    console.log('[ENV] Configuration initialized:', {
      API_URL: cachedConfig.API_URL,
      USE_PROXY: cachedConfig.USE_PROXY,
      API_TIMEOUT: cachedConfig.API_TIMEOUT,
      ASSET_URL: cachedConfig.ASSET_URL,
      ENABLE_LOGGING: cachedConfig.ENABLE_LOGGING,
      ENABLE_MOCK_DATA: cachedConfig.ENABLE_MOCK_DATA,
    });
  }
  
  return cachedConfig;
}

// =============================================================================
// Individual Config Exports (for convenience)
// =============================================================================

/**
 * Get API base URL
 * - Proxy mode: returns '/' (relative path)
 * - Direct mode: returns full URL
 */
export function getApiBaseUrl(): string {
  const config = getEnvConfig();
  
  if (config.USE_PROXY) {
    return '/';
  }
  
  return config.API_URL;
}

/**
 * Check if proxy mode is enabled
 */
export function isUsingProxy(): boolean {
  return getEnvConfig().USE_PROXY;
}

/**
 * Get API timeout in milliseconds
 */
export function getApiTimeout(): number {
  return getEnvConfig().API_TIMEOUT;
}

/**
 * Get asset base URL for media files
 */
export function getAssetBaseUrl(): string {
  const config = getEnvConfig();
  
  if (config.ASSET_URL) {
    return config.ASSET_URL;
  }
  
  return config.API_URL;
}

/**
 * Check if logging is enabled
 */
export function isLoggingEnabled(): boolean {
  return getEnvConfig().ENABLE_LOGGING;
}

/**
 * Check if mock data mode is enabled
 */
export function isMockDataEnabled(): boolean {
  return getEnvConfig().ENABLE_MOCK_DATA;
}

// =============================================================================
// API Configuration Object (for apiClient)
// =============================================================================

export interface ApiClientConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly useProxy: boolean;
}

export function getApiClientConfig(): ApiClientConfig {
  return {
    baseUrl: getApiBaseUrl(),
    timeout: getApiTimeout(),
    useProxy: isUsingProxy(),
  };
}

// =============================================================================
// Debug Helper
// =============================================================================

export function getEnvDebugInfo(): {
  config: EnvConfig;
  browser: { hostname: string; href: string } | null;
  envVars: Record<string, string | undefined>;
} {
  return {
    config: getEnvConfig(),
    browser: typeof window !== 'undefined' 
      ? { hostname: window.location.hostname, href: window.location.href }
      : null,
    envVars: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_USE_PROXY: process.env.NEXT_PUBLIC_USE_PROXY,
      NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT,
      NEXT_PUBLIC_ASSET_URL: process.env.NEXT_PUBLIC_ASSET_URL,
      NEXT_PUBLIC_ENABLE_LOGGING: process.env.NEXT_PUBLIC_ENABLE_LOGGING,
      NEXT_PUBLIC_ENABLE_MOCK_DATA: process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA,
    },
  };
}

