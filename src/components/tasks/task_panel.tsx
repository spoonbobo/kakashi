import React, { useEffect, useState, useRef } from 'react';
import { Box, VStack, Text, Flex, IconButton } from '@chakra-ui/react';
import { Tooltip } from "@/components/tooltip"
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/auth/context';
import { TaskBox } from '@/components/tasks/task_box';
import { FaSync } from 'react-icons/fa';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasksRef = useRef<any[]>([]);  // Reference to track tasks between renders
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Maximum number of tasks to display
  const MAX_TASKS = 20;

  // Poll interval for task fetching (in ms)
  const POLL_INTERVAL = 10000;
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownTaskIdRef = useRef<string | null>(null);

  // Keep tasksRef in sync with tasks state
  useEffect(() => {
    tasksRef.current = tasks;
    // Update the last known task ID when tasks change
    if (tasks.length > 0) {
      lastKnownTaskIdRef.current = tasks[0].id;
    }
  }, [tasks]);

  // Process new tasks and handle animations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processNewTasks = (newTasksData: any[]) => {
    if (!newTasksData.length) return;

    // Find tasks that aren't already in our list
    const existingTaskIds = new Set(tasksRef.current.map(t => t.id));
    const actuallyNewTasks = newTasksData.filter(task => !existingTaskIds.has(task.id));

    if (actuallyNewTasks.length === 0) return;

    console.log(`Processing ${actuallyNewTasks.length} new tasks`);

    // Update the tasks state with new tasks at the top
    setTasks(prevTasks => {
      const combinedTasks = [...actuallyNewTasks, ...prevTasks];
      // Remove duplicates (keeping the first occurrence)
      const uniqueTasks = Array.from(
        new Map(combinedTasks.map(task => [task.id, task])).values()
      );
      return uniqueTasks.slice(0, MAX_TASKS);
    });

    // Mark these tasks as new for animation
    setNewTaskIds(prev => {
      const updated = new Set(prev);
      actuallyNewTasks.forEach(task => updated.add(task.id));
      return updated;
    });

    // Clear the "new" flag after 3 seconds
    actuallyNewTasks.forEach(task => {
      setTimeout(() => {
        setNewTaskIds(current => {
          const next = new Set(current);
          next.delete(task.id);
          return next;
        });
      }, 3000);
    });
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.token) return;

    // Initial fetch of recent tasks
    fetchRecentTasks();

    // Setup polling for tasks
    pollingTimerRef.current = setInterval(() => {
      fetchRecentTasks(false);
    }, POLL_INTERVAL);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [isAuthenticated, user]);

  const fetchRecentTasks = async (showRefreshing = true) => {
    try {
      if (showRefreshing) setIsRefreshing(true);

      // Get roomId from URL if present

      // Construct the API URL based on whether we have a roomId
      let apiUrl = '/api/task/get_recent_tasks';

      // Add since parameter if we have a last known task ID
      if (lastKnownTaskIdRef.current && !showRefreshing) {
        apiUrl += apiUrl.includes('?') ? '&' : '?';
        apiUrl += `since=${lastKnownTaskIdRef.current}`;
      }

      console.log(`Fetching tasks from: ${apiUrl}`);
      const res = await fetch(apiUrl);

      if (!res.ok) throw new Error("Failed to fetch tasks");

      const data = await res.json();
      const fetchedTasks = Array.isArray(data.tasks) ? data.tasks : Array.isArray(data) ? data : [];

      if (showRefreshing) {
        // Complete refresh - replace all tasks
        setTasks(fetchedTasks.slice(0, MAX_TASKS));
      } else {
        // Incremental update - only process new tasks
        processNewTasks(fetchedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      if (showRefreshing) setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchRecentTasks(true);
  };

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
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontSize="xl" fontWeight="bold" textAlign="left">
          {title} {tasks.length > 0 && <Text as="span" fontSize="md" color="gray.500">({tasks.length})</Text>}
        </Text>
        <Tooltip content="Refresh tasks">
          <IconButton
            aria-label="Refresh tasks"
            size="sm"
            loading={isRefreshing}
            onClick={handleRefresh}
            variant="ghost"
          >
            <FaSync />
          </IconButton>
        </Tooltip>
      </Flex>

      <VStack
        align="stretch"
        height="calc(100% - 70px)"
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