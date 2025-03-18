"use client"

import React, { useState, useEffect } from 'react';
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
      setEditedToolCalls(JSON.parse(JSON.stringify(task.tools_called)));
    } else {
      setEditedToolCalls([]);
    }

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

  // Updated approval function to include edited tool calls
  const handleApproveTask = (task) => {
    console.log("Task approved:", task, "with edited tool calls:", editedToolCalls);
    toast.success(`Task "${task.id}" has been approved!`, {
      className: 'professional-toast',
      progressClassName: 'professional-progress',
      icon: <FaCheck color="#4CAF50" size={24} />,
      bodyClassName: 'professional-toast-body'
    });
    // Pass both task ID and edited tool calls to the onApprove handler
    onApprove?.(task.id, editedToolCalls);
  };

  // Updated deny function to include edited tool calls
  const handleDenyTask = (task) => {
    console.log("Task denied:", task, "with edited tool calls:", editedToolCalls);
    toast.error(`Task "${task.id}" has been denied!`, {
      className: 'professional-toast',
      progressClassName: 'professional-progress',
      icon: <FaTimes color="#F44336" size={24} />,
      bodyClassName: 'professional-toast-body'
    });
    // Pass both task ID and edited tool calls to the onDeny handler
    onDeny?.(task.id, editedToolCalls);
  };

  if (!isAuthenticated) return null;

  const renderTaskMetadata = () => {
    if (!task) {
      return (
        <Box p={5} textAlign="center" m={4}>
          <Text color="gray.600" fontSize={{ base: "md", md: "lg" }}>No task selected</Text>
        </Box>
      );
    }

    return (
      <Flex direction="row" wrap="wrap" gap={4}>
        {[
          { label: 'Summarization', value: task.summarization },
          { label: 'Created', value: new Date(task.created_at).toLocaleString() },
          { label: 'Started', value: task.start_time ? new Date(task.start_time).toLocaleString() : '-' },
          { label: 'Completed', value: task.end_time ? new Date(task.end_time).toLocaleString() : '-' }
        ].map((item, index) => (
          <Box flex="1" minWidth="150px" key={index}>
            <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" mb={1}>{item.label}</Text>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="medium">{item.value}</Text>
          </Box>
        ))}
        {task.status === 'completed' && (
          <Box width="100%" mt={2}>
            <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" mb={1}>Result</Text>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="medium">
              {task.result || 'No result available'}
            </Text>
          </Box>
        )}
      </Flex>
    );
  };

  return (
    <Box height="100%" width="100%" position="relative" overflow="hidden">
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
                    {task ? (
                      <Text fontSize={{ base: "sm", md: "md" }} whiteSpace="pre-wrap" color="gray.700">
                        {task.description}
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
                    {task ? (
                      editedToolCalls && editedToolCalls.length > 0 ? (
                        <Flex direction="column" gap={4}>
                          <Box>
                            {/* <Text fontSize="md" fontWeight="medium" mb={3}>Tool Calls</Text> */}
                            {editedToolCalls.map((tool, toolIndex) => (
                              <Box key={toolIndex} mb={4} p={3} borderWidth="1px" borderRadius="md" borderColor="gray.200">
                                <Text fontSize="sm" fontWeight="semibold" color="blue.600" mb={2}>
                                  {tool.name}
                                </Text>
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
                                          disabled={task.status !== 'pending'}
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
                      {task ? 'Task execution logs will appear here when available.' : 'No task selected'}
                    </Text>
                  </MotionBox>
                </Tabs.Content>
              </Box>
            </Tabs.Root>
          </Box>

          {/* Right side - Task Status and Action Buttons - Optimized */}
          <Box width="180px" bg="gray.50" p={4} borderRadius="md" height="fit-content">
            {task ? (
              <Flex direction="column" gap={3}>
                {/* Task Status - Compact */}
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" fontWeight="medium" color="gray.600">STATUS</Text>
                  <Flex
                    bg={
                      task.status === 'completed' ? 'green.100' :
                        task.status === 'pending' ? 'yellow.100' :
                          task.status === 'failed' ? 'red.100' : 'gray.100'
                    }
                    color={
                      task.status === 'completed' ? 'green.700' :
                        task.status === 'pending' ? 'yellow.700' :
                          task.status === 'failed' ? 'red.700' : 'gray.700'
                    }
                    px={2}
                    py={1}
                    borderRadius="md"
                    justifyContent="center"
                    fontWeight="medium"
                    fontSize="xs"
                    textTransform="uppercase"
                  >
                    {task.status}
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
                        textArea.value = task.id;
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
                    {task.id}
                  </Text>
                </Box>

                {/* Action Buttons - Only show for pending tasks - Now using IconButtons with navbar styling */}
                {task.status === 'pending' && (
                  <MotionFlex
                    justify="space-between"
                    mt={2}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <Tooltip content="Approve task">
                      <IconButton
                        aria-label="Approve task"
                        bg="transparent"
                        color="green.500"
                        _hover={{ bg: 'green.50', color: 'green.600' }}
                        _active={{ bg: 'green.100' }}
                        _focus={{ boxShadow: '0 0 0 3px rgba(72, 187, 120, 0.3)' }}
                        onClick={() => handleApproveTask(task)}
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
                        onClick={() => handleDenyTask(task)}
                        size="md"
                        flex="1"
                      >
                        <Icon as={FaTimes} />
                      </IconButton>
                    </Tooltip>
                  </MotionFlex>
                )}

                {/* If task is not pending, show a message */}
                {task.status !== 'pending' && (
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