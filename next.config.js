/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations (CSS optimization disabled for compatibility)
  experimental: {
    // optimizeCss: true, // Disabled due to critters dependency issue
    optimizeServerReact: true,
  },

  // Suppress development warnings for sync dynamic API usage
  onDemandEntries: {
    // Keep pages in memory for longer during development
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Suppress build warnings
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Configure static optimization to avoid API route warnings
  staticPageGenerationTimeout: 60,
  
  // Output configuration to suppress warnings
  output: 'standalone',
  
  // Disable static optimization for problematic pages
  async rewrites() {
    return [];
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Suppress warnings in production builds
    if (!dev) {
      config.infrastructureLogging = {
        level: 'error',
      };
      
      // Suppress specific warnings
      config.ignoreWarnings = [
        /Dynamic server usage/,
        /couldn't be rendered statically/,
        /headers\(\)/,
      ];
    }
    
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
