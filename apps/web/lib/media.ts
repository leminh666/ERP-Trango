// =============================================================================
// Media/Asset URL Resolution Utility
// =============================================================================
//
// Handles image URLs for both desktop and mobile (including LAN access)
// Uses centralized config - no hardcoded IPs
// =============================================================================

import { getAssetBaseUrl } from '@/src/config';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if URL is localhost
 */
function isLocalhostUrl(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

/**
 * Sanitize URL by removing query params and hashes for comparison
 */
function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.search = '';
    urlObj.hash = '';
    return urlObj.toString();
  } catch {
    return url;
  }
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Resolve a raw image URL to a proper accessible URL for both desktop and mobile
 *
 * Rules:
 * - Empty/null/undefined → null
 * - http/https URLs → return as-is (if not localhost)
 * - localhost URLs → replace host with asset base URL (for LAN access)
 * - Relative URLs → prefix with asset base URL
 * - /placeholder-product.png → return as-is (frontend serves this)
 */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  // Handle empty/null/undefined
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  // Check if it's the placeholder - return as-is for frontend to handle
  if (trimmed.endsWith('/placeholder-product.png') || trimmed.endsWith('/placeholder-product.svg')) {
    return trimmed;
  }

  // Already absolute URL with proper host
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it's localhost, replace with current asset base URL for LAN access
    if (isLocalhostUrl(trimmed)) {
      const assetBase = getAssetBaseUrl();
      try {
        const urlObj = new URL(trimmed);
        const assetObj = new URL(assetBase);
        urlObj.host = assetObj.host;
        urlObj.port = assetObj.port;
        return urlObj.toString();
      } catch {
        return assetBase + trimmed;
      }
    }
    return trimmed;
  }

  // Relative URL - prefix with asset base URL
  if (trimmed.startsWith('/') || trimmed.startsWith('uploads/') || !trimmed.includes('://')) {
    const assetBase = getAssetBaseUrl();
    // Remove trailing slash from asset base
    const normalizedBase = assetBase.replace(/\/$/, '');

    // Normalize the path
    let normalizedPath = trimmed;
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }

    return normalizedBase + normalizedPath;
  }

  // Unknown format, return as-is
  return url;
}

/**
 * Get placeholder image URL - always use frontend-served placeholder
 */
export function getPlaceholderImage(): string {
  return '/placeholder-product.png';
}

/**
 * Resolve product image with placeholder fallback
 * This function handles all cases:
 * - Valid image URL → resolved URL
 * - Localhost URL → replaced with LAN IP
 * - Empty/null → placeholder
 */
export function resolveProductImage(imageUrl: string | null | undefined): string {
  const resolved = resolveAssetUrl(imageUrl);
  return resolved || getPlaceholderImage();
}

/**
 * Safe image component props for Next.js Image or regular img
 */
export interface SafeImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
}

/**
 * Check if an image URL should trigger fallback
 * Returns true if we should use placeholder
 */
export function shouldUseFallback(imageUrl: string | null | undefined): boolean {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return true;
  }

  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return true;
  }

  // Check for invalid patterns
  if (trimmed === '/placeholder-product.png' || trimmed === '/placeholder-product.svg') {
    return true;
  }

  // Check for placeholder-like patterns
  if (trimmed.includes('placeholder') && (trimmed.endsWith('.png') || trimmed.endsWith('.svg'))) {
    return true;
  }

  return false;
}

/**
 * Check if URL is accessible (basic validation)
 */
export function isValidAssetUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    // Try to create URL object
    if (url.startsWith('http://') || url.startsWith('https://')) {
      new URL(url);
      return true;
    }
    // Relative URLs are valid if they don't contain protocol-relative starts
    if (url.startsWith('/') || !url.includes('://')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
