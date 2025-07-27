import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for minimal Docker images
  // output: 'standalone', // Disabled for development
  
  // Optimize React for production
  reactStrictMode: true,
  
  // Disable source maps in production for smaller builds
  productionBrowserSourceMaps: false,
  
  // Disable static generation for dynamic app
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },

  // External packages for server components
  serverExternalPackages: ['next-auth', '@prisma/client', 'bcryptjs', 'socket.io', 'socket.io-client'],

  // No experimental features enabled

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Enable compression
  compress: true,
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Handle client-only packages on server
    if (isServer) {
      config.externals = [...(config.externals || []), 'socket.io-client'];
    }

    return config;
  },

  // Reduce build output verbosity
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // TypeScript and ESLint optimizations
  typescript: {
    // Disable type checking during build (run separately)
    ignoreBuildErrors: false,
  },
  eslint: {
    // Disable ESLint during build (run separately)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;