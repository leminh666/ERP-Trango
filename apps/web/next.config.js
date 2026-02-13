/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors:  true
  },

  // =============================================================================
  // Output: standalone for minimal Docker image size
  // =============================================================================
  output: 'standalone',

  // =============================================================================
  // API Proxy Configuration - LAN/Mobile Support
  // =============================================================================
  //
  // PROXY MODE (RECOMMENDED):
  // - Set NEXT_PUBLIC_USE_PROXY=true in .env.local
  // - All /api/* requests are proxied to backend
  // - No IP hardcoding needed!
  // - Mobile accesses FE at http://192.168.x.x:3000
  // - Backend calls automatically go to http://192.168.x.x:4000
  //
  // NGINX MODE (PRODUCTION):
  // - Set NEXT_PUBLIC_USE_PROXY=true
  // - Frontend calls /api/* which is proxied by Nginx to backend
  // - No CORS issues, works with any IP
  //
  // DOCKER MODE:
  // - Use docker-compose.yml to link frontend and backend services
  // - Frontend at http://localhost:3000
  // - Backend at http://backend:4000 (container name)
  // - Set NEXT_PUBLIC_API_URL=http://backend:4000 in .env
  //
  // DIRECT MODE (fallback):
  // - NEXT_PUBLIC_API_URL=http://192.168.x.x:4000
  // - API calls go directly to backend URL
  // =============================================================================

  async rewrites() {
    // Get API URL from environment
    // For Docker: use container name (backend)
    // For LAN: use the IP from NEXT_PUBLIC_API_URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    return [
      {
        // Proxy /api/* to backend
        // This enables LAN access without hardcoded IP
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },

  // =============================================================================
  // Image Configuration - Support LAN IPs for image loading
  // =============================================================================
  images: {
    remotePatterns: [
      // Allow localhost for development
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
      // Allow LAN IPs (192.168.x.x, 10.x.x.x)
      {
        protocol: 'http',
        hostname: '**',
        port: '4000',
        pathname: '/uploads/**',
      },
      // Production domains
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
  },
};

module.exports = nextConfig;
