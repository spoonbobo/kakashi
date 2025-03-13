import React, { useState } from 'react';
import { Portal, Button, Input, Popover, Text, IconButton, Icon } from '@chakra-ui/react';
import { useAuth } from '@/auth/context';
import { FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';

export const AuthPopover = () => {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  console.log('User:', user);
  console.log('isAuthenticated:', isAuthenticated);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        // Handle API errors
        throw new Error(data.error || 'Login failed');
      }

      // Ensure the response contains the expected data
      if (!data.token || !data.user) {
        throw new Error('Invalid response from server');
      }

      // Log the data being passed to login
      const loginData = {
        id: data.user.id,
        username: data.user.username,
        token: data.token
      };
      console.log('Calling login with:', loginData);

      // Update the auth context
      login(loginData);

      // Clear form fields
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error('Login Error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton variant="outline" aria-label="Login">
          {isAuthenticated ? <Icon as={FaSignOutAlt} /> : <Icon as={FaSignInAlt} />}
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body>
              {isAuthenticated ? (
                <IconButton onClick={logout} colorScheme="red" size="sm" aria-label="Logout">
                  <Icon as={FaSignOutAlt} />
                </IconButton>
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
                    <Button type="submit" colorScheme="blue" size="sm" aria-label="Login">Login</Button>
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