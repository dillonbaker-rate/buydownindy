import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a local production build run beside the dev server (NEXT_DIST_DIR=.next-prod).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
