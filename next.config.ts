import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  i18n: {
    locales: ["zh", "en"],
    defaultLocale: "en",
  },
};

export default nextConfig;
