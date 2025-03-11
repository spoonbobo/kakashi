import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context';

interface ResizableLayoutProps {
  leftComponent: React.ReactNode;
  rightComponent: React.ReactNode;
  initialLeftWidth?: string;
  minLeftWidth?: string;
  minRightWidth?: string;
}

// Create motion components
const MotionBox = motion(Box);

export const ResizableLayoutV: React.FC<ResizableLayoutProps> = ({
  leftComponent,
  rightComponent,
  initialLeftWidth = '75%',
  minLeftWidth = '20%',
  minRightWidth = '20%',
}) => {
  const [leftWidth, setLeftWidth] = useState(parseInt(initialLeftWidth, 10));
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const { isAuthenticated } = useAuth();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = leftWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  }, [leftWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - startX.current;
    const deltaPercent = (deltaX / containerWidth) * 100;
    const newLeftWidth = startWidth.current + deltaPercent;

    const minLeft = parseInt(minLeftWidth, 10);
    const minRight = parseInt(minRightWidth, 10);

    if (newLeftWidth >= minLeft && (100 - newLeftWidth) >= minRight) {
      setLeftWidth(newLeftWidth);
    }
  }, [minLeftWidth, minRightWidth]);

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
    >
      <MotionBox
        width={`${leftWidth}%`}
        height="100%"
        overflow="auto"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {leftComponent}
      </MotionBox>

      <Box
        width="4px"
        height="100%"
        cursor="ew-resize"
        position="relative"
        onMouseDown={handleMouseDown}
        _hover={{ bg: 'rgba(0, 0, 0, 0.1)' }}
        _active={{ bg: 'rgba(0, 0, 0, 0.2)' }}
        _before={{
          content: '""',
          position: 'absolute',
          left: '-2px',
          width: '8px',
          height: '100%',
          cursor: 'ew-resize',
        }}
      />

      <MotionBox
        width={`${100 - leftWidth}%`}
        height="100%"
        overflow="auto"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {rightComponent}
      </MotionBox>
    </Flex>
  );
};

export default ResizableLayoutV;