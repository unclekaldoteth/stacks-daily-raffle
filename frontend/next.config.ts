import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile Stacks packages that have ESM issues
  transpilePackages: [
    '@stacks/connect',
    '@stacks/network',
    '@stacks/transactions',
    '@stacks/common',
    '@stacks/auth',
  ],

  // Set Content Security Policy to allow eval() for Stacks libraries
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // unsafe-eval is required for @stacks/transactions
            // unsafe-inline is required for Next.js hydration in some cases and style injection
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.hiro.so https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://*.hiro.so https://assets.coingecko.com; connect-src 'self' https://*.hiro.so https://*.stacks.co wss://*.hiro.so https://api.coingecko.com;",
          },
        ],
      },
    ];
  },

  // Use Webpack for production builds (Turbopack has issues with @stacks dynamic imports)
  // Note: Turbopack is only used in dev mode by default

  // Webpack configuration to properly handle @stacks packages
  webpack: (config, { isServer }) => {
    // Don't bundle these packages on the client - let them be loaded dynamically
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },

  // Disable static optimization for pages using dynamic imports
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
