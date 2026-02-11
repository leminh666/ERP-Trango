/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // =============================================================================
  // API Proxy Configuration - Route /api/* to Backend
  // =============================================================================
  // This enables LAN access without hardcoded IP:
  // - Mobile accesses FE at http://192.168.1.12:3000
  // - Requests to /api/* are proxied to backend at localhost:4000
  // - No CORS needed for /api/* requests (same origin)
  // =============================================================================

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/:path*`,
      },
    ];
  },

  // =============================================================================
  // For non-proxy mode (direct API calls), we keep CORS-friendly config
  // =============================================================================
  // Note: With rewrites enabled above, CORS is NOT needed for /api/* requests
  // because they become same-origin requests.
  //
  // HOWEVER, if you access backend directly (e.g., http://192.168.1.12:4000),
  // CORS is still required. The backend (main.ts) handles this.
  // =============================================================================

  // Image configuration for proper LAN/mobile support
  images: {
    remotePatterns: [
      // Allow all localhost variants for development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '4000',
        pathname: '/uploads/**',
      },
      // Allow LAN IPs (e.g., 192.168.x.x:4000)
      {
        protocol: 'http',
        hostname: '**',
        port: '4000',
        pathname: '/uploads/**',
      },
      // Production domains (update these for actual production)
      {
        protocol: 'https',
        hostname: 'api.trangohoanggia.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'erp.trangohoanggia.com',
        pathname: '/uploads/**',
      },
    ],
    // Uncomment for development to allow all (less secure but easier)
    // dangerousAllowWildcardCards: true,
  },
};

module.exports = nextConfig;
