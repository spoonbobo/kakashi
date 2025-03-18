import { Box, Text, Spinner, Badge, Flex, Portal } from "@chakra-ui/react";
import { Table, Select, createListCollection } from "@chakra-ui/react";
import { useAuth } from "@/auth/context";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { getStatusColorProps, useTaskStatusUpdates } from '@/lib/task_status_utils';

const MotionBox = motion(Box);

interface Task {
  id: string;
  summarization: string;
  role: string;
  description: string;
  created_at: string;
  start_time: string;
  end_time: string;
  status: string;
  result: string;
}

interface TasksProps {
  onTaskSelect?: (task: Task) => void;
}

export const Tasks: React.FC<TasksProps> = ({ onTaskSelect }) => {
  const { isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const statusOptions = createListCollection({
    items: [
      { label: "All", value: "all" },
      { label: "Pending", value: "pending" },
      { label: "Running", value: "running" },
      { label: "Denied", value: "denied" },
      { label: "Successful", value: "successful" },
      { label: "Failed", value: "failed" },
    ],
  });

  const fetchTasks = useCallback(async (status: string) => {
    console.log("fetchTasks called with status:", status);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') {
        params.append('status', status);
      }

      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      params.append('_t', Date.now().toString());

      const url = `/api/task/get_tasks?${params.toString()}`;
      console.log("Fetching tasks with URL:", url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Received tasks:", data);

      if (data.tasks && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        setTotalTasks(data.total || 0);
      } else {
        setTasks(data);
        setTotalTasks(data.length || 0);
      }
    } catch (err) {
      console.error("Error in fetchTasks:", err);
      setError('Error loading tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    console.log("Initial useEffect running, isAuthenticated:", isAuthenticated);
    if (isAuthenticated) {
      fetchTasks(statusFilter);
    }
  }, [isAuthenticated, fetchTasks]);

  useEffect(() => {
    console.log("Status filter or pagination changed");
    if (isAuthenticated) {
      fetchTasks(statusFilter);
    }
  }, [statusFilter, currentPage, itemsPerPage, isAuthenticated, fetchTasks]);

  // Add visibility change event listener to refresh when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        console.log("Tab became visible, refreshing tasks");
        fetchTasks(statusFilter);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also refresh when the component becomes visible after navigation
    const handleFocus = () => {
      console.log("Window focused, refreshing tasks");
      if (isAuthenticated) {
        fetchTasks(statusFilter);
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, fetchTasks, statusFilter]);

  // Add a more robust task status update listener with debouncing
  useEffect(() => {
    // Immediate update function for UI responsiveness
    const handleTaskStatusUpdate = (event: CustomEvent) => {
      const { taskId, newStatus } = event.detail;
      console.log(`[TaskHistory] Task status update received: ${taskId} -> ${newStatus}`);

      // Immediately update task in the list for responsive UI
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    };

    // Debounced refresh function to prevent too many API calls
    const debouncedRefresh = debounce(() => {
      console.log("[TaskHistory] Debounced refresh triggered");
      fetchTasks(statusFilter);
    }, 2000); // 2 second debounce

    // Handle force refresh events from TaskLogger
    const handleForceRefresh = (event: CustomEvent) => {
      const { taskId, status } = event.detail || {};
      console.log(`[TaskHistory] Force refresh event received for task ${taskId} with status ${status}`);

      // First update the specific task immediately
      if (taskId) {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status } : task
          )
        );
      }

      // Then schedule a full refresh after a short delay
      setTimeout(() => debouncedRefresh(), 500);
    };

    // Add event listeners
    window.addEventListener('taskStatusUpdated', handleTaskStatusUpdate as EventListener);
    window.addEventListener('taskHistoryForceRefresh', handleForceRefresh as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('taskStatusUpdated', handleTaskStatusUpdate as EventListener);
      window.removeEventListener('taskHistoryForceRefresh', handleForceRefresh as EventListener);
    };
  }, [statusFilter]);

  // Helper function for debouncing
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Add a function to check session storage on component mount
  useEffect(() => {
    if (!isAuthenticated) return;

    try {
      const storedUpdates = JSON.parse(sessionStorage.getItem('taskStatusUpdates') || '{}');
      if (Object.keys(storedUpdates).length > 0) {
        console.log("[TaskHistory] Found stored task updates, applying to current task list");

        // Apply stored updates to current tasks
        setTasks(prevTasks =>
          prevTasks.map(task => {
            if (storedUpdates[task.id]) {
              return { ...task, status: storedUpdates[task.id].status };
            }
            return task;
          })
        );
      }
    } catch (e) {
      console.error("Error applying stored task updates:", e);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const colorProps = getStatusColorProps(status);

    return (
      <Badge
        colorScheme={colorProps.colorScheme}
        variant="subtle"
        px={2}
        py={1}
        borderRadius="md"
        textTransform="uppercase"
        fontSize="xs"
        boxShadow="none"
        bg={colorProps.bg}
        color={colorProps.color}
      >
        {status}
      </Badge>
    );
  };

  const handleStatusChange = (values: string[]) => {
    if (values && values.length > 0) {
      const newStatus = values[0];
      console.log("handleStatusChange - Setting status filter to:", newStatus);
      setStatusFilter(newStatus);
    } else {
      console.log("handleStatusChange - Setting status filter to: all (default)");
      setStatusFilter("all");
    }
  };

  const handleRowClick = (task: Task) => {
    console.log("Row clicked for task:", task);
    if (onTaskSelect) {
      onTaskSelect(task);
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const totalPages = Math.ceil(totalTasks / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (values: string[]) => {
    if (values && values.length > 0) {
      const newLimit = parseInt(values[0], 10);
      setItemsPerPage(newLimit);
      setCurrentPage(1);
    }
  };

  const perPageOptions = createListCollection({
    items: [
      { label: "10 per page", value: "10" },
      { label: "25 per page", value: "25" },
      { label: "50 per page", value: "50" },
      { label: "100 per page", value: "100" },
    ],
  });

  return (
    <MotionBox
      width="100%"
      height="100%"
      p={4}
      px={4}
      sm={{ px: 6 }}
      md={{ px: 8 }}
      lg={{ px: 12 }}
      borderRadius="0"
      boxShadow="sm"
      display="flex"
      flexDirection="column"
      justifyContent="flex-start"
      alignItems="stretch"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{
        duration: 0.7,
        x: { type: "spring", stiffness: 300, damping: 30 }
      }}
      overflowX="auto"
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        mb={4}
        flexDirection={{ base: "column", md: "row" }}
        gap={2}
      >
        <Text fontSize="xl" fontWeight="bold" textAlign="left">Task History</Text>
        <Flex gap={2} alignItems="center" flexWrap="wrap">
          <Text fontSize="sm">Status:</Text>
          <Select.Root
            size="sm"
            width="150px"
            collection={statusOptions}
            defaultValue={["all"]}
            onValueChange={(values) => {
              console.log("Select onValueChange - values:", values);
              handleStatusChange(values.value);
            }}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Filter by status" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {statusOptions.items.map((option) => (
                    <Select.Item item={option} key={option.value}>
                      {option.label}
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
        </Flex>
      </Flex>

      {loading ? (
        <Spinner size="xl" alignSelf="center" my={8} />
      ) : error ? (
        <Text color="red.500" textAlign="center" my={8}>{error}</Text>
      ) : tasks.length === 0 ? (
        <Text textAlign="center" my={8}>No tasks found.</Text>
      ) : (
        <>
          <Box borderWidth="1px" borderRadius="md" overflow="auto">
            <Table.Root variant="outline" size="md" colorScheme="gray">
              <Table.Header bg="gray.50" position="sticky" top={0} zIndex={1}>
                <Table.Row>
                  <Table.ColumnHeader fontWeight="semibold" width={{ base: "20%", md: "10%" }}>ID</Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="semibold" width={{ base: "25%", md: "15%" }}>Role</Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="semibold" width={{ base: "55%", md: "45%" }}>Summarization</Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="semibold" width="20%" display={{ base: "none", md: "table-cell" }}>Created</Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="semibold" width="10%" textAlign="center">Status</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {tasks.map((task) => (
                  <Table.Row
                    key={task.id}
                    cursor="pointer"
                    _hover={{ bg: "gray.50" }}
                    onClick={() => handleRowClick(task)}
                  >
                    <Table.Cell fontWeight="medium" fontSize={{ base: "xs", md: "sm" }}>{task.id}</Table.Cell>
                    <Table.Cell fontSize={{ base: "xs", md: "sm" }}>{task.role}</Table.Cell>
                    <Table.Cell>
                      <Box title={task.summarization} fontSize={{ base: "xs", md: "sm" }}>
                        {truncateText(task.summarization, 100)}
                      </Box>
                    </Table.Cell>
                    <Table.Cell fontSize={{ base: "xs", md: "sm" }} display={{ base: "none", md: "table-cell" }}>{formatDate(task.created_at)}</Table.Cell>
                    <Table.Cell textAlign="center" padding={2}>
                      {getStatusBadge(task.status)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          <Flex
            justifyContent="space-between"
            alignItems="center"
            mt={4}
            flexDirection={{ base: "column", md: "row" }}
            gap={3}
          >
            <Flex alignItems="center" gap={2}>
              <Text fontSize="sm">Rows per page:</Text>
              <Select.Root
                size="sm"
                width="120px"
                collection={perPageOptions}
                defaultValue={[itemsPerPage.toString()]}
                onValueChange={(values) => handleItemsPerPageChange(values.value)}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {perPageOptions.items.map((option) => (
                        <Select.Item item={option} key={option.value}>
                          {option.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Flex>

            <Flex gap={1} alignItems="center">
              <Box
                as="button"
                isDisabled={currentPage === 1}
                onClick={() => handlePageChange(1)}
                px={2} py={1}
                borderRadius="md"
                bg={currentPage === 1 ? "gray.100" : "gray.200"}
                color={currentPage === 1 ? "gray.400" : "gray.700"}
                _hover={{ bg: currentPage === 1 ? "gray.100" : "gray.300" }}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
              >
                «
              </Box>
              <Box
                as="button"
                isDisabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                px={2} py={1}
                borderRadius="md"
                bg={currentPage === 1 ? "gray.100" : "gray.200"}
                color={currentPage === 1 ? "gray.400" : "gray.700"}
                _hover={{ bg: currentPage === 1 ? "gray.100" : "gray.300" }}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
              >
                ‹
              </Box>

              <Text mx={2} fontSize="sm">
                Page {currentPage} of {totalPages || 1}
              </Text>

              <Box
                as="button"
                isDisabled={currentPage === totalPages || totalPages === 0}
                onClick={() => handlePageChange(currentPage + 1)}
                px={2} py={1}
                borderRadius="md"
                bg={currentPage === totalPages || totalPages === 0 ? "gray.100" : "gray.200"}
                color={currentPage === totalPages || totalPages === 0 ? "gray.400" : "gray.700"}
                _hover={{ bg: currentPage === totalPages || totalPages === 0 ? "gray.100" : "gray.300" }}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
              >
                ›
              </Box>
              <Box
                as="button"
                isDisabled={currentPage === totalPages || totalPages === 0}
                onClick={() => handlePageChange(totalPages)}
                px={2} py={1}
                borderRadius="md"
                bg={currentPage === totalPages || totalPages === 0 ? "gray.100" : "gray.200"}
                color={currentPage === totalPages || totalPages === 0 ? "gray.400" : "gray.700"}
                _hover={{ bg: currentPage === totalPages || totalPages === 0 ? "gray.100" : "gray.300" }}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
              >
                »
              </Box>
            </Flex>

            <Text fontSize="sm" color="gray.600">
              Showing {tasks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalTasks)} of {totalTasks} tasks
            </Text>
          </Flex>
        </>
      )}
    </MotionBox>
  );
};