import type { Preview } from '@storybook/react'
import { fn } from '@storybook/test'

const preview: Preview = {
  parameters: {
    controls: {
      expanded: true,
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    docs: {
      source: {
        state: 'open',
      },
    },
  },
  args: {
    onClick: fn(),
    onChange: fn(),
    onInput: fn(),
  },
};

export default preview;