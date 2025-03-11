"use client";

import { useState, useEffect } from 'react';
import { Flex, Text, Input, Button, IconButton, Icon, Box } from '@chakra-ui/react';
import Navbar from '../components/ui/navbar';
import WelcomeBox from '../components/ui/box/welcome_box';
import AgentDialogPanel from '../components/ui/panel/agent_dialog_panel';
import { TextMessage } from '../components/ui/message/text';
import { useAuth } from '@/auth/context';
import "./globals.css"

export default function Home() {
  const [greeting, setGreeting] = useState<string>('Loading...');
  const [time, setTime] = useState<string>('');
  const [message, setMessage] = useState<string>('');

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
    <Box
      position="relative"
      minH="100vh"
    >
      <Navbar />
      
      {/* Welcome Box - Centered absolutely */}
      <Box 
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        zIndex={10}
      >
        <WelcomeBox greeting={greeting} />
      </Box>
  
      {/* Main content - Only visible when authenticated */}
      <Box 
        pt="80px" // Account for navbar height
        height="100vh" // Set fixed height
        overflow="hidden" // Prevent outer scrolling
      >
        <Flex 
          width="100%"
          height="calc(100% - 80px)" // Subtract navbar height
          justify="space-between"
          wrap="nowrap"
          position="relative"
          gap={6} // Add gap between flex items
          px={4} // Move padding here from outer box
        >
          <Box width="0px" display={{ base: "none", md: "block" }} flexShrink={0} />          
          <TextMessage />          
          <Box 
            width="25%"
            minWidth={{ base: "100%", md: "250px" }}
            display={{ base: "none", md: "block" }}
            flexShrink={0}
          >
            <AgentDialogPanel />
          </Box>
        </Flex>
      </Box>
  
      <Text
        position="absolute"
        bottom="10px"
        right="10px"
        fontSize="sm"
        color="gray.500"
      >
        Version 0.0.1
      </Text>
    </Box>
  );
}