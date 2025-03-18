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
    summarization?: string;
    tools_called: Record<string, any>;
  };
  onApprove?: (taskId: string, editedToolCalls: Array<Record<string, any>>) => void;
  onDeny?: (taskId: string, editedToolCalls: Array<Record<string, any>>) => void;
}

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

const TaskLogger: React.FC<TaskLoggerProps> = ({
  task,
  onApprove,
  onDeny
}) => {
  const { isAuthenticated } = useAuth();
  const [_priority, _setPriority] = useState("High");
  const [_timeout, _setTimeout] = useState("30");
  const [_maxRetries, _setMaxRetries] = useState("3");
  const [_toolName, _setToolName] = useState("file_search");
  const [_query, _setQuery] = useState("user_data.json");
  const [_activeTab, setActiveTab] = useState("details");
  const [editedToolCalls, setEditedToolCalls] = useState<Array<Record<string, any>>>([]);
  const [localTask, setLocalTask] = useState(task);
  const [actionAnimation, setActionAnimation] = useState<'none' | 'approve' | 'deny'>('none');

  useEffect(() => {
    if (task) {
      console.log(`[TaskLogger] New task received: ID=${task.id}, Status=${task.status}`);
    }
  }, [task]);

  useEffect(() => {
    _setPriority("High");
    _setTimeout("30");
    _setMaxRetries("3");
    _setToolName("file_search");
    _setQuery("user_data.json");
    setActiveTab("details");

    if (task?.tools_called) {
      console.log("task.tools_called", task.tools_called);
      if (task.tools_called.tools_called && Array.isArray(task.tools_called.tools_called)) {
        setEditedToolCalls(JSON.parse(JSON.stringify(task.tools_called.tools_called)));
      } else {
        setEditedToolCalls(JSON.parse(JSON.stringify(task.tools_called)));
      }
    } else {
      setEditedToolCalls([]);
    }

    try {
      if (task?.id) {
        const storedUpdates = JSON.parse(sessionStorage.getItem('taskStatusUpdates') || '{}');
        if (storedUpdates[task.id]) {
          console.log(`[TaskLogger] Found stored status for task ${task.id}: ${storedUpdates[task.id].status}`);
          if (storedUpdates[task.id].status === 'approved' || storedUpdates[task.id].status === 'denied') {
            setLocalTask(prev => prev ? { ...prev, status: storedUpdates[task.id].status } : task);
            return;
          } else {
            delete storedUpdates[task.id];
            sessionStorage.setItem('taskStatusUpdates', JSON.stringify(storedUpdates));
            console.log(`[TaskLogger] Cleared non-final status for task ${task.id}`);
          }
        }
      }
    } catch (e) {
      console.error("Error retrieving task status from sessionStorage:", e);
    }

    setLocalTask(task);

    const tabsElement = document.querySelector('[role="tablist"]');
    if (tabsElement) {
      const detailsTabTrigger = tabsElement.querySelector('[value="details"]');
      if (detailsTabTrigger) {
        (detailsTabTrigger as HTMLElement).click();
      }
    }
  }, [task]);

  useEffect(() => {
    if (localTask) {
      console.log(`[TaskLogger] localTask status updated: ${localTask.status} for task ${localTask.id}`);
    }
  }, [localTask?.status]);

  const handleArgChange = (toolIndex: number, argKey: string, newValue: string) => {
    const updatedToolCalls = [...editedToolCalls];
    try {
      if (newValue.trim().startsWith('{') || newValue.trim().startsWith('[')) {
        try {
          updatedToolCalls[toolIndex].args[argKey] = JSON.parse(newValue);
        } catch (error) {
          updatedToolCalls[toolIndex].args[argKey] = newValue;
        }
      } else {
        const numValue = Number(newValue);
        updatedToolCalls[toolIndex].args[argKey] = !isNaN(numValue) && newValue.trim() !== '' ?
          numValue : newValue;
      }
      setEditedToolCalls(updatedToolCalls);
    } catch (error) {
      console.error("Error updating argument:", error);
    }
  };

  const handleTaskAction = useCallback((taskObj: TaskLoggerProps['task'], action: 'approve' | 'deny') => {
    if (!taskObj) return;

    const newStatus = action === 'approve' ? 'approved' : 'denied';
    console.log(`Task ${action}d:`, taskObj, "with edited tool calls:", editedToolCalls);

    setLocalTask(prev => {
      if (!prev) return taskObj;
      return { ...prev, status: newStatus };
    });

    setActionAnimation(action);
    setTimeout(() => setActionAnimation('none'), 1500);

    try {
      const updates = JSON.parse(sessionStorage.getItem('taskStatusUpdates') || '{}');
      updates[taskObj.id] = { status: newStatus, timestamp: Date.now() };
      sessionStorage.setItem('taskStatusUpdates', JSON.stringify(updates));
      console.log(`[TaskLogger] Stored final status ${newStatus} for task ${taskObj.id}`);
    } catch (e) {
      console.error("Error storing task status:", e);
    }

    window.dispatchEvent(new CustomEvent('taskStatusUpdated', {
      detail: { taskId: taskObj.id, newStatus, timestamp: Date.now() }
    }));

    window.dispatchEvent(new CustomEvent('taskHistoryForceRefresh', {
      detail: { taskId: taskObj.id, status: newStatus, timestamp: Date.now(), action }
    }));

    window.dispatchEvent(new CustomEvent('taskPanelRefresh', {
      detail: { taskId: taskObj.id, status: newStatus, timestamp: Date.now(), action }
    }));

    if (action === 'approve') {
      toast.success(`Task "${taskObj.id}" has been approved!`, {
        className: 'professional-toast',
        progressClassName: 'professional-progress',
        icon: <FaCheck color="#4CAF50" size={24} />,
      });
      onApprove?.(taskObj.id, editedToolCalls);
    } else {
      toast.error(`Task "${taskObj.id}" has been denied!`, {
        className: 'professional-toast',
        progressClassName: 'professional-progress',
        icon: <FaTimes color="#F44336" size={24} />,
      });
      onDeny?.(taskObj.id, editedToolCalls);
    }

    updateTaskStatusInDb(taskObj.task_id || taskObj.id, newStatus as 'approved' | 'denied');

    if (action === 'approve') {
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
        })
        .catch(error => {
          console.error("Error approving task:", error);
          toast.error(`Error approving task: ${error.message}`, {
            className: 'professional-toast',
            progressClassName: 'professional-progress',
          });
        });
    }
  }, [editedToolCalls, onApprove, onDeny]);

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
        {localTask.summarization && (
          <Box width="100%">
            <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" mb={1}>Summarization</Text>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="medium" whiteSpace="pre-wrap">
              {localTask.summarization}
            </Text>
          </Box>
        )}

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
        <Flex width="100%" height="100%">
          <Box flex="1" mr={4} height="100%">
            <Tabs.Root
              defaultValue="details"
              style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
              onValueChange={setActiveTab}
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

          <Box width="180px" bg="gray.50" p={4} borderRadius="md" height="fit-content">
            {localTask ? (
              <Flex direction="column" gap={3}>
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

                <Box mb={2}>
                  <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>TASK ID</Text>
                  <Text
                    fontSize="xs"
                    fontFamily="mono"
                    color="gray.700"
                    wordBreak="break-all"
                    cursor="pointer"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const textArea = document.createElement('textarea');
                        textArea.value = localTask.id;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        toast.info("Task ID copied to clipboard", { autoClose: 2000 });
                      }
                    }}
                    title="Click to copy ID"
                  >
                    {localTask.id}
                  </Text>
                </Box>

                <MotionFlex
                  justify="space-between"
                  mt={2}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <Tooltip content={localTask.status === 'approved' || localTask.status === 'denied' ?
                    `Task already ${localTask.status}` : "Approve task"}>
                    <IconButton
                      aria-label="Approve task"
                      bg="transparent"
                      color={localTask.status === 'approved' ? 'green.300' :
                        localTask.status === 'denied' ? 'gray.300' : 'green.500'}
                      _hover={{
                        bg: localTask.status === 'approved' || localTask.status === 'denied' ?
                          'transparent' : 'green.50',
                        color: localTask.status === 'approved' || localTask.status === 'denied' ?
                          undefined : 'green.600'
                      }}
                      _active={{
                        bg: localTask.status === 'approved' || localTask.status === 'denied' ?
                          'transparent' : 'green.100'
                      }}
                      _focus={{
                        boxShadow: localTask.status === 'approved' || localTask.status === 'denied' ?
                          'none' : '0 0 0 3px rgba(72, 187, 120, 0.3)'
                      }}
                      onClick={() => {
                        if (localTask.status !== 'approved' && localTask.status !== 'denied') {
                          handleTaskAction(localTask, 'approve');
                        }
                      }}
                      cursor={localTask.status === 'approved' || localTask.status === 'denied' ?
                        'not-allowed' : 'pointer'}
                      size="md"
                      flex="1"
                      mr={2}
                    >
                      <Icon as={FaCheck} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content={localTask.status === 'approved' || localTask.status === 'denied' ?
                    `Task already ${localTask.status}` : "Deny task"}>
                    <IconButton
                      aria-label="Deny task"
                      bg="transparent"
                      color={localTask.status === 'denied' ? 'red.300' :
                        localTask.status === 'approved' ? 'gray.300' : 'red.500'}
                      _hover={{
                        bg: localTask.status === 'approved' || localTask.status === 'denied' ?
                          'transparent' : 'red.50',
                        color: localTask.status === 'approved' || localTask.status === 'denied' ?
                          undefined : 'red.600'
                      }}
                      _active={{
                        bg: localTask.status === 'approved' || localTask.status === 'denied' ?
                          'transparent' : 'red.100'
                      }}
                      _focus={{
                        boxShadow: localTask.status === 'approved' || localTask.status === 'denied' ?
                          'none' : '0 0 0 3px rgba(245, 101, 101, 0.3)'
                      }}
                      onClick={() => {
                        if (localTask.status !== 'approved' && localTask.status !== 'denied') {
                          handleTaskAction(localTask, 'deny');
                        }
                      }}
                      cursor={localTask.status === 'approved' || localTask.status === 'denied' ?
                        'not-allowed' : 'pointer'}
                      size="md"
                      flex="1"
                    >
                      <Icon as={FaTimes} />
                    </IconButton>
                  </Tooltip>
                </MotionFlex>
              </Flex>
            ) : (
              <Text fontSize="sm" color="gray.600" textAlign="center">
                No task selected
              </Text>
            )}
          </Box>
        </Flex>
      </Flex>

      {localTask && (
        <Box position="absolute" top="5px" right="5px" fontSize="xs" color="gray.400">
          Status: {localTask.status}
        </Box>
      )}
    </Box>
  );
};

export default TaskLogger;