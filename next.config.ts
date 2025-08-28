import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure the correct project root is used even if other lockfiles exist above this dir
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
