import type { Meta, StoryObj } from '@storybook/react';
import Home from '../app/page';

const meta: Meta<typeof Home> = {
  title: 'Pages/Home',
  component: Home,
};

export default meta;
type Story = StoryObj<typeof Home>;

export const Default: Story = {
  args: {},
}; 