import { useEffect, useState } from 'react';

export const getStatusColorProps = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'successful':
      return {
        colorScheme: 'green',
        bg: 'green.100',
        color: 'green.700'
      };
    case 'pending':
    case 'approved':
      return {
        colorScheme: 'yellow',
        bg: 'yellow.100',
        color: 'yellow.700'
      };
    case 'running':
      return {
        colorScheme: 'blue',
        bg: 'blue.100',
        color: 'blue.700'
      };
    case 'denied':
    case 'failed':
      return {
        colorScheme: 'red',
        bg: 'red.100',
        color: 'red.700'
      };
    default:
      return {
        colorScheme: 'gray',
        bg: 'gray.100',
        color: 'gray.700'
      };
  }
};

// Hook to track task status updates from session storage
export const useTaskStatusUpdates = () => {
  const [statusUpdates, setStatusUpdates] = useState<Record<string, { status: string, timestamp: number }>>({});

  useEffect(() => {
    try {
      const storedUpdates = JSON.parse(sessionStorage.getItem('taskStatusUpdates') || '{}');
      setStatusUpdates(storedUpdates);
    } catch (e) {
      console.error("Error retrieving task status updates:", e);
    }

    const handleTaskStatusUpdate = (event: CustomEvent) => {
      const { taskId, newStatus, timestamp } = event.detail;
      
      setStatusUpdates(prev => {
        const updated = { 
          ...prev, 
          [taskId]: { status: newStatus, timestamp: timestamp || Date.now() } 
        };
        
        // Store in session storage
        try {
          sessionStorage.setItem('taskStatusUpdates', JSON.stringify(updated));
        } catch (e) {
          console.error("Error storing task updates:", e);
        }
        
        return updated;
      });
    };

    window.addEventListener('taskStatusUpdated', handleTaskStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('taskStatusUpdated', handleTaskStatusUpdate as EventListener);
    };
  }, []);

  return statusUpdates;
};