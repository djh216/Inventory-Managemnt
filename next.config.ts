import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The desk is opened at 127.0.0.1; Next treats that as cross-origin in dev.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
