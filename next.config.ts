import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverActions: {
    bodySizeLimit: '10mb', // Allow up to 10MB for file uploads
  },
};

export default nextConfig;
