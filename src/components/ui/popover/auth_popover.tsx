import React, { useState } from 'react';
import { Portal, Button, Input, Popover, Text } from '@chakra-ui/react';
import { useAuth } from '@/auth/context';

export const AuthPopover = () => {
  const { isAuthenticated, login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    console.log(username, password);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        console.log(response);
        throw new Error('Login failed');
      }

      const data = await response.json();
      console.log('Login successful:', data);
      login(); // Update the context state
    } catch (error) {
      setError('Invalid username or password');
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="outline">
          {isAuthenticated ? 'Logout' : 'Login'}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body>
              {isAuthenticated ? (
                <Button onClick={logout} colorScheme="red" size="sm">Logout</Button>
              ) : (
                <>
                  <Popover.Title fontWeight="medium">Login</Popover.Title>
                  <Text my="4">
                    Please enter your login details.
                  </Text>
                  <form onSubmit={handleLogin}>
                    <Input
                      placeholder="Username"
                      size="sm"
                      mb="2"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <Input
                      placeholder="Password"
                      size="sm"
                      type="password"
                      mb="4"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && <Text color="red.500" mb="2">{error}</Text>}
                    <Button type="submit" colorScheme="blue" size="sm">Submit</Button>
                  </form>
                </>
              )}
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};