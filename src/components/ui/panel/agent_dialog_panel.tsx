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
  navbarHeight = "80px",
  bottomMargin = "40px",
}) => {
  const { isAuthenticated } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <MotionBox
      ref={panelRef}
      position="relative"
      width="100%"
      height={`calc(100vh - ${navbarHeight} - ${bottomMargin})`}
      bg="white"
      boxShadow="md"
      borderRadius="md"
      zIndex={10}
      overflowY="auto"
      p={4}
      initial={{ opacity: 0, x: "-100%", scale: 0.9 }}
      animate={{ 
        opacity: isAuthenticated ? 1 : 0, 
      }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: 0.7,
        x: { type: "spring", stiffness: 300, damping: 30 }
      }}
      mr={0}
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