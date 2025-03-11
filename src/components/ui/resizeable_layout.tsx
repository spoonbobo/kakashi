import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Flex, } from '@chakra-ui/react';
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

export const ResizableLayout: React.FC<ResizableLayoutProps> = ({
  leftComponent,
  rightComponent,
  initialLeftWidth = '25%',
  minLeftWidth = '20%',
  minRightWidth = '20%',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [leftWidthPercent, setLeftWidthPercent] = useState(
    parseInt(initialLeftWidth, 10) || 50
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startLeftWidthRef = useRef<number>(0);

  const { isAuthenticated } = useAuth();
  // Handle mouse down on the divider
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isAuthenticated) return;
    
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startLeftWidthRef.current = leftWidthPercent;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [leftWidthPercent, isAuthenticated]);

  // Handle mouse move during drag with increased sensitivity
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - startXRef.current;
    
    // Increase sensitivity by multiplying deltaX by a factor (1.5)
    const sensitivityFactor = 1.5;
    const adjustedDeltaX = deltaX * sensitivityFactor;
    
    const deltaPercent = (adjustedDeltaX / containerWidth) * 100;
    const newLeftWidth = startLeftWidthRef.current + deltaPercent;
    
    // Calculate constraints based on min widths
    const minLeftPercent = parseInt(minLeftWidth, 10);
    const minRightPercent = parseInt(minRightWidth, 10);
    
    // Apply constraints
    if (newLeftWidth >= minLeftPercent && (100 - newLeftWidth) >= minRightPercent) {
      setLeftWidthPercent(newLeftWidth);
    }
  }, [minLeftWidth, minRightWidth]);

  // Handle mouse up at end of drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <Flex 
      width="100%" 
      height="100%" 
      position="relative" 
      ref={containerRef}
    >
      <MotionBox 
        height="100%" 
        width={`${leftWidthPercent}%`} 
        overflowY="auto"
        layout
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      >
        {leftComponent}
      </MotionBox>
      
      {isAuthenticated && (
        <MotionBox
          ref={dividerRef}
          width="4px"  // Thinner divider
          cursor="ew-resize"
          height="100%"
          zIndex={10}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          animate={{
            backgroundColor: isDragging 
              ? "rgba(0, 0, 0, 0.2)" 
              : isHovering 
                ? "rgba(0, 0, 0, 0.1)" 
                : "rgba(0, 0, 0, 0.05)"
          }}
          transition={{
            backgroundColor: { duration: 0.2 }
          }}
          _before={{
            content: '""',
            position: "absolute",
            left: "-2px",
            width: "8px",
            height: "100%",
            cursor: "ew-resize",
            backgroundColor: "transparent",
          }}
        />
      )}
      
      <MotionBox 
        height="100%" 
        width={`${100 - leftWidthPercent}%`} 
        overflowY="auto"
        layout
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      >
        {rightComponent}
      </MotionBox>
    </Flex>
  );
};

export default ResizableLayout;