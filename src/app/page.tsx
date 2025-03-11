"use client";

import { useState, useEffect } from 'react';
import { Text, Box } from '@chakra-ui/react';
import Navbar from '../components/ui/navbar';
import WelcomeBox from '../components/ui/box/welcome_box';
import AgentDialogPanel from '../components/ui/panel/agent_dialog_panel';
import { ChatInterface } from '../components/ui/chat/chat_interface';
import { ResizableLayoutV } from '@/components/ui/stretch/resizeable_layoutV';
import { ResizableLayoutH } from '@/components/ui/stretch/resizeable_layoutH';
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

  return (
    <Box
      position="relative"
      minH="100vh"
    >
      <Navbar />
      
      <Box 
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        zIndex={10}
      >
        <WelcomeBox greeting={greeting} />
      </Box>
  
      <Box 
        pt="80px"
        height="100vh"
        overflow="hidden"
      >
       <ResizableLayoutV
            leftComponent={<ChatInterface />}
            rightComponent={
            <ResizableLayoutH
              topComponent={<AgentDialogPanel title="Progress" />}
              bottomComponent={<AgentDialogPanel title="Tasks" />}
              />}
            initialLeftWidth="75%"
        />
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