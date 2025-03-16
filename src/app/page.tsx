"use client";

import { useState, useEffect } from 'react';
import { Text, Box } from '@chakra-ui/react';
import { Navbar } from '../components/ui/navbar';
import WelcomeBox from '../components/ui/box/welcome_box';
import AgentTaskPanel from '../components/ui/panel/agent_task_panel';
import { ResizableLayoutV } from '@/components/ui/stretch/resizeable_layoutV';
import { ResizableLayoutH } from '@/components/ui/stretch/resizeable_layoutH';
import { ListRooms } from '../components/ui/chat/list_rooms';
import { Tasks } from '../components/ui/tasks/task_history';
import { Approvals } from '../components/ui/approvals/approval_history';
import TaskLogger from '../components/ui/panel/task_logger';
import ChatRoom from '../components/ui/chat/chat_room';
import { KnowledgeBase } from '../components/ui/kb/knowledge_base';
import "./globals.css"
import Image from 'next/image';
import logo from '/src/images/logo.png'; // Ensure the path is correct


export default function Home() {
  const [greeting, setGreeting] = useState<string>('Loading...');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [time, setTime] = useState<string>('');
  const [activeView, setActiveView] = useState<'chat' | 'tasks' | 'approvals' | 'conversations' | 'help' | 'feedback' | 'knowledge_base'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    const handleRouteChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get('view');
      const roomId = urlParams.get('roomId');
      const session = urlParams.get('session');

      if (view === 'chat' && (roomId || session)) {
        setActiveView('chat');
        setSessionId(roomId || session || null);
      } else if (view === 'conversations') {
        setActiveView('conversations');
        setSessionId(null);
      } else if (view) {
        setActiveView(view as 'chat' | 'conversations' | 'tasks' | 'approvals' | 'knowledge_base');
        setSessionId(null);
      }
    };

    handleRouteChange();

    const popstateHandler = () => handleRouteChange();
    window.addEventListener('popstate', popstateHandler);

    return () => {
      window.removeEventListener('popstate', popstateHandler);
    };
  }, []);

  useEffect(() => {
    // Listen for both events
    const handleSessionChange = (event: CustomEvent) => {
      setActiveView('chat');
      setSessionId(event.detail);
    };

    const handleRoomChange = (event: CustomEvent) => {
      setActiveView('chat');
      setSessionId(event.detail);
    };

    window.addEventListener('sessionChange', handleSessionChange as EventListener);
    window.addEventListener('roomChange', handleRoomChange as EventListener);

    return () => {
      window.removeEventListener('sessionChange', handleSessionChange as EventListener);
      window.removeEventListener('roomChange', handleRoomChange as EventListener);
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

  const handleKnowledgeBaseClick = () => {
    setActiveView('knowledge_base');
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

  useEffect(() => {
    console.log('Active view:', activeView);
  }, [activeView]);

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
        onKnowledgeBaseClick={handleKnowledgeBaseClick}
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
              activeView === 'conversations' ? <ListRooms /> :
                activeView === 'tasks' ? <Tasks /> :
                  activeView === 'approvals' ? <Approvals /> :
                    activeView === 'knowledge_base' ? <KnowledgeBase /> :
                      <ListRooms />
          }
          rightComponent={
            <ResizableLayoutH
              topComponent={<AgentTaskPanel title="Task" onTaskSelect={setSelectedTask} />}
              bottomComponent={<TaskLogger title="Task Log" task={selectedTask} />}
            />}
          initialLeftWidth="75%"
        />
      </Box>
      <Box position="absolute" bottom="30px" right="10px" display="flex" alignItems="center">
        <Box width="100px" height="auto" overflow="hidden" mr="2">
          <Image
            src={logo}
            alt="Logo"
            layout="responsive"
            width={50} // Adjust width as needed
            height={50} // Adjust height as needed
            className="shiny-logo"
          />
        </Box>
        <Text fontSize="sm" color="gray.500">
          Version 0.0.2
        </Text>
      </Box>
    </Box>
  );
}