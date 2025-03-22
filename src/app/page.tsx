"use client";

import { useState, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { Navbar } from '../components/navbar';
import WelcomeBox from '../components/greeting/welcome_box';
import { ResizableLayoutV } from '@/components/stretch/resizeable_layoutV';
import { ResizableLayoutH } from '@/components/stretch/resizeable_layoutH';
import { ListRooms } from '../components/chat/rooms';
import { Tasks } from '../components/task/task_history';
import TaskLogger from '../components/task/task_logger';
import ChatRoom from '../components/chat/chat_room';
import "./globals.css"
import { LearnTabs } from '../components/learn/learn';
import { Settings } from '../components/settings/settings';
import { LoggerTabs } from '../components/logger/logger';

export default function Home() {
  const [greeting, setGreeting] = useState<string>('Loading...');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [time, setTime] = useState<string>('');
  const [activeView, setActiveView] = useState<'chat' | 'tasks' | 'learn' | 'dashboard' | 'settings'>('chat');
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
      } else if (view) {
        setActiveView(view as 'chat' | 'tasks' | 'learn' | 'dashboard' | 'settings');
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

      // Update URL to reflect the room change
      window.history.pushState({}, '', `/?view=chat&roomId=${event.detail}`);
    };

    window.addEventListener('sessionChange', handleSessionChange as EventListener);
    window.addEventListener('roomChange', handleRoomChange as EventListener);

    return () => {
      window.removeEventListener('sessionChange', handleSessionChange as EventListener);
      window.removeEventListener('roomChange', handleRoomChange as EventListener);
    };
  }, []);

  const handleChatClick = () => {
    setActiveView('chat');
    // Force a remount of the ChatRoom component by setting sessionId to a new value
    setSessionId(null);
    window.history.pushState({}, '', '/?view=chat');

    // Add a small delay before dispatching the event to ensure state is updated
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('newChat'));
    }, 50);
  };

  const handleTasksClick = () => {
    setActiveView('tasks');
  };

  const handleLearnClick = () => {
    setActiveView('learn');
  };

  const handleDashboardClick = () => {
    setActiveView('dashboard');
  };

  const handleSettingsClick = () => {
    setActiveView('settings');
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
        onChatClick={handleChatClick}
        onTasksClick={handleTasksClick}
        onLearnClick={handleLearnClick}
        onDashboardClick={handleDashboardClick}
        onSettingsClick={handleSettingsClick}
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
            activeView === 'chat' ? <ChatRoom
              key={`chat-${sessionId || 'default'}-${activeView}`}
              roomId={sessionId || ''}
            /> :
              activeView === 'tasks' ? <ResizableLayoutH
                topComponent={<Tasks onTaskSelect={task => setSelectedTask(task)} />}
                bottomComponent={<TaskLogger
                  key={selectedTask?.id || 'no-task'}
                  title="Task Detail"
                  task={selectedTask}
                />}
              /> :
                activeView === 'learn' ? <LearnTabs /> :
                  activeView === 'settings' ? <Settings /> :
                    <ListRooms />
          }
          rightComponent={<LoggerTabs />}
          initialLeftWidth="75%"
        />
      </Box>
      <Box
        position="absolute"
        bottom="0"
        width="100%"
        display="flex"
        justifyContent="flex-end"
        alignItems="flex-end"
        px="10px"
        zIndex="1"
        pointerEvents="none"
      >

      </Box>
    </Box>
  );
}