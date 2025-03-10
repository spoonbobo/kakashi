"use client";

import { useState, useEffect } from 'react';
import { Box, Heading, Center, Spinner, Flex, Text } from '@chakra-ui/react';
import { ChakraProvider } from '@chakra-ui/react';
import "./globals.css"
// import Sidebar from '../components/ui/Sidebar';
import Navbar from '../components/ui/navbar';

export default function Home() {
  const [greeting, setGreeting] = useState<string>('Loading...');

  useEffect(() => {
    async function fetchGreeting() {
      try {
        const response = await fetch('http://localhost:3000/api/greeting');
        console.log(response);
        const data = await response.json();
        // setGreeting(data.greeting);
        setGreeting(data.time);
      } catch (error) {
        console.error('Failed to fetch greeting:', error);
        setGreeting('Failed to load greeting.');
      }
    }

    fetchGreeting();
  }, []);

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      minH="100vh"
    >
      <Navbar />
      <Box textAlign="center" boxShadow="md" p={6} bg="white" borderRadius="md">
        <Heading as="h1" size="2xl" color="blue.600" mb={4}>
          {greeting === 'Loading...' ? <Spinner size="xl" /> : greeting}
        </Heading>
        <Text fontSize="lg" color="gray.600">
          Welcome to our application. Explore the features and enjoy your stay!
        </Text>
      </Box>
    </Flex>
  );
}