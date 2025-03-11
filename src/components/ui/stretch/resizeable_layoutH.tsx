import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context';

interface ResizableLayoutProps {
  topComponent: React.ReactNode;
  bottomComponent: React.ReactNode;
  initialTopHeight?: string;
  minTopHeight?: string;
  minBottomHeight?: string;
}

const MotionBox = motion(Box);

export const ResizableLayoutH: React.FC<ResizableLayoutProps> = ({
  topComponent,
  bottomComponent,
  initialTopHeight = '70%',
  minTopHeight = '60%',
  minBottomHeight = '20%',
}) => {
  const [topHeight, setTopHeight] = useState(parseInt(initialTopHeight, 10));
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const { isAuthenticated } = useAuth();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = topHeight;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
  }, [topHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const containerHeight = containerRef.current.offsetHeight;
    const deltaY = e.clientY - startY.current;
    const deltaPercent = (deltaY / containerHeight) * 100;
    const newTopHeight = startHeight.current + deltaPercent;

    const minTop = parseInt(minTopHeight, 10);
    const minBottom = parseInt(minBottomHeight, 10);

    if (newTopHeight >= minTop && (100 - newTopHeight) >= minBottom) {
      setTopHeight(newTopHeight);
    }
  }, [minTopHeight, minBottomHeight]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Flex 
      ref={containerRef}
      width="100%"
      height="100%"
      position="relative"
      overflow="hidden"
      flexDirection="column"
    >
      <MotionBox
        width="100%"
        height={`${topHeight}%`}
        overflow="auto"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {topComponent}
      </MotionBox>

      <Box
        width="100%"
        height="4px"
        cursor="ns-resize"
        position="relative"
        onMouseDown={handleMouseDown}
        _hover={{ bg: 'rgba(0, 0, 0, 0.1)' }}
        _active={{ bg: 'rgba(0, 0, 0, 0.2)' }}
        _before={{
          content: '""',
          position: 'absolute',
          top: '-2px',
          width: '100%',
          height: '8px',
          cursor: 'ns-resize',
        }}
      />

      <MotionBox
        width="100%"
        height={`${100 - topHeight}%`}
        overflow="auto"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {bottomComponent}
      </MotionBox>
    </Flex>
  );
};

export default ResizableLayoutH;
