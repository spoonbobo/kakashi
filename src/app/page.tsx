"use client";

import { useState, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { Navbar } from '../components/navbar';
import WelcomeBox from '../components/greeting/welcome_box';
import AgentTaskPanel from '../components/task/task_panel';
import { ResizableLayoutV } from '@/components/stretch/resizeable_layoutV';
import { ResizableLayoutH } from '@/components/stretch/resizeable_layoutH';
import { ListRooms } from '../components/chat/list_rooms';
import { Tasks } from '../components/task/task_history';
import TaskLogger from '../components/task/task_logger';
import ChatRoom from '../components/chat/chat_room';
import { KnowledgeBase } from '../components/kb/knowledge_base';
import { NotifyPanel } from '../components/alert/notify_panel';
import { Help } from '../components/help/help';
import "./globals.css"



export default function Home() {
  const [greeting, setGreeting] = useState<string>('Loading...');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [time, setTime] = useState<string>('');
  const [activeView, setActiveView] = useState<'chat' | 'tasks' | 'conversations' | 'help' | 'feedback' | 'knowledge_base'>('chat');
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
        setActiveView(view as 'chat' | 'conversations' | 'tasks' | 'help' | 'feedback' | 'knowledge_base');
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
        onHelpClick={handleHelpClick}
        onFeedbackClick={handleFeedbackClick}
        onKnowledgeBaseClick={handleKnowledgeBaseClick}
        onApprovalsClick={() => { }}
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
                activeView === 'tasks' ? <ResizableLayoutH
                  topComponent={<Tasks onTaskSelect={task => setSelectedTask(task)} />}
                  bottomComponent={<TaskLogger
                    key={selectedTask?.id || 'no-task'}
                    title="Task Detail"
                    task={selectedTask}
                  />}
                /> :
                  activeView === 'knowledge_base' ? <KnowledgeBase /> :
                    activeView === 'help' ? <Help /> :
                      <ListRooms />
          }
          rightComponent={
            <ResizableLayoutH
              bottomComponent={<AgentTaskPanel title="Recent Tasks" onTaskSelect={setSelectedTask} />}
              topComponent={<NotifyPanel />}
            />}
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