import React, { useState, useRef, useEffect } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context';
import { handleDragStart } from '@/utilities/left_drag';
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
  initialWidth = "25%",
  minWidth = "200px",
  maxWidth = "50%"
}) => {
  const { isAuthenticated } = useAuth();
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Convert percentage to pixels for initial width
  useEffect(() => {
    if (initialWidth.includes('%') && panelRef.current) {
      const percentage = parseFloat(initialWidth) / 100;
      const pixelWidth = window.innerWidth * percentage;
      setWidth(`${pixelWidth}px`);
    }
  }, [initialWidth]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (initialWidth.includes('%') && panelRef.current) {
        const percentage = parseFloat(initialWidth) / 100;
        const pixelWidth = window.innerWidth * percentage;
        setWidth(`${pixelWidth}px`);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialWidth]);

  return (
    <MotionBox
      ref={panelRef}
      position="fixed"
      top={navbarHeight}
      right="0"
      width={width}
      height={`calc(100vh - ${navbarHeight} - ${bottomMargin})`}
      bg="white"
      boxShadow="-4px 0 10px rgba(0, 0, 0, 0.1)"
      zIndex={10}
      overflowY="auto"
      p={4}
      initial={{ x: "100%" }}
      animate={{ x: isAuthenticated ? 0 : "100%" }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <Box
        position="absolute"
        left="0"
        top="0"
        width="5px"
        height="100%"
        // cursor="ew-resize"
        // bg={isDragging ? "blue.400" : "transparent"}
        // _hover={{ bg: "blue.200" }}
        // onMouseDown={(e) => handleDragStart(e, setIsDragging, minWidth, maxWidth, setWidth)}
      />
      
      <Text fontSize="xl" fontWeight="bold" mb={4} textAlign="left">
        {title}
      </Text>
      
      <VStack align="stretch" height="calc(100% - 70px)">
        {data.slice(0, 15).map((item) => (
          <DialogBox key={item.id} item={item} />
        ))}
      </VStack>
    </MotionBox>
  );
};

export default AgentDialogPanel;