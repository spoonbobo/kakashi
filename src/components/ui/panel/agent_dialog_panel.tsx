import React from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context';
import { DialogBox } from '@/components/ui/box/dialog_box';

interface AgentDialogPanelProps {
  title?: string;
  data?: Array<{
    id: string;
    message: string;
  }>;
}

const MotionBox = motion(Box);

const AgentDialogPanel: React.FC<AgentDialogPanelProps> = ({ 
  title = "Agent Dialog", 
  data = Array(15).fill(null).map((_, i) => ({ id: i.toString(), message: `Row ${i + 1}` })),
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
      
      <VStack align="stretch" height="calc(100% - 70px)">
        {data.slice(0, 8).map((item) => (
          <DialogBox key={item.id} item={item} />
        ))}
      </VStack>
    </MotionBox>
  );
};

export default AgentDialogPanel;