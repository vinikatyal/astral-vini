// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => [
    { source: "/", destination: "/lessons" },
  ],
};

export default nextConfig;