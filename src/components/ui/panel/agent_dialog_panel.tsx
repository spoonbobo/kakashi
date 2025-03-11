import React, { useState, useRef, useEffect } from 'react';
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
  navbarHeight?: string;
  bottomMargin?: string;
  initialWidth?: string;
  minWidth?: string;
  maxWidth?: string;
}

const MotionBox = motion(Box);

const AgentDialogPanel: React.FC<AgentDialogPanelProps> = ({ 
  title = "Agent Dialog", 
  data = Array(15).fill(null).map((_, i) => ({ id: i.toString(), message: `Row ${i + 1}` })),
}) => {
  const { isAuthenticated } = useAuth();

  return (
    <MotionBox
      width="100%"
      height="100%"
      bg="white"
      boxShadow="md"
      borderRadius="md"
      overflowY="auto"
      p={4}
      animate={{
        opacity: isAuthenticated ? 1 : 0,
      }}
      transition={{ 
        duration: 0.7,
        x: { type: "spring", stiffness: 300, damping: 30 }
      }}
    >
      <Box
        position="absolute"
        left="0"
        top="0"
        width="5px"
        height="100%"
      />
      
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