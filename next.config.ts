import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/candidate-mobile",
        destination: "/candidate-mobile/index.html",
      },
      {
        source: "/candidate-mobile/",
        destination: "/candidate-mobile/index.html",
      },
    ];
  },
};

export default nextConfig;
