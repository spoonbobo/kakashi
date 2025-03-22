import React, { useEffect, useState, useRef } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/auth/context';
import { TaskBox } from '@/components/task/task_box';
import TaskStatusBadge from './task_status_badge';
import { useTranslation } from 'react-i18next';

interface AgentTaskPanelProps {
  title?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTaskSelect: (task: any) => void;
  hideTitle?: boolean;
  hideRefresh?: boolean;
  transparent?: boolean;
}

const MotionBox = motion.create(Box);

const AgentTaskPanel: React.FC<AgentTaskPanelProps> = ({
  onTaskSelect,
  transparent = false
}) => {
  // @eslint-disable-next-line @typescript-eslint/no-any
  const [tasks, setTasks] = useState<any[]>([]);
  // Track newly added tasks for animation
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const { isAuthenticated, user, authChecked } = useAuth();
  // @eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Add a debounce function to prevent too many refreshes
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Modify the task status update listener to use debounce
  useEffect(() => {
    const handleTaskStatusUpdate = (event: CustomEvent) => {
      const { taskId, newStatus } = event.detail;
      console.log(`[TaskPanel] Task status update received: ${taskId} -> ${newStatus}`);

      // Immediately update task in the list
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    };

    // Debounced refresh function to prevent too many API calls
    const debouncedRefresh = debounce(() => {
      console.log("[TaskPanel] Debounced refresh triggered");
      fetchRecentTasks(false);
    }, 2000); // 2 second debounce

    // Add event listeners
    window.addEventListener('taskStatusUpdated', handleTaskStatusUpdate as EventListener);
    window.addEventListener('taskPanelRefresh', debouncedRefresh as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('taskStatusUpdated', handleTaskStatusUpdate as EventListener);
      window.removeEventListener('taskPanelRefresh', debouncedRefresh as EventListener);
    };
  }, []);

  // Add an effect to check session storage on component mount
  useEffect(() => {
    if (!isAuthenticated) return;

    try {
      const storedUpdates = JSON.parse(sessionStorage.getItem('taskStatusUpdates') || '{}');
      if (Object.keys(storedUpdates).length > 0) {
        console.log("[TaskPanel] Found stored task updates, applying to current task list");

        // Apply stored updates to current tasks
        setTasks(prevTasks =>
          prevTasks.map(task => {
            if (storedUpdates[task.id]) {
              return { ...task, status: storedUpdates[task.id].status };
            }
            return task;
          })
        );
      }
    } catch (e) {
      console.error("Error applying stored task updates:", e);
    }
  }, [isAuthenticated]);

  if (authChecked && !isAuthenticated) {
    return (
      <Box p={4} textAlign="center" borderRadius="md" bg="gray.50" my={4}>
        <Text fontWeight="medium" color="gray.700">Please log in to view tasks</Text>
        <Text fontSize="sm" color="gray.500" mt={1}>
          Your session may have expired or you&apos;ve been logged out
        </Text>
      </Box>
    );
  }

  return (
    <MotionBox
      width="100%"
      height="100%"
      bg={transparent ? "transparent" : "white"}
      boxShadow="none"
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
      <VStack
        align="stretch"
        height="100%"
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
              forceTimeUnderStatus={true}
              preventTextTrimming={true}
              statusBadge={<TaskStatusBadge status={item.status} size="sm" />}
            />
          ))}
        </AnimatePresence>
      </VStack>
    </MotionBox>
  );
};

export default AgentTaskPanel;