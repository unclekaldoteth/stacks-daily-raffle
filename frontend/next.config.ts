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

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Permissive CSP to ensure all resources load while explicitly allowing unsafe-eval
            // This enables @stacks dependencies to function without blocking images, fonts, or styles
            value: "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src * data: blob: 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src * data: blob:; style-src * data: blob: 'unsafe-inline'; font-src * data: blob: 'unsafe-inline';",
          },
        ],
      },
    ];
  },  // Use Webpack for production builds (Turbopack has issues with @stacks dynamic imports)
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
