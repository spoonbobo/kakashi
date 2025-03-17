import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/auth/context';
import { TaskBox } from '@/components/box/task_box';

interface Task {
  id: string;
  task_executor: string;
  task_description: string;
  task_create_time: Date;
  task_status: string;
  task_result: string | null;
}

interface AgentTaskPanelProps {
  title?: string;
  onTaskSelect: (task: Task) => void;
}

const MotionBox = motion.create(Box);

// Constants moved outside component to prevent recreation
const MAX_TASKS = 20;
const ACTIVE_POLL_INTERVAL = 2000;
const INACTIVE_POLL_INTERVAL = 10000;
const ACTIVITY_TIMEOUT = 60000;
const ANIMATION_DURATION = 3000;

const AgentTaskPanel: React.FC<AgentTaskPanelProps> = ({
  title = "Agent Dialog",
  onTaskSelect
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const [lastTaskId, setLastTaskId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const { isAuthenticated, user } = useAuth();

  // Refs for tracking state between renders
  const tasksRef = useRef<Task[]>([]);
  const lastFetchRef = useRef<number>(0);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const currentPollIntervalRef = useRef<number>(ACTIVE_POLL_INTERVAL);
  const isMountedRef = useRef(true);

  // Keep tasksRef in sync with tasks state
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

  // Memoized function to process a new task
  const processNewTask = useCallback((taskData: Task) => {
    if (!isMountedRef.current) return;

    // If task is already in our list, don't add again
    if (tasksRef.current.some(task => task.id === taskData.id)) {
      return;
    }

    // Update the state
    setTasks(prevTasks => {
      const newTasks = [taskData, ...prevTasks].slice(0, MAX_TASKS);
      return newTasks;
    });

    // Mark this task as new for animation
    setNewTaskIds(prev => {
      const updated = new Set(prev);
      updated.add(taskData.id);
      return updated;
    });

    // Clear animation flag after delay
    setTimeout(() => {
      if (isMountedRef.current) {
        setNewTaskIds(current => {
          const next = new Set(current);
          next.delete(taskData.id);
          return next;
        });
      }
    }, ANIMATION_DURATION);
  }, []);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen for user activity events
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, []);

  // Fetch tasks function with debouncing
  const fetchRecentTasks = useCallback(async () => {
    if (isPolling || !isMountedRef.current) return;

    try {
      setIsPolling(true);

      // Use the last task ID to only fetch newer tasks
      const url = lastTaskId
        ? `/api/task/get_recent_task?after=${lastTaskId}`
        : `/api/task/get_recent_task`;

      const res = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!isMountedRef.current) return;

      if (res.status === 304) {
        // No new content
        lastFetchRef.current = Date.now();
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch recent tasks");

      const data = await res.json();
      const newTasks = Array.isArray(data.tasks) ? data.tasks : Array.isArray(data) ? data : [];

      if (!isMountedRef.current) return;

      if (newTasks.length > 0) {
        // Update last task ID for future fetches
        setLastTaskId(newTasks[0].id);

        // Merge new tasks with existing ones, removing duplicates
        setTasks(prevTasks => {
          const taskMap = new Map();

          // Add new tasks first (so they take precedence)
          newTasks.forEach(task => {
            if (!taskMap.has(task.id)) {
              taskMap.set(task.id, task);
            }
          });

          // Then add existing tasks
          prevTasks.forEach(task => {
            if (!taskMap.has(task.id)) {
              taskMap.set(task.id, task);
            }
          });

          // Convert back to array and limit to MAX_TASKS
          return Array.from(taskMap.values()).slice(0, MAX_TASKS);
        });

        // Mark new tasks for animation
        newTasks.forEach(task => {
          if (isMountedRef.current) {
            setNewTaskIds(prev => {
              const updated = new Set(prev);
              updated.add(task.id);
              return updated;
            });

            // Clear animation flag after delay
            setTimeout(() => {
              if (isMountedRef.current) {
                setNewTaskIds(current => {
                  const next = new Set(current);
                  next.delete(task.id);
                  return next;
                });
              }
            }, ANIMATION_DURATION);
          }
        });
      }

      lastFetchRef.current = Date.now();
    } catch (error) {
      console.error('Error fetching recent tasks:', error);
    } finally {
      if (isMountedRef.current) {
        setIsPolling(false);
      }
    }
  }, [isPolling, lastTaskId]);

  // Efficient polling with dynamic interval based on user activity
  useEffect(() => {
    if (!isAuthenticated || !user?.token) return;

    // Initial fetch of recent tasks
    fetchRecentTasks();
    lastFetchRef.current = Date.now();
    lastActivityRef.current = Date.now();

    // Function to determine polling interval based on user activity
    const getPollingInterval = () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      return timeSinceActivity > ACTIVITY_TIMEOUT ? INACTIVE_POLL_INTERVAL : ACTIVE_POLL_INTERVAL;
    };

    // Setup polling with dynamic interval
    const setupPolling = () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }

      const pollInterval = getPollingInterval();
      currentPollIntervalRef.current = pollInterval;

      pollingTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          fetchRecentTasks();
          setupPolling(); // Recursively setup next poll with potentially different interval
        }
      }, pollInterval);
    };

    setupPolling();

    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, [isAuthenticated, user, fetchRecentTasks]);

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
        spacing={2.5}
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
          paddingBottom: '12px',
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

export default React.memo(AgentTaskPanel);