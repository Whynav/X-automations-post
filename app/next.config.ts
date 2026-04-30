import type { NextConfig } from "next";
import { config } from "dotenv";
import path from "path";

config({ path: path.join(__dirname, "..", ".env") });

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "api.apify.com" },
    ],
  },
};

export default nextConfig;
