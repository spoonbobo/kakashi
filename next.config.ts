import type { NextConfig } from "next";
// import webpack from 'webpack';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
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

    config.module.rules.push({
      test: /\.node$/,
      use: 'raw-loader'
    });

    config.module.exprContextCritical = false;

    return config;
  },
};

export default nextConfig;
