import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    esmExternals: false,
  },
};

export default nextConfig;