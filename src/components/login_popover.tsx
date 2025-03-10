import { Portal, Button, Input, Popover, Text } from '@chakra-ui/react';

export const LoginPopover = () => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="outline">
          Login
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body>
              <Popover.Title fontWeight="medium">Login</Popover.Title>
              <Text my="4">
                Please enter your login details.
              </Text>
              <Input placeholder="Username" size="sm" mb="2" />
              <Input placeholder="Password" size="sm" type="password" mb="4" />
              <Button colorScheme="blue" size="sm">Submit</Button>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};