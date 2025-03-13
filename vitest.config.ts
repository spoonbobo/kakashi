import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/writing-tests/test-addon
export default defineConfig({
  test: {
    workspace: [
      {
        extends: true,
        test: {
          name: 'storybook',
          browser: {
        enabled: true,
        headless: true,
        name: 'chromium',
        provider: 'playwright'
      },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
