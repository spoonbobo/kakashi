import { useEffect, useState } from 'react';

// Function to get color props based on status
export const getStatusColorProps = (status: string) => {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'completed':
    case 'successful':
    case 'approved':
      return { 
        colorScheme: 'green',
        bg: 'green.100',
        color: 'green.700'
      };
    case 'pending':
      return { 
        colorScheme: 'yellow',
        bg: 'yellow.100',
        color: 'yellow.700'
      };
    case 'denied':
    case 'failed':
      return { 
        colorScheme: 'red',
        bg: 'red.100',
        color: 'red.700'
      };
    case 'running':
      return { 
        colorScheme: 'blue',
        bg: 'blue.100',
        color: 'blue.700'
      };
    default:
      return { 
        colorScheme: 'gray',
        bg: 'gray.100',
        color: 'gray.700'
      };
  }
};

// Custom hook to listen for task status updates
export const useTaskStatusUpdates = (taskIds: string[] = []) => {
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Load initial statuses from sessionStorage
    try {
      const storedUpdates = JSON.parse(sessionStorage.getItem('taskStatusUpdates') || '{}');
      const initialStatuses: Record<string, string> = {};
      
      // If specific taskIds were provided, only load those
      if (taskIds.length > 0) {
        taskIds.forEach(id => {
          if (storedUpdates[id]) {
            initialStatuses[id] = storedUpdates[id].status;
          }
        });
      } else {
        // Otherwise load all stored statuses
        Object.keys(storedUpdates).forEach(id => {
          initialStatuses[id] = storedUpdates[id].status;
        });
      }
      
      if (Object.keys(initialStatuses).length > 0) {
        setTaskStatuses(initialStatuses);
      }
    } catch (e) {
      console.error("Error loading task statuses from sessionStorage:", e);
    }
    
    // Listen for status update events
    const handleTaskStatusUpdate = (event: CustomEvent) => {
      const { taskId, newStatus } = event.detail;
      
      // If we're tracking specific taskIds and this one isn't in the list, ignore it
      if (taskIds.length > 0 && !taskIds.includes(taskId)) {
        return;
      }
      
      setTaskStatuses(prev => ({
        ...prev,
        [taskId]: newStatus
      }));
    };
    
    // Add event listener
    window.addEventListener('taskStatusUpdated', handleTaskStatusUpdate as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('taskStatusUpdated', handleTaskStatusUpdate as EventListener);
    };
  }, [taskIds.join(',')]); // Dependency on taskIds as a string to avoid reference changes
  
  return taskStatuses;
}; 