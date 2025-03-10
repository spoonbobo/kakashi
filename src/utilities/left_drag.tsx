import { useState } from 'react';

export const handleDragStart = (e: React.MouseEvent, setIsDragging: (isDragging: boolean) => void, minWidth: string, maxWidth: string, setWidth: (width: string) => void) => {
    e.preventDefault();
    setIsDragging(true);
    
    const handleDrag = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      
      // Convert min and max to pixels if they're percentages
      const minWidthPx = minWidth.includes('%') 
        ? window.innerWidth * (parseFloat(minWidth) / 100) 
        : parseFloat(minWidth);
        
      const maxWidthPx = maxWidth.includes('%') 
        ? window.innerWidth * (parseFloat(maxWidth) / 100) 
        : parseFloat(maxWidth);
      
      if (newWidth >= minWidthPx && newWidth <= maxWidthPx) {
        setWidth(`${newWidth}px`);
      }
    };
    
    const handleDragEnd = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };