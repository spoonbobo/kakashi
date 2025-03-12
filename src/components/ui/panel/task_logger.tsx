import React from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context';

interface TaskLoggerProps {
  title?: string;
  task?: {
    id: string;
    task_executor: string;
    task_description: string;
    task_create_time: string;
    task_start_time: string;
    task_end_time: string;
    task_status: string;
    task_result: string;
  };
}

const MotionBox = motion(Box);

const TaskLogger: React.FC<TaskLoggerProps> = ({ 
  title = "Task Logger", 
  task 
}) => {
  const { isAuthenticated } = useAuth();

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
        {title}
      </Text>
      
      {task ? (
        <VStack align="stretch">
          <Text><strong>Executor:</strong> {task.task_executor}</Text>
          <Text><strong>Description:</strong> {task.task_description}</Text>
          <Text><strong>Status:</strong> {task.task_status}</Text>
          <Text><strong>Result:</strong> {task.task_result}</Text>
          <Text><strong>Created At:</strong> {new Date(task.task_create_time).toLocaleString()}</Text>
          {task.task_start_time && <Text><strong>Start Time:</strong> {new Date(task.task_start_time).toLocaleString()}</Text>}
          {task.task_end_time && <Text><strong>End Time:</strong> {new Date(task.task_end_time).toLocaleString()}</Text>}
        </VStack>
      ) : (
        <Text>No task selected.</Text>
      )}
    </MotionBox>
  );
};

export default TaskLogger;