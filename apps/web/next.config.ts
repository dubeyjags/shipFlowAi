import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@monorepo/auth", "@monorepo/db"],
};

export default nextConfig;
