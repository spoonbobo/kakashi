import React from 'react';
import { Portal, Button, Popover, Text } from '@chakra-ui/react';

interface PopoverProps {
  title: string;
}

export const SimplePopover = ({ title }: PopoverProps) => {
    
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="sm">
          {title}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body>
              
              <Text>{title}</Text>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};