import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone for Docker builds
  output: "standalone",
  
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Empty turbopack config to silence migration warning
  // HarperDB package will be handled by @harperdb/nextjs extension
  turbopack: {},
};

export default nextConfig;
