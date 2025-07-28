/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress critical dependency warnings from third-party packages
  webpack: (config, { isServer: _isServer }) => {
    // Suppress warnings for known third-party packages
    config.ignoreWarnings = [
      // OpenTelemetry instrumentation warnings
      {
        module: /node_modules\/@opentelemetry\/instrumentation/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      // Swagger JSDoc warnings
      {
        module: /node_modules\/swagger-jsdoc/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    return config;
  },

  // FIXED: Moved serverComponentsExternalPackages to root level (was incorrectly in experimental)
  serverExternalPackages: ['@opentelemetry/instrumentation', 'bcryptjs'],

  // Disable source maps in production to reduce bundle size
  productionBrowserSourceMaps: false,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Remove experimental.serverComponentsExternalPackages
  experimental: {
    // Empty or remove entirely
  },
};

module.exports = nextConfig;
