import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Admin photo uploads: each photo arrives as two shrunk copies, well under this.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
