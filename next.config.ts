import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://47.100.251.249:38000/api/:path*',
      },
    ];
  },
};

export default nextConfig;