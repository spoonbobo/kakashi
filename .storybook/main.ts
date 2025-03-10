import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],

  "addons": [
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@chromatic-com/storybook",
    "@storybook/addon-interactions",
    "@storybook/addon-mdx-gfm"
  ],

  "framework": {
    "name": "@storybook/nextjs",
    "options": {}
  },

  "staticDirs": [
    "../public"
  ],

  docs: {
    autodocs: "tag"
  },

  typescript: {
    reactDocgen: "react-docgen-typescript",
    check: true
  }
};
export default config;