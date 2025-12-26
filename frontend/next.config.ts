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

  // Empty turbopack config to silence the error
  turbopack: {},

  // Disable static optimization for pages using Stacks SDK
  experimental: {
    // Enable server actions if needed
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
