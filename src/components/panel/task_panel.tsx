import React, { useEffect, useState, useRef } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/auth/context';
import { TaskBox } from '@/components/box/task_box';
import { io, Socket } from "socket.io-client";

interface AgentTaskPanelProps {
  title?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTaskSelect: (task: any) => void;
}

const MotionBox = motion.create(Box);

const AgentTaskPanel: React.FC<AgentTaskPanelProps> = ({
  title = "Agent Dialog",
  onTaskSelect
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  // Track newly added tasks for animation
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const tasksRef = useRef<any[]>([]);  // Reference to track tasks between renders
  const pendingTasksRef = useRef<Set<string>>(new Set());  // Track tasks waiting to be added

  // Maximum number of tasks to display
  const MAX_TASKS = 20;

  // Poll interval for fallback task fetching (in ms)
  const POLL_INTERVAL = 10000;
  const lastFetchRef = useRef<number>(0);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep tasksRef in sync with tasks state
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Function to process a new task with retry logic
  const processNewTask = (taskData: any, maxRetries = 3) => {
    console.log('Processing new task:', taskData.id);

    // Add to pending set to track
    pendingTasksRef.current.add(taskData.id);

    const attemptUpdate = (retryCount = 0) => {
      // If task is already in our list, don't add again
      if (tasksRef.current.some(task => task.id === taskData.id)) {
        console.log('Task already in state, skipping update');
        pendingTasksRef.current.delete(taskData.id);
        return;
      }

      console.log(`Attempting to add task (try ${retryCount + 1}/${maxRetries + 1})`);

      // Update the state
      setTasks(prevTasks => {
        const newTasks = [taskData, ...prevTasks].slice(0, MAX_TASKS);

        // Schedule verification
        setTimeout(() => {
          // Verify the task was actually added to state
          if (!tasksRef.current.some(task => task.id === taskData.id)) {
            if (retryCount < maxRetries) {
              console.log(`Task ${taskData.id} not found in state, retrying...`);
              attemptUpdate(retryCount + 1);
            } else {
              console.error(`Failed to add task ${taskData.id} after ${maxRetries + 1} attempts`);
              // As a last resort, trigger a fresh fetch
              fetchRecentTasks();
              pendingTasksRef.current.delete(taskData.id);
            }
          } else {
            console.log(`Task ${taskData.id} successfully added to state`);
            pendingTasksRef.current.delete(taskData.id);
          }
        }, 100); // Short delay to allow for state update

        return newTasks;
      });

      // Mark this task as new for animation
      setNewTaskIds(prev => {
        const updated = new Set(prev);
        updated.add(taskData.id);
        // Clear this new flag after 3 seconds
        setTimeout(() => {
          setNewTaskIds(current => {
            const next = new Set(current);
            next.delete(taskData.id);
            return next;
          });
        }, 3000);
        return updated;
      });
    };

    // Start the first attempt
    attemptUpdate();
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.token) return;

    // Initial fetch of recent tasks
    fetchRecentTasks();
    lastFetchRef.current = Date.now();

    // Setup polling as a fallback
    pollingTimerRef.current = setInterval(() => {
      // If it's been too long since our last successful fetch or we have pending tasks
      const timeSinceLastFetch = Date.now() - lastFetchRef.current;
      if (timeSinceLastFetch > POLL_INTERVAL || pendingTasksRef.current.size > 0) {
        console.log('Polling for tasks as fallback mechanism');
        fetchRecentTasks();
      }
    }, POLL_INTERVAL);

    // Get roomId from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');

    if (roomId) {
      console.log(`Task panel connecting to room: ${roomId}`);
      setupSocket(roomId);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
      disconnectSocket();
    };
  }, [isAuthenticated, user]);

  // Socket setup with reconnection
  const setupSocket = (roomId: string) => {
    if (socketRef.current) {
      disconnectSocket();
    }

    // Connect to Socket.IO with task panel flag
    const socket = io(window.location.hostname, {
      path: '/socket.io/',
      auth: {
        token: user?.token,
        roomId: roomId,
        isTaskPanel: true // Flag to identify this as a task panel connection
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Task panel socket connected successfully');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // On connection error, we'll fall back to polling
      lastFetchRef.current = 0; // Force a poll on next interval
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      // Refresh tasks after reconnect to ensure we didn't miss any
      fetchRecentTasks();
    });

    // Listen for task_created events
    socket.on('task_created', (taskData) => {
      console.log('Received new task in panel:', taskData);
      processNewTask(taskData);
    });
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      console.log('Disconnecting task panel socket');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const fetchRecentTasks = async () => {
    try {
      console.log('Fetching recent tasks');
      const res = await fetch(`/api/task/get_recent_task`);
      if (!res.ok) throw new Error("Failed to fetch recent tasks");
      const data = await res.json();
      console.log('Received recent tasks:', data);

      // Limit initial tasks to MAX_TASKS
      const initialTasks = Array.isArray(data.tasks) ? data.tasks : Array.isArray(data) ? data : [];

      // Update state and remember when we last fetched successfully
      setTasks(initialTasks.slice(0, MAX_TASKS));
      lastFetchRef.current = Date.now();
    } catch (error) {
      console.error('Error fetching recent tasks:', error);
    }
  };

  // Debug effect to verify state updates
  useEffect(() => {
    console.log('Tasks state updated:', tasks.length, 'tasks');
  }, [tasks]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MotionBox
      width="100%"
      height="100%"
      bg="white"
      boxShadow="md"
      borderRadius="md"
      overflowY="auto"
      p={4}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{
        duration: 0.7,
        x: { type: "spring", stiffness: 300, damping: 30 }
      }}
    >
      <Text fontSize="xl" fontWeight="bold" mb={4} textAlign="left">
        {title} {tasks.length > 0 && <Text as="span" fontSize="md" color="gray.500">({tasks.length})</Text>}
      </Text>

      <VStack
        align="stretch"
        height="calc(100% - 70px)"
        spacing={2.5}  // Consistent, slightly reduced spacing
        position="relative"
        overflowY="auto"
        css={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '24px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '24px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(0,0,0,0.25)',
          },
          // Ensure proper padding at bottom of scroll area
          paddingBottom: '12px',
          // Improve scroll performance
          willChange: 'transform',
          transform: 'translateZ(0)'
        }}
      >
        <AnimatePresence initial={false}>
          {tasks.map((item) => (
            <TaskBox
              key={item.id}
              item={item}
              onClick={() => onTaskSelect(item)}
              isNew={newTaskIds.has(item.id)}
            />
          ))}
        </AnimatePresence>
      </VStack>
    </MotionBox>
  );
};

export default AgentTaskPanel;