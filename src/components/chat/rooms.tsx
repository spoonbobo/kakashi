"use client";

import {
  Box,
  Text,
  Flex,
  Badge,
  Spinner,
  Select,
  Portal,
  createListCollection,
  Input,
  Button,
  Popover,
  IconButton,
  Icon
} from "@chakra-ui/react";
import { useAuth } from "@/auth/context";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Room } from "@/types/chat";
import { useTranslation } from 'react-i18next';
import { FaSearch, FaPlus } from 'react-icons/fa';

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
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRooms, setTotalRooms] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const popoverCloseRef = useRef<HTMLButtonElement>(null);
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

  // Add this effect to initialize activeRoom from URL when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const roomIdFromUrl = url.searchParams.get('roomId');
      if (roomIdFromUrl) {
        setActiveRoom(roomIdFromUrl);
      }
    }
  }, []);

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
      setFilteredRooms(data.rooms);
      setTotalRooms(data.total || data.rooms.length);
      setHasMore(data.rooms.length === limit);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError(err instanceof Error ? err.message : "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  const createNewRoom = async () => {
    if (!isAuthenticated) return;

    setIsCreatingRoom(true);
    try {
      const res = await fetch('/api/chat/create_room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newRoomName.trim() || `Chat Room ${new Date().toLocaleString()}`
        }),
      });

      if (!res.ok) throw new Error("Failed to create room");

      const data = await res.json();

      // Close the popover
      if (popoverCloseRef.current) {
        popoverCloseRef.current.click();
      }

      // Reset the form
      setNewRoomName('');

      // Refresh the room list
      fetchRooms(1, itemsPerPage);

      // Navigate to the new room
      if (data.roomId) {
        handleRoomClick({ id: data.roomId } as Room);
      }
    } catch (err) {
      console.error("Error creating room:", err);
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRooms(currentPage, itemsPerPage);
    }
  }, [isAuthenticated, currentPage, itemsPerPage]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRooms(rooms);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = rooms.filter(room => {
        // Search in room ID
        if (room.id.toString().includes(query)) return true;

        // Search in messages
        const messageArray = Array.isArray(room.messages) ? room.messages : [];
        return messageArray.some(msg =>
          (msg.text || '').toLowerCase().includes(query)
        );
      });
      setFilteredRooms(filtered);
    }
  }, [searchQuery, rooms]);

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

  // Add this effect to handle URL changes from other components
  useEffect(() => {
    const handleUrlChange = () => {
      const url = new URL(window.location.href);
      const roomIdFromUrl = url.searchParams.get('roomId');
      if (roomIdFromUrl && roomIdFromUrl !== activeRoom) {
        setActiveRoom(roomIdFromUrl);
      }
    };

    window.addEventListener('popstate', handleUrlChange);

    // Custom event for when the URL is changed programmatically
    window.addEventListener('urlChanged', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('urlChanged', handleUrlChange);
    };
  }, [activeRoom]);

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
    <MotionBox
      width="100%"
      height="100%"
      bg="white"
      boxShadow="none"
      borderRadius="md"
      overflowY="auto"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{
        duration: 0.7,
        x: { type: "spring", stiffness: 300, damping: 30 }
      }}
    >
      <Flex direction="column" width="100%" height="100%" overflow="hidden">
        <Box p={4}>
          <Flex justify="space-between" align="center" mb={4}>
            <Flex position="relative" flex="1" mr={2}>
              <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" zIndex="1" pointerEvents="none">
                <FaSearch color="gray.300" />
              </Box>
              <Input
                placeholder={t('search_rooms')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                pl="10"
                borderRadius="md"
                bg="gray.50"
                _focus={{ bg: "white", borderColor: "blue.300" }}
              />
            </Flex>

            <Popover.Root>
              <Popover.Trigger asChild>
                {/* <Button
                  leftIcon={<FaPlus />}
                  colorScheme="blue"
                  size="md"
                >
                  {t('new_chat')}
                </Button> */}
                <IconButton
                  aria-label="New Chat"
                  colorScheme="blue"
                  size="md"
                >
                  <Icon as={FaPlus} />
                </IconButton>
              </Popover.Trigger>
              <Portal>
                <Popover.Positioner>
                  <Popover.Content width="300px">
                    <Popover.Arrow />
                    <Popover.Body>
                      <div>
                        <Popover.Title fontWeight="semibold">{t('create_new_chat')}</Popover.Title>
                        <Box mb={2}>
                          <Text mb={1} fontWeight="medium">{t('chat_name')}</Text>
                          <Input
                            placeholder={t('enter_chat_name')}
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                          />
                        </Box>
                        <Button
                          colorScheme="blue"
                          loading={isCreatingRoom}
                          onClick={createNewRoom}
                          width="full"
                          mt={2}
                        >
                          {t('create')}
                        </Button>
                      </div>
                    </Popover.Body>
                  </Popover.Content>
                </Popover.Positioner>
              </Portal>
            </Popover.Root>
          </Flex>

          <Flex justify="flex-end" align="center" gap={2} mb={2}>
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
        </Box>

        <Box
          flex="1"
          overflowY="auto"
          px={4}
          py={2}
          css={{
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              width: '6px',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '24px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0,0,0,0.15)',
              borderRadius: '24px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgba(0,0,0,0.25)',
            },
          }}
        >
          {error && (
            <Text color="red.500" p={4} textAlign="center">
              {error}
            </Text>
          )}

          {Array.isArray(filteredRooms) && filteredRooms.map((room, index) => {
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
                        {room.name || `${t('room')} #${room.id.substring(0, 8)}`}
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

          {!loading && !error && filteredRooms.length === 0 && (
            <Text py={4} color="gray.500" textAlign="center">
              {searchQuery ? t('no_matching_rooms') : t('no_rooms_yet')}
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
    </MotionBox>
  );
};