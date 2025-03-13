import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  webpack: (config) => {
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      net: false,
      tls: false,
      dns: false,
      fs: false,
      child_process: false
    };
    return config;
  },
};

export default nextConfig;
