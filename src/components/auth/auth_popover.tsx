import React, { useState, memo } from 'react';
import { Portal, Button, Input, Popover, Text, IconButton, Icon } from '@chakra-ui/react';
import { useAuth } from '@/auth/context';
import { FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';

export const AuthPopover = memo(() => {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  console.log('User:', user);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

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

      // Update the auth context
      login(loginData);

      // Clear form fields
      setUsername('');
      setPassword('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          variant="ghost"
          aria-label="Login"
          color="white"
          bg="transparent"
          _hover={{ bg: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
          _active={{ bg: 'rgba(255, 255, 255, 0.3)' }}
          _focus={{ boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.3)' }}
        >
          {isAuthenticated ? <Icon as={FaSignOutAlt} /> : <Icon as={FaSignInAlt} />}
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body>
              {isAuthenticated ? (
                <div>
                  <Popover.Title fontWeight="medium">Account</Popover.Title>
                  <Text my="2">
                    Logged in as <strong>{user?.username}</strong>
                  </Text>
                  <Button
                    onClick={logout}
                    colorScheme="red"
                    size="sm"
                    width="full"
                    mt="2"
                  >
                    Logout
                  </Button>
                </div>
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
});

AuthPopover.displayName = 'AuthPopover';
