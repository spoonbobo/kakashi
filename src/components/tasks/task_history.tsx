import { Box, Text, Spinner, Badge, Flex, Portal } from "@chakra-ui/react";
import { Table, Select, createListCollection } from "@chakra-ui/react";
import { useAuth } from "@/auth/context";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";

const MotionBox = motion(Box);

interface Task {
  id: string;
  name: string;
  role: string;
  description: string;
  created_at: string;
  start_time: string;
  end_time: string;
  status: string;
  result: string;
  task_type: string;
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

  const statusOptions = createListCollection({
    items: [
      { label: "All", value: "all" },
      { label: "Pending", value: "pending" },
      { label: "Running", value: "running" },
      { label: "Completed", value: "completed" },
      { label: "Failed", value: "failed" },
    ],
  });

  const fetchTasks = useCallback(async (status: string) => {
    console.log("fetchTasks called with status:", status);
    setLoading(true);
    setError(null);

    try {
      // Create a URLSearchParams object for cleaner query parameter handling
      const params = new URLSearchParams();
      if (status && status !== 'all') {
        params.append('status', status);
      }

      // Add default limit if needed
      params.append('limit', '50'); // Fetch more tasks by default

      // Build the URL with query parameters
      const url = `/api/task/get_tasks?${params.toString()}`;
      console.log("Fetching tasks with URL:", url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Received tasks:", data);
      setTasks(data);
    } catch (err) {
      console.error("Error in fetchTasks:", err);
      setError('Error loading tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on component mount
  useEffect(() => {
    console.log("Initial useEffect running, isAuthenticated:", isAuthenticated);
    if (isAuthenticated) {
      fetchTasks(statusFilter);
    }
  }, [isAuthenticated, fetchTasks]);

  // Fetch when status filter changes
  useEffect(() => {
    console.log("Status filter changed to:", statusFilter);
    if (isAuthenticated) {
      console.log("Calling fetchTasks with status:", statusFilter);
      fetchTasks(statusFilter);
    } else {
      console.log("Not authenticated, skipping fetchTasks");
    }
  }, [statusFilter, isAuthenticated, fetchTasks]);

  if (!isAuthenticated) {
    return null;
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    let colorScheme = 'gray';

    switch (status.toLowerCase()) {
      case 'completed':
        colorScheme = 'green';
        break;
      case 'pending':
        colorScheme = 'yellow';
        break;
      case 'failed':
        colorScheme = 'red';
        break;
      case 'running':
        colorScheme = 'blue';
        break;
    }

    return <Badge colorScheme={colorScheme}>{status}</Badge>;
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
    // Call the onTaskSelect prop when a row is clicked
    if (onTaskSelect) {
      onTaskSelect(task);
    }
  };

  // Function to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <MotionBox
      width="100%"
      height="100%"
      p={4}
      // pl={6}
      px={30}
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
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontSize="xl" fontWeight="bold" textAlign="left">Task History</Text>
        <Flex gap={2} alignItems="center">
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
        <Box borderWidth="1px" borderRadius="md" overflow="hidden">
          <Table.Root variant="outline" size="md" colorScheme="gray">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader fontWeight="semibold" width="10%">ID</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" width="15%">Role</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" width="15%">Type</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" width="30%">Description</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" width="20%">Created</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" width="10%">Status</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {tasks.map((task) => (
                <Table.Row
                  key={task.id}
                  _hover={{ bg: "gray.50", cursor: "pointer" }}
                  transition="background-color 0.2s"
                  onClick={() => handleRowClick(task)}
                >
                  <Table.Cell fontWeight="medium">{task.id}</Table.Cell>
                  <Table.Cell>{task.role}</Table.Cell>
                  <Table.Cell>{task.task_type || 'N/A'}</Table.Cell>
                  <Table.Cell>
                    <Box title={task.description} fontSize="sm">
                      {truncateText(task.description, 50)}
                    </Box>
                  </Table.Cell>
                  <Table.Cell fontSize="sm">{formatDate(task.created_at)}</Table.Cell>
                  <Table.Cell>{getStatusBadge(task.status)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </MotionBox>
  );
};