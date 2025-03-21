"use client";

import {
  Box,
  Text,
  Flex,
  Badge,
  Spinner,
  Select,
  Portal,
  createListCollection
} from "@chakra-ui/react";
import { useAuth } from "@/auth/context";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Room } from "@/types/chat";
import { useTranslation } from 'react-i18next';

// Custom components to avoid spacing issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VStack = (props: any) => <Flex direction="column" {...props} />;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HStack = (props: any) => <Flex direction="row" {...props} />;

const MotionBox = motion.create(Box);
const ITEMS_PER_PAGE = 50;

export const ListRooms = () => {
  const { t } = useTranslation();
  const { isAuthenticated, authChecked } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRooms, setTotalRooms] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hasMore, setHasMore] = useState(true);

  // Create list collection for per page options
  const perPageOptions = createListCollection({
    items: [
      { label: "10 per page", value: "10" },
      { label: "20 per page", value: "20" },
      { label: "50 per page", value: "50" },
    ],
  });

  const fetchRooms = async (page: number, limit: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/get_rooms?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch rooms");

      const data = await res.json();

      // Check if the data has the expected structure
      if (!data || !Array.isArray(data.rooms)) {
        console.error("Unexpected data format:", data);
        setError("Failed to load rooms: unexpected data format");
        return;
      }

      setRooms(data.rooms);
      setTotalRooms(data.total || data.rooms.length);
      setHasMore(data.rooms.length === limit);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError(err instanceof Error ? err.message : "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRooms(currentPage, itemsPerPage);
    }
  }, [isAuthenticated, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(totalRooms / itemsPerPage);
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

  const handleRoomClick = (room: Room) => {
    setActiveRoom(room.id);
    window.history.pushState({}, '', `/?view=chat&roomId=${room.id}`);
    window.dispatchEvent(new CustomEvent('roomChange', { detail: room.id }));
  };

  if (authChecked && !isAuthenticated) {
    return (
      <Box p={4} textAlign="center" borderRadius="md" bg="gray.50" my={4}>
        <Text fontWeight="medium" color="gray.700">Please log in to view rooms</Text>
        <Text fontSize="sm" color="gray.500" mt={1}>
          Your session may have expired or you&apos;ve been logged out
        </Text>
      </Box>
    );
  }

  const totalPages = Math.ceil(totalRooms / itemsPerPage);

  return (
    <Flex direction="column" width="100%" height="100%" overflow="hidden">
      <Flex direction="column" px={6} py={4} borderBottom="1px solid" borderColor="gray.200">
        <Flex justify="space-between" align="center">
          <Text fontSize="xl" fontWeight="bold">{t('rooms')}</Text>
          <Flex align="center" gap={2}>
            <Text fontSize="sm">{t('rows_per_page')}:</Text>
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
        </Flex>
      </Flex>

      <Box flex="1" overflowY="auto" px={4} py={2}>
        {error && (
          <Text color="red.500" p={4} textAlign="center">
            {error}
          </Text>
        )}

        {Array.isArray(rooms) && rooms.map((room, index) => {
          const messageArray = Array.isArray(room.messages) ? room.messages : [];

          // Handle both formats (value/role and text/sender)
          const lastMessage = messageArray.length > 0
            ? (messageArray[0]?.text || "")
            : "";

          const messageTime = messageArray.length > 0
            ? (messageArray[0]?.timestamp || room.created_at)
            : room.created_at;

          const isActive = activeRoom === room.id;
          const messageCount = room.message_count || messageArray.length;

          return (
            <MotionBox
              key={room.id}
              mb={2}
              borderBottom="1px solid"
              borderColor="gray.200"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.05,
                duration: 0.3,
                y: { type: "spring", stiffness: 300, damping: 30 }
              }}
              whileHover={{
                scale: 1.01,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Box
                p={3}
                borderRadius="md"
                bg={isActive ? 'blue.50' : 'transparent'}
                _hover={{ bg: isActive ? 'blue.50' : 'gray.100' }}
                cursor="pointer"
                onClick={() => handleRoomClick(room)}
              >
                <VStack align="start" gap={1}>
                  <HStack justify="space-between" width="100%">
                    <Text fontWeight="medium">
                      {t('room')} #{room.id}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {formatDistanceToNow(new Date(messageTime), { addSuffix: true })}
                    </Text>
                  </HStack>
                  <HStack width="100%">
                    <Text fontSize="sm" color="gray.500" flex={1}>
                      {lastMessage}
                    </Text>
                    {messageCount > 0 && (
                      <Badge colorScheme={isActive ? 'blue' : 'gray'} variant="subtle" fontSize="xs">
                        {messageCount} {t('message')}
                      </Badge>
                    )}
                  </HStack>
                </VStack>
              </Box>
            </MotionBox>
          );
        })}

        {loading && (
          <Flex justify="center" py={4}>
            <Spinner size="md" />
          </Flex>
        )}

        {!loading && !error && rooms.length === 0 && (
          <Text py={4} color="gray.500" textAlign="center">
            {t('no_rooms_yet')}
          </Text>
        )}
      </Box>

      {totalRooms > 0 && (
        <Flex
          justify="space-between"
          align="center"
          p={4}
          borderTop="1px solid"
          borderColor="gray.200"
        >
          <Text fontSize="sm" color="gray.600">
            {t('showing')} {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalRooms)} {t('of')} {totalRooms} {t('rooms')}
          </Text>

          <Flex gap={1} align="center">
            <Box
              as="button"
              onClick={() => handlePageChange(1)}
              px={2} py={1}
              borderRadius="md"
              bg={currentPage === 1 ? "gray.100" : "gray.200"}
              color={currentPage === 1 ? "gray.400" : "gray.700"}
              _hover={{ bg: currentPage === 1 ? "gray.100" : "gray.300" }}
              aria-disabled={currentPage === 1}
              pointerEvents={currentPage === 1 ? "none" : "auto"}
            >
              «
            </Box>
            <Box
              as="button"
              onClick={() => handlePageChange(currentPage - 1)}
              px={2} py={1}
              borderRadius="md"
              bg={currentPage === 1 ? "gray.100" : "gray.200"}
              color={currentPage === 1 ? "gray.400" : "gray.700"}
              _hover={{ bg: currentPage === 1 ? "gray.100" : "gray.300" }}
              aria-disabled={currentPage === 1}
              pointerEvents={currentPage === 1 ? "none" : "auto"}
            >
              ‹
            </Box>

            <Text mx={2} fontSize="sm">
              {t('page')} {currentPage} {t('of')} {totalPages || 1}
            </Text>

            <Box
              as="button"
              onClick={() => handlePageChange(currentPage + 1)}
              px={2} py={1}
              borderRadius="md"
              bg={currentPage === totalPages ? "gray.100" : "gray.200"}
              color={currentPage === totalPages ? "gray.400" : "gray.700"}
              _hover={{ bg: currentPage === totalPages ? "gray.100" : "gray.300" }}
              aria-disabled={currentPage === totalPages}
              pointerEvents={currentPage === totalPages ? "none" : "auto"}
            >
              ›
            </Box>
            <Box
              as="button"
              onClick={() => handlePageChange(totalPages)}
              px={2} py={1}
              borderRadius="md"
              bg={currentPage === totalPages ? "gray.100" : "gray.200"}
              color={currentPage === totalPages ? "gray.400" : "gray.700"}
              _hover={{ bg: currentPage === totalPages ? "gray.100" : "gray.300" }}
              aria-disabled={currentPage === totalPages}
              pointerEvents={currentPage === totalPages ? "none" : "auto"}
            >
              »
            </Box>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
};