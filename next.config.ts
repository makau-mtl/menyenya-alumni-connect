import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "Keep a child in school" became the Menyenya Alumni Bursary Fund (18 Oct 2026).
  async redirects() {
    return ["causes", "give", "pledge"].map((p) => ({ source: `/${p}/keep-a-child-in-school`, destination: `/${p}/bursary-fund`, permanent: true }));
  },
  experimental: {
    // Admin photo uploads: each photo arrives as two shrunk copies, well under this.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
