
import React from 'react';
import { Box, VStack, Text, Badge, Flex,Progress } from '@chakra-ui/react';
import { Tooltip } from "@/components/ui/tooltip"
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context';

interface Task {
  id: string;
  task_executor: string;
  task_description: string;
  task_create_time: string;
  task_start_time: string;
  task_end_time: string;
  task_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  task_result: string;
}

interface TaskInspectorProps {
  title?: string;
  task?: Task;
}

const statusColorMap = {
  pending: 'gray',
  in_progress: 'blue',
  completed: 'green',
  failed: 'red'
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const TimelineItem = ({ label, date, color }: { label: string; date: string; color: string }) => (
  <Box position="relative" pl={6}>
    <Box
      position="absolute"
      left={0}
      top={0}
      w="2px"
      h="full"
      bg={color}
    />
    <Box
      position="absolute"
      left={-2}
      top={0}
      w={3}
      h={3}
      borderRadius="full"
      bg={color}
    />
    <Text fontSize="sm" fontWeight="medium" color="gray.600">{label}</Text>
    <Text fontSize="sm" color="gray.500">{formatDate(date)}</Text>
  </Box>
);

const TaskTimeline = ({ task }: { task: Task }) => {
  const totalDuration = task.task_end_time 
    ? new Date(task.task_end_time).getTime() - new Date(task.task_create_time).getTime()
    : 0;
  const progressDuration = task.task_start_time
    ? new Date(task.task_start_time).getTime() - new Date(task.task_create_time).getTime()
    : 0;
  const completedDuration = task.task_end_time
    ? new Date(task.task_end_time).getTime() - new Date(task.task_start_time || task.task_create_time).getTime()
    : 0;

  return (
    <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
      <Text fontSize="md" fontWeight="semibold" mb={4} color="gray.700">
        Timeline
      </Text>
      
      {/* Progress Bar - Updated to use correct Chakra UI v3 API */}
      <Box mb={6} position="relative">
        <Progress.Root size="sm" value={100} colorPalette="gray">
          <Progress.Track borderRadius="full">
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
        
        {task.task_start_time && (
          <Tooltip 
            content={`Start Time: ${formatDate(task.task_start_time)}`}
            positioning={{ placement: "top" }}
          >
            <Box
              position="absolute"
              left={`${(progressDuration / totalDuration) * 100}%`}
              top="0"
              w="2px"
              h="100%"
              bg="blue.500"
              zIndex="1"
              cursor="pointer"
            />
          </Tooltip>
        )}
        {task.task_end_time && (
          <Tooltip 
            content={`End Time: ${formatDate(task.task_end_time)}`}
            positioning={{ placement: "top" }}
            showArrow
          >
            <Box
              position="absolute"
              left={`${((progressDuration + completedDuration) / totalDuration) * 100}%`}
              top="0"
              w="2px"
              h="100%"
              bg="green.500"
              zIndex="1"
              cursor="pointer"
            />
          </Tooltip>
        )}
      </Box>

      {/* Timeline Items */}
      <VStack align="stretch">
        <TimelineItem label="Created At" date={task.task_create_time} color="gray.400" />
        {task.task_start_time && (
          <TimelineItem label="Start Time" date={task.task_start_time} color="blue.400" />
        )}
        {task.task_end_time && (
          <TimelineItem label="End Time" date={task.task_end_time} color="green.400" />
        )}
      </VStack>
    </Box>
  );
};

const TaskDetails: React.FC<{ task: Task }> = ({ task }) => (
  <VStack align="stretch"  p={6} bg="gray.50" borderRadius="xl">
    {/* Header Section */}
    <Flex 
      justify="space-between" 
      align="center" 
      bg="white" 
      p={6} 
      borderRadius="xl" 
      boxShadow="sm"
      borderLeftWidth="4px"
      borderLeftColor={statusColorMap[task.task_status]}
    >
      <VStack align="start">
        <Text fontSize="xl" fontWeight="bold" color="gray.800">{task.task_executor}</Text>
        <Text fontSize="sm" color="gray.500">Task ID: {task.id}</Text>
      </VStack>
      <Badge 
        colorScheme={statusColorMap[task.task_status]}
        px={4}
        py={2}
        borderRadius="full"
        textTransform="capitalize"
        fontSize="sm"
        fontWeight="bold"
      >
        {task.task_status.replace('_', ' ')}
      </Badge>
    </Flex>

    {/* Main Content */}
    <VStack align="stretch">
      {/* Description Card */}
      <Box 
        bg="white" 
        p={6} 
        borderRadius="xl" 
        boxShadow="sm"
        position="relative"
      >
        <Text 
          fontSize="md" 
          fontWeight="semibold" 
          mb={4}
          color="gray.700"
        >
          Task Description
        </Text>
        <Text 
          color="gray.600" 
          lineHeight="tall"
          whiteSpace="pre-wrap"
        >
          {task.task_description}
        </Text>
      </Box>

      {/* Result Card */}
      <Box 
        bg="white" 
        p={6} 
        borderRadius="xl" 
        boxShadow="sm"
      >
        <Text 
          fontSize="md" 
          fontWeight="semibold" 
          mb={4}
          color="gray.700"
        >
          Task Result
        </Text>
        <Badge 
          colorScheme="purple" 
          px={4} 
          py={2}
          borderRadius="md"
          fontSize="sm"
          fontWeight="bold"
        >
          {task.task_result}
        </Badge>
      </Box>

      {/* Timeline Section */}
      <TaskTimeline task={task} />
    </VStack>
  </VStack>
);

const MotionBox = motion(Box);

const TaskInspector: React.FC<TaskInspectorProps> = ({ 
  title = "Task Inspector", 
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
        <TaskDetails task={task} />
      ) : (
        <Box textAlign="center" py={8}>
          <Text fontSize="lg" color="gray.500">Select a task to view details</Text>
        </Box>
      )}
    </MotionBox>
  );
};

export default TaskInspector;