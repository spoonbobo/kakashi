import React, { useEffect, useState } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context';
import { TaskBox } from '@/components/ui/box/task_box';

interface AgentTaskPanelProps {
  title?: string;
  onTaskSelect: (task: any) => void;
}

const MotionBox = motion.create(Box);

const AgentTaskPanel: React.FC<AgentTaskPanelProps> = ({ 
  title = "Agent Dialog", 
  onTaskSelect
}) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const fetchRecentTasks = async () => {
    const res = await fetch(`/api/task/get_recent_task`);
    if (!res.ok) throw new Error("Failed to fetch recent tasks");
    const data = await res.json();
    setTasks(data.tasks || data);
  };

  useEffect(() => {
    fetchRecentTasks();
  }, []);
  
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
      
      <VStack align="stretch" height="calc(100% - 70px)">
        {tasks.map((item) => (
          <TaskBox key={item.id} item={item} onClick={() => onTaskSelect(item)} />
        ))}
      </VStack>
    </MotionBox>
  );
};

export default AgentTaskPanel;