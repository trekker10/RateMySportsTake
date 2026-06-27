import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "ratemysportstake.com", "www.ratemysportstake.com"],
    },
  },
};

export default nextConfig;
