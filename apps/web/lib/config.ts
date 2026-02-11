// =============================================================================
// API Configuration - Single source of truth for API URL
// =============================================================================
//
// DUAL MODE SUPPORT:
// 1. PROXY MODE (RECOMMENDED for LAN/Mobile):
//    - Set NEXT_PUBLIC_USE_PROXY=true in .env.local
//    - API calls go to /api/* (relative), Next.js proxies to backend
//    - No IP hardcoding needed!
//
// 2. DIRECT MODE (fallback):
//    - Set NEXT_PUBLIC_API_URL=http://192.168.x.x:4000 OR leave empty for auto-detect
//    - API calls go directly to backend URL
//    - Auto-detect: uses window.location.hostname to build API URL
//
// USAGE:
//   import { getApiBaseUrl, buildApiUrl, isUsingProxy } from '@/lib/config';
//
//   const baseUrl = getApiBaseUrl();           // "/" (proxy) or "http://192.168.1.100:4000" (direct)
//   const fullUrl = buildApiUrl('/projects');  // "/projects" (proxy) or "http://192.168.1.100:4000/projects" (direct)
// =============================================================================

/**
 * Check if proxy mode is enabled
 */
export function isUsingProxy(): boolean {
  return process.env.NEXT_PUBLIC_USE_PROXY === 'true';
}

/**
 * Sanitize environment variable - remove quotes, spaces, newlines
 */
function sanitizeEnvValue(value: string | undefined): string {
  if (!value) return '';

  // Remove surrounding whitespace and newlines
  let sanitized = value.trim();

  // Remove surrounding quotes (single or double)
  if ((sanitized.startsWith('"') && sanitized.endsWith('"')) ||
      (sanitized.startsWith("'") && sanitized.endsWith("'"))) {
    sanitized = sanitized.slice(1, -1);
    // Re-trim after removing quotes
    sanitized = sanitized.trim();
  }

  return sanitized;
}

/**
 * Auto-detect API URL from current browser hostname
 * This allows API to follow the same IP as the frontend
 * e.g., if FE is at http://192.168.1.3:3000, API will be http://192.168.1.3:4000
 */
function getAutoDetectedApiUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  const { hostname } = window.location;
  const apiPort = '4000';

  // If accessing via localhost, default to localhost for API
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${apiPort}`;
  }

  // For LAN IPs (192.168.x.x, 10.x.x.x, etc.), use same IP with API port
  return `http://${hostname}:${apiPort}`;
}

/**
 * Get the API base URL
 *
 * @returns "/" for proxy mode, or full URL for direct mode
 */
export function getApiBaseUrl(): string {
  // Check if proxy mode is enabled
  if (isUsingProxy()) {
    console.log('[API CONFIG] Using PROXY mode (/api/*)');
    return '/';
  }

  const rawEnvUrl = process.env.NEXT_PUBLIC_API_URL;
  const envUrl = sanitizeEnvValue(rawEnvUrl);

  // Browser environment: prefer env var, fallback to auto-detect
  if (typeof window !== 'undefined') {
    // If env var is set, use it (with validation)
    if (envUrl) {
      // Validate URL format
      let url: URL;
      try {
        url = new URL(envUrl);
      } catch {
        const errMsg = `[API CONFIG ERROR] Invalid URL format: "${envUrl}"`;
        console.error('[API CONFIG]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[API CONFIG] Using NEXT_PUBLIC_API_URL:', envUrl);

      // WARNING: localhost won't work on mobile!
      if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        const warnMsg = `
[API CONFIG WARNING] You are using localhost: ${envUrl}

For MOBILE/TABLET testing, this won't work!
Mobile devices cannot access your PC's localhost.

For LAN testing:
  1. Find your PC IP: ipconfig (look for IPv4 Address)
  2. Create apps/web/.env.local:
     NEXT_PUBLIC_API_URL=http://192.168.x.x:4000
  3. Restart dev server

OR use PROXY mode:
  NEXT_PUBLIC_USE_PROXY=true
`;
        console.warn('[API CONFIG]', warnMsg);
      }

      // Normalize: remove trailing slash
      const normalized = envUrl.replace(/\/$/, '');
      return normalized;
    }

    // No env var - auto-detect from browser URL (NO CONFIG NEEDED!)
    const autoUrl = getAutoDetectedApiUrl();
    console.log('[API CONFIG] Auto-detected from browser:', autoUrl);
    console.log('[API CONFIG] Browser URL:', window.location.href);
    return autoUrl;
  }

  // Server-side fallback (should not be used in client code)
  return envUrl || 'http://localhost:4000';
}

/**
 * Build full API URL with path using new URL() for proper parsing
 * @param path - API endpoint path (with or without leading slash)
 * @returns Full URL or relative path depending on mode
 *
 * PROXY mode:    "/projects" (Next.js will proxy to backend)
 * DIRECT mode:   "http://192.168.1.100:4000/projects"
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();

  // In proxy mode, return relative path
  if (baseUrl === '/') {
    // Normalize path: ensure leading slash
    return path.startsWith('/') ? path : `/${path}`;
  }

  // In direct mode, build full URL
  // Normalize path: ensure leading slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Use URL constructor for proper joining
  const fullUrl = new URL(normalizedPath, baseUrl).toString();

  return fullUrl;
}

/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get environment info for debugging
 */
export function getApiConfigInfo(): {
  baseUrl: string;
  isBrowser: boolean;
  envSet: boolean;
  proxyMode: boolean;
} {
  return {
    baseUrl: getApiBaseUrl(),
    isBrowser: typeof window !== 'undefined',
    envSet: !!process.env.NEXT_PUBLIC_API_URL,
    proxyMode: isUsingProxy(),
  };
}

// Log on module load (client-side only)
if (typeof window !== 'undefined') {
  try {
    const info = getApiConfigInfo();
    console.log('[API CONFIG] Initialized:', {
      baseUrl: info.baseUrl,
      envSet: info.envSet,
      proxyMode: info.proxyMode,
    });
  } catch (error) {
    console.warn('[API CONFIG] Initialization failed:', error);
  }
}

