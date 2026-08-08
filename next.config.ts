import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server actions for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  // Allow access from other devices on local network
  allowedDevOrigins: ['192.168.1.118', '10.71.222.163', '10.230.103.163'],
  // Allow images from local uploads
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
