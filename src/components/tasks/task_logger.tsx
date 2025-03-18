"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, Flex, Input, Tabs, IconButton, Icon } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { Tooltip } from "@/components/tooltip";
import { ToastContainer, toast, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface TaskLoggerProps {
  title?: string;
  task?: {
    id: string;
    name: string;
    description: string;
    created_at: string;
    start_time: string;
    end_time: string;
    status: string;
    result: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools_called: any;
  };
  onApprove?: (taskId: string, editedToolCalls: any[]) => void;
  onDeny?: (taskId: string, editedToolCalls: any[]) => void;
}

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

const TaskLogger: React.FC<TaskLoggerProps> = ({
  task,
  onApprove,
  onDeny
}) => {
  const { isAuthenticated } = useAuth();
  const [priority, setPriority] = useState("High");
  const [timeout, setTimeout] = useState("30");
  const [maxRetries, setMaxRetries] = useState("3");
  const [toolName, setToolName] = useState("file_search");
  const [query, setQuery] = useState("user_data.json");
  const [activeTab, setActiveTab] = useState("details");
  // New state to track edited tool calls
  const [editedToolCalls, setEditedToolCalls] = useState<any[]>([]);
  // Add a state to track task status
  const [taskStatus, setTaskStatus] = useState<{ [key: string]: 'approved' | 'denied' | null }>({});
  // Add a new state for animation
  const [actionAnimation, setActionAnimation] = useState<'none' | 'approve' | 'deny'>('none');
  // Add local task state to update UI immediately
  const [localTask, setLocalTask] = useState(task);

  // Global task status update function
  const broadcastTaskStatusUpdate = useCallback((taskId: string, newStatus: string) => {
    // Create a custom event to notify other components
    const taskUpdateEvent = new CustomEvent('taskStatusUpdated', {
      detail: {
        taskId: taskId,
        newStatus: newStatus,
        timestamp: Date.now() // Add a timestamp for versioning
      }
    });

    // Dispatch the event globally
    window.dispatchEvent(taskUpdateEvent);

    // Also store in sessionStorage for persistence across navigation
    try {
      const storedUpdates = JSON.parse(sessionStorage.getItem('taskStatusUpdates') || '{}');
      storedUpdates[taskId] = {
        status: newStatus,
        timestamp: Date.now()
      };
      sessionStorage.setItem('taskStatusUpdates', JSON.stringify(storedUpdates));
    } catch (e) {
      console.error("Error storing task status in sessionStorage:", e);
    }

    console.log(`[TaskLogger] Broadcasting status update: ${taskId} -> ${newStatus}`);
  }, []);

  // Force reset all internal state when task changes
  useEffect(() => {
    // Reset all state variables to defaults
    setPriority("High");
    setTimeout("30");
    setMaxRetries("3");
    setToolName("file_search");
    setQuery("user_data.json");
    setActiveTab("details");

    // Initialize edited tool calls with the original values
    if (task?.tools_called) {
      console.log("task.tools_called", task.tools_called);
      // Check if tools_called has a nested tools_called array
      if (task.tools_called.tools_called && Array.isArray(task.tools_called.tools_called)) {
        setEditedToolCalls(JSON.parse(JSON.stringify(task.tools_called.tools_called)));
      } else {
        // Fallback to the original behavior if structure is different
        setEditedToolCalls(JSON.parse(JSON.stringify(task.tools_called)));
      }
    } else {
      setEditedToolCalls([]);
    }

    // Check sessionStorage for any stored status updates for this task
    try {
      if (task?.id) {
        const storedUpdates = JSON.parse(sessionStorage.getItem('taskStatusUpdates') || '{}');
        if (storedUpdates[task.id]) {
          console.log(`[TaskLogger] Found stored status for task ${task.id}: ${storedUpdates[task.id].status}`);
          // Update localTask with the stored status
          setLocalTask(prev => prev ? { ...prev, status: storedUpdates[task.id].status } : task);
          return; // Skip the rest of this effect
        }
      }
    } catch (e) {
      console.error("Error retrieving task status from sessionStorage:", e);
    }

    // If no stored status was found, just set localTask to the current task
    setLocalTask(task);

    // Force update the Tabs component by directly setting its value
    const tabsElement = document.querySelector('[role="tablist"]');
    if (tabsElement) {
      const detailsTabTrigger = tabsElement.querySelector('[value="details"]');
      if (detailsTabTrigger) {
        (detailsTabTrigger as HTMLElement).click();
      }
    }
  }, [task]); // Watch the entire task object for changes

  // Handle argument changes
  const handleArgChange = (toolIndex: number, argKey: string, newValue: string) => {
    const updatedToolCalls = [...editedToolCalls];
    try {
      // Try to parse the value as JSON if it looks like a valid JSON
      if (newValue.trim().startsWith('{') || newValue.trim().startsWith('[')) {
        try {
          updatedToolCalls[toolIndex].args[argKey] = JSON.parse(newValue);
        } catch (e) {
          // If JSON parsing fails, store as string
          updatedToolCalls[toolIndex].args[argKey] = newValue;
        }
      } else {
        // For non-JSON looking strings, try to convert to numbers if applicable
        const numValue = Number(newValue);
        updatedToolCalls[toolIndex].args[argKey] = !isNaN(numValue) && newValue.trim() !== '' ?
          numValue : newValue;
      }
      setEditedToolCalls(updatedToolCalls);
    } catch (error) {
      console.error("Error updating argument:", error);
    }
  };

  // Improved task action handler with guarantees for cross-component updates
  const handleTaskAction = useCallback((taskObj, action: 'approve' | 'deny') => {
    if (!taskObj) return;

    console.log(`Task ${action}d:`, taskObj, "with edited tool calls:", editedToolCalls);
    const newStatus = action === 'approve' ? 'running' : 'denied';

    // Update task status in state immediately
    setTaskStatus(prev => ({
      ...prev,
      [taskObj.id]: action === 'approve' ? 'approved' : 'denied'
    }));

    // Update local task status for UI
    setLocalTask(prev => ({
      ...prev,
      status: newStatus
    }));

    // Trigger animation
    setActionAnimation(action);

    // Reset animation after it completes
    setTimeout(() => {
      setActionAnimation('none');
    }, 1500);

    // Store update in sessionStorage immediately for cross-component access
    try {
      const storedUpdates = JSON.parse(sessionStorage.getItem('taskStatusUpdates') || '{}');
      storedUpdates[taskObj.id] = {
        status: newStatus,
        timestamp: Date.now()
      };
      sessionStorage.setItem('taskStatusUpdates', JSON.stringify(storedUpdates));
      console.log(`[TaskLogger] Stored task ${taskObj.id} status as ${newStatus} in sessionStorage`);
    } catch (e) {
      console.error("Error storing task status in sessionStorage:", e);
    }

    // Broadcast the status change to all components with guaranteed delivery
    // Use setTimeout to ensure event is dispatched after state updates
    setTimeout(() => {
      // Dispatch status update event
      broadcastTaskStatusUpdate(taskObj.id, newStatus);

      // Force refresh task history - more aggressive approach
      window.dispatchEvent(new CustomEvent('taskHistoryForceRefresh', {
        detail: { taskId: taskObj.id, status: newStatus }
      }));

      // Force refresh task panel - more aggressive approach
      window.dispatchEvent(new CustomEvent('taskPanelRefresh', {
        detail: { taskId: taskObj.id, status: newStatus }
      }));

      console.log(`[TaskLogger] Dispatched refresh events for task ${taskObj.id}`);
    }, 10); // Small delay to ensure events are processed after state updates

    if (action === 'approve') {
      // Show success toast immediately upon clicking
      toast.success(`Task "${taskObj.id}" has been approved!`, {
        className: 'professional-toast',
        progressClassName: 'professional-progress',
        icon: <FaCheck color="#4CAF50" size={24} />,
      });

      // Call the onApprove callback immediately
      onApprove?.(taskObj.id, editedToolCalls);

      // Update task status in database immediately
      updateTaskStatusInDb(taskObj.task_id || taskObj.id, 'approved');

      // Make API call to approve endpoint (but don't wait for response to show toast)
      fetch(`/mcp/api/app/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedToolCalls)
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log("Approval API response:", data);
          // Success toast is already shown, so no need to show again
        })
        .catch(error => {
          console.error("Error approving task:", error);
          toast.error(`Error approving task: ${error.message}`, {
            className: 'professional-toast',
            progressClassName: 'professional-progress',
          });
        });
    } else {
      toast.error(`Task "${taskObj.id}" has been denied!`, {
        className: 'professional-toast',
        progressClassName: 'professional-progress',
        icon: <FaTimes color="#F44336" size={24} />,
      });

      // Call onDeny callback immediately
      onDeny?.(taskObj.id, editedToolCalls);

      // Update task status in database immediately
      updateTaskStatusInDb(taskObj.task_id || taskObj.id, 'denied');
    }
  }, [editedToolCalls, onApprove, onDeny, broadcastTaskStatusUpdate]);

  // Function to update task status in database
  const updateTaskStatusInDb = async (taskId: string, status: 'approved' | 'denied') => {
    try {
      console.log("updateTaskStatusInDb called with taskId:", taskId, "and status:", status);
      const response = await fetch('/api/task/update_task_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          status,
          startTime: status === 'approved' ? new Date().toISOString() : null
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update task status: ${response.statusText}`);
      }

      console.log(`Task ${taskId} status updated to ${status} in database`);
    } catch (error) {
      console.error("Error updating task status in database:", error);
    }
  };

  if (!isAuthenticated) return null;

  const renderTaskMetadata = () => {
    if (!localTask) {
      return (
        <Box p={5} textAlign="center" m={4}>
          <Text color="gray.600" fontSize={{ base: "md", md: "lg" }}>No task selected</Text>
        </Box>
      );
    }

    return (
      <Flex direction="column" gap={4}>
        {/* Summarization with more space */}
        {localTask.summarization && (
          <Box width="100%">
            <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" mb={1}>Summarization</Text>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="medium" whiteSpace="pre-wrap">
              {localTask.summarization}
            </Text>
          </Box>
        )}

        {/* Compact date section */}
        <Flex direction="row" wrap="wrap" gap={4}>
          <Box flex="1" minWidth="200px">
            <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" mb={1}>Timestamps</Text>
            <Flex direction="column" gap={1}>
              <Text fontSize={{ base: "sm", md: "md" }}>
                <Text as="span" fontWeight="medium">Created:</Text> {new Date(localTask.created_at).toLocaleString()}
              </Text>
              <Text fontSize={{ base: "sm", md: "md" }}>
                <Text as="span" fontWeight="medium">Started:</Text> {localTask.start_time ? new Date(localTask.start_time).toLocaleString() : '-'}
              </Text>
              <Text fontSize={{ base: "sm", md: "md" }}>
                <Text as="span" fontWeight="medium">Completed:</Text> {localTask.end_time ? new Date(localTask.end_time).toLocaleString() : '-'}
              </Text>
            </Flex>
          </Box>
        </Flex>

        {/* Result section */}
        {localTask.status === 'completed' && (
          <Box width="100%">
            <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" mb={1}>Result</Text>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="medium">
              {localTask.result || 'No result available'}
            </Text>
          </Box>
        )}
      </Flex>
    );
  };

  return (
    <Box
      height="100%"
      width="100%"
      position="relative"
      overflow="hidden"
      className={actionAnimation !== 'none' ? `task-action-${actionAnimation}` : ''}
    >
      {/* ToastContainer */}
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        transition={Slide}
        theme="light"
        limit={3}
        style={{
          zIndex: 9999,
          minWidth: '300px'
        }}
      />

      {/* Custom CSS for toast styling */}
      <style jsx global>{`
        .professional-toast {
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          padding: 16px !important;
          font-family: system-ui, -apple-system, sans-serif !important;
        }
        
        .professional-toast-body {
          font-size: 14px !important;
          font-weight: 500 !important;
          margin-left: 12px !important;
        }
        
        .professional-progress {
          height: 4px !important;
          background: linear-gradient(to right, #4CAF50, #8BC34A) !important;
        }
        
        .Toastify__toast--error .professional-progress {
          background: linear-gradient(to right, #F44336, #FF9800) !important;
        }
        
        .Toastify__toast {
          min-height: 64px !important;
        }
        
        .Toastify__close-button {
          opacity: 0.7 !important;
          padding: 4px !important;
        }
        
        /* Task action animations */
        .task-action-approve {
          animation: pulseGreen 1.5s ease-in-out;
        }
        
        .task-action-deny {
          animation: pulseRed 1.5s ease-in-out;
        }
        
        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(72, 187, 120, 0); }
          20% { box-shadow: 0 0 0 15px rgba(72, 187, 120, 0.2); }
          100% { box-shadow: 0 0 0 0 rgba(72, 187, 120, 0); }
        }
        
        @keyframes pulseRed {
          0% { box-shadow: 0 0 0 0 rgba(245, 101, 101, 0); }
          20% { box-shadow: 0 0 0 15px rgba(245, 101, 101, 0.2); }
          100% { box-shadow: 0 0 0 0 rgba(245, 101, 101, 0); }
        }
      `}</style>

      <Flex
        direction="column"
        width="100%"
        height="100%"
        px={30}
        pb={30}
        pt={10}
        alignItems="center"
        justifyContent="center"
        mt={-3}
      >
        {/* Main content as a row with tabs on left and actions on right */}
        <Flex width="100%" height="100%">
          {/* Left side - Tabs */}
          <Box flex="1" mr={4} height="100%">
            <Tabs.Root
              defaultValue="details"
              style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
              onValueChange={(value) => setActiveTab(value)}
            >
              <Tabs.List mb={4}>
                {['Details', 'Description', 'Arguments', 'Logs'].map((tab) => (
                  <Tabs.Trigger
                    key={tab.toLowerCase()}
                    value={tab.toLowerCase()}
                    px={4}
                    py={2}
                    mr={4}
                    fontSize="sm"
                    fontWeight="medium"
                    color="gray.600"
                    _hover={{ color: 'gray.800' }}
                    _selected={{ color: 'blue.600', borderBottom: '2px solid', borderColor: 'blue.600' }}
                  >
                    {tab}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <Box flex="1" position="relative" overflow="hidden">
                <Tabs.Content
                  value="details"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: 'auto'
                  }}
                >
                  <MotionBox
                    height="100%"
                    p={4}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: "easeOut",
                      delay: 0.1
                    }}
                  >
                    {renderTaskMetadata()}
                  </MotionBox>
                </Tabs.Content>

                <Tabs.Content
                  value="description"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: 'auto'
                  }}
                >
                  <MotionBox
                    height="100%"
                    p={4}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: "easeOut",
                      delay: 0.1
                    }}
                  >
                    {localTask ? (
                      <Text fontSize={{ base: "sm", md: "md" }} whiteSpace="pre-wrap" color="gray.700">
                        {localTask.description}
                      </Text>
                    ) : (
                      <Text color="gray.600">No task selected</Text>
                    )}
                  </MotionBox>
                </Tabs.Content>

                <Tabs.Content
                  value="arguments"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: 'auto'
                  }}
                >
                  <MotionBox
                    height="100%"
                    p={4}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: "easeOut",
                      delay: 0.1
                    }}
                  >
                    {localTask ? (
                      editedToolCalls && editedToolCalls.length > 0 ? (
                        <Flex direction="column" gap={4}>
                          <Box>
                            {/* <Text fontSize="md" fontWeight="medium" mb={3}>Tool Calls</Text> */}
                            {editedToolCalls.map((tool, toolIndex) => (
                              <Box key={toolIndex} mb={4} p={3} borderWidth="1px" borderRadius="md" borderColor="gray.200">
                                <Flex justifyContent="space-between" alignItems="center" mb={2}>
                                  <Text fontSize="sm" fontWeight="semibold" color="blue.600">
                                    {tool.tool_name || tool.name}
                                  </Text>
                                  {tool.mcp_server && (
                                    <Text fontSize="xs" color="gray.500" fontStyle="italic">
                                      Server: {tool.mcp_server}
                                    </Text>
                                  )}
                                </Flex>
                                {tool.args && Object.keys(tool.args).length > 0 ? (
                                  <Box ml={2}>
                                    <Text fontSize="xs" color="gray.600" mb={1}>Arguments:</Text>
                                    {Object.entries(tool.args).map(([key, value], argIndex) => (
                                      <Flex key={argIndex} justify="space-between" align="center" mb={2}>
                                        <Text fontSize="sm" color="gray.700" fontWeight="medium">{key}:</Text>
                                        <Input
                                          size="sm"
                                          width="60%"
                                          value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                          onChange={(e) => handleArgChange(toolIndex, key, e.target.value)}
                                          fontFamily="mono"
                                          disabled={localTask.status !== 'pending'}
                                        />
                                      </Flex>
                                    ))}
                                  </Box>
                                ) : (
                                  <Text fontSize="sm" color="gray.600" fontStyle="italic">No arguments provided</Text>
                                )}
                              </Box>
                            ))}
                          </Box>
                        </Flex>
                      ) : (
                        <Text color="gray.600" fontSize="sm">No tool calls associated with this task</Text>
                      )
                    ) : (
                      <Text color="gray.600">No task selected</Text>
                    )}
                  </MotionBox>
                </Tabs.Content>

                <Tabs.Content
                  value="logs"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: 'auto'
                  }}
                >
                  <MotionBox
                    height="100%"
                    p={4}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: "easeOut",
                      delay: 0.1
                    }}
                  >
                    <Text fontSize={{ base: "sm", md: "md" }} color="gray.600">
                      {localTask ? 'Task execution logs will appear here when available.' : 'No task selected'}
                    </Text>
                  </MotionBox>
                </Tabs.Content>
              </Box>
            </Tabs.Root>
          </Box>

          {/* Right side - Task Status and Action Buttons - Optimized */}
          <Box width="180px" bg="gray.50" p={4} borderRadius="md" height="fit-content">
            {localTask ? (
              <Flex direction="column" gap={3}>
                {/* Task Status - Compact - Use localTask instead of task */}
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" fontWeight="medium" color="gray.600">STATUS</Text>
                  <Flex
                    bg={
                      localTask.status === 'completed' ? 'green.100' :
                        localTask.status === 'pending' ? 'yellow.100' :
                          localTask.status === 'running' ? 'blue.100' :
                            localTask.status === 'denied' ? 'red.100' : 'gray.100'
                    }
                    color={
                      localTask.status === 'completed' ? 'green.700' :
                        localTask.status === 'pending' ? 'yellow.700' :
                          localTask.status === 'running' ? 'blue.700' :
                            localTask.status === 'denied' ? 'red.700' : 'gray.700'
                    }
                    px={2}
                    py={1}
                    borderRadius="md"
                    justifyContent="center"
                    fontWeight="medium"
                    fontSize="xs"
                    textTransform="uppercase"
                  >
                    {localTask.status}
                  </Flex>
                </Flex>

                {/* Task ID - Simplified Display */}
                <Box mb={2}>
                  <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>TASK ID</Text>
                  <Text
                    fontSize="xs"
                    fontFamily="mono"
                    color="gray.700"
                    wordBreak="break-all"
                    cursor="pointer"
                    onClick={() => {
                      // Next.js safe way to access clipboard
                      if (typeof window !== 'undefined') {
                        // Create a temporary textarea element
                        const textArea = document.createElement('textarea');
                        textArea.value = localTask.id;
                        // Make it invisible
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        // Execute copy command
                        document.execCommand('copy');
                        // Clean up
                        document.body.removeChild(textArea);
                        // Show toast
                        toast.info("Task ID copied to clipboard", { autoClose: 2000 });
                      }
                    }}
                    title="Click to copy ID"
                  >
                    {localTask.id}
                  </Text>
                </Box>

                {/* Action Buttons - Only show for pending tasks */}
                {localTask.status === 'pending' && (
                  <MotionFlex
                    justify="space-between"
                    mt={2}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {taskStatus[localTask.id] ? (
                      <Flex
                        justifyContent="center"
                        alignItems="center"
                        width="100%"
                        p={2}
                        borderRadius="md"
                        bg={taskStatus[localTask.id] === 'approved' ? 'green.100' : 'red.100'}
                        color={taskStatus[localTask.id] === 'approved' ? 'green.700' : 'red.700'}
                        fontWeight="medium"
                        animate={{
                          scale: [1, 1.05, 1],
                          opacity: [1, 0.9, 1]
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        {taskStatus[localTask.id] === 'approved' ? (
                          <Text display="flex" alignItems="center">
                            <Icon as={FaCheck} mr={1} /> Approved
                          </Text>
                        ) : (
                          <Text display="flex" alignItems="center">
                            <Icon as={FaTimes} mr={1} /> Denied
                          </Text>
                        )}
                      </Flex>
                    ) : (
                      <>
                        <Tooltip content="Approve task">
                          <IconButton
                            aria-label="Approve task"
                            bg="transparent"
                            color="green.500"
                            _hover={{ bg: 'green.50', color: 'green.600' }}
                            _active={{ bg: 'green.100' }}
                            _focus={{ boxShadow: '0 0 0 3px rgba(72, 187, 120, 0.3)' }}
                            onClick={() => handleTaskAction(localTask, 'approve')}
                            size="md"
                            flex="1"
                            mr={2}
                          >
                            <Icon as={FaCheck} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip content="Deny task">
                          <IconButton
                            aria-label="Deny task"
                            bg="transparent"
                            color="red.500"
                            _hover={{ bg: 'red.50', color: 'red.600' }}
                            _active={{ bg: 'red.100' }}
                            _focus={{ boxShadow: '0 0 0 3px rgba(245, 101, 101, 0.3)' }}
                            onClick={() => handleTaskAction(localTask, 'deny')}
                            size="md"
                            flex="1"
                          >
                            <Icon as={FaTimes} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </MotionFlex>
                )}

                {/* If task is not pending, show a message */}
                {localTask.status !== 'pending' && (
                  <Text fontSize="xs" color="gray.600" fontStyle="italic" textAlign="center" mt={2}>
                    No actions available
                  </Text>
                )}
              </Flex>
            ) : (
              <Text fontSize="sm" color="gray.600" textAlign="center">
                No task selected
              </Text>
            )}
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
};

export default TaskLogger;