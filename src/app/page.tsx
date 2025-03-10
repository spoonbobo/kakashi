"use client";

import { useState, useEffect } from 'react';
import { Flex, Text } from '@chakra-ui/react';
import Navbar from '../components/ui/navbar';
import WelcomeBox from '../components/ui/box/welcome_box';
import AgentDialogPanel from '../components/ui/panel/agent_dialog_panel';
import { useAuth } from '@/auth/context';
import "./globals.css"

export default function Home() {
  const [greeting, setGreeting] = useState<string>('Loading...');
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    async function fetchGreeting() {
      try {
        const response = await fetch('http://localhost:3000/api/greeting');
        const data = await response.json();
        setGreeting(data.greeting);
        
        // Format the time as H:M:S DD-MM-YY
        const date = new Date(data.time);
        const formattedTime = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} ${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        setTime(formattedTime);
      } catch (error) {
        console.error('Failed to fetch greeting:', error);
        setGreeting('Failed to load greeting.');
      }
    }

    fetchGreeting();
  }, []);

  const { isAuthenticated } = useAuth();

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      minH="100vh"
      position="relative"
    >
      <Navbar />
      <WelcomeBox greeting={greeting} />
      <AgentDialogPanel />
      <Text
        position="absolute"
        bottom="10px"
        right="10px"
        fontSize="sm"
        color="gray.500"
      >
        Version 1.0.0
      </Text>
    </Flex>
  );
}