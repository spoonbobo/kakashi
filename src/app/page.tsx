"use client";

import { useState, useEffect } from 'react';
import { Text, Box } from '@chakra-ui/react';
import Navbar from '../components/ui/navbar';
import WelcomeBox from '../components/ui/box/welcome_box';
import AgentTaskPanel from '../components/ui/panel/agent_task_panel';
import { ResizableLayoutV } from '@/components/ui/stretch/resizeable_layoutV';
import { ResizableLayoutH } from '@/components/ui/stretch/resizeable_layoutH';
import { ListRooms } from '../components/ui/chat/list_rooms';
import { Tasks } from '../components/ui/tasks/task_history';
import { Approvals } from '../components/ui/approvals/approval_history';
import TaskLogger from '../components/ui/panel/task_logger';
import "./globals.css"
import ChatRoom from '../components/ui/chat/chat_room';

export default function Home() {
  const [greeting, setGreeting] = useState<string>('Loading...');
  const [time, setTime] = useState<string>('');
  const [activeView, setActiveView] = useState<'chat' | 'tasks' | 'approvals' | 'conversations' | 'help' | 'feedback'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    const handleRouteChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get('view');
      const session = urlParams.get('session');

      if (view === 'chat' && session) {
        setActiveView('chat');
        setSessionId(session);
      } else {
        setActiveView('conversations');
        setSessionId(null);
      }
    };

    handleRouteChange();

    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  useEffect(() => {
    const handleSessionChange = (event: CustomEvent) => {
      setActiveView('chat');
      setSessionId(event.detail);
    };

    window.addEventListener('sessionChange', handleSessionChange as EventListener);

    return () => {
      window.removeEventListener('sessionChange', handleSessionChange as EventListener);
    };
  }, []);


  const handleConversationsClick = () => {
    window.history.pushState({}, '', '/?view=conversations');
    setActiveView('conversations');
    setSessionId(null);
  };

  const handleNewChatClick = () => {
    setActiveView('chat');
    setSessionId(null);
    window.history.pushState({}, '', '/?view=chat');
    window.dispatchEvent(new CustomEvent('newChat'));
  };

  const handleTasksClick = () => {
    setActiveView('tasks');
  };

  const handleApprovalsClick = () => {
    setActiveView('approvals');
  };

  const handleHelpClick = () => {
    setActiveView('help');
  };

  const handleFeedbackClick = () => {
    setActiveView('feedback');
  };

  useEffect(() => {
    async function fetchGreeting() {
      try {
        const response = await fetch('/api/greeting');
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
      <Navbar 
        onConversationsClick={handleConversationsClick}
        onNewChatClick={handleNewChatClick}
        onTasksClick={handleTasksClick}
        onApprovalsClick={handleApprovalsClick}
        onHelpClick={handleHelpClick}
        onFeedbackClick={handleFeedbackClick}
      />
      
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
            leftComponent={
              activeView === 'chat' ? <ChatRoom roomId={sessionId || ''} /> :
              activeView === 'tasks' ? <Tasks /> :
              activeView === 'approvals' ? <Approvals /> :
              activeView === 'conversations' ? <ListRooms /> :
              <ChatRoom roomId={sessionId || ''} />
            }
            rightComponent={
            <ResizableLayoutH
              topComponent={<AgentTaskPanel title="Task" onTaskSelect={setSelectedTask} />}
              bottomComponent={<TaskLogger title="Task Log" task={selectedTask} />}
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