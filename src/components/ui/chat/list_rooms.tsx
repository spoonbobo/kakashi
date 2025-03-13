"use client";

import {
  Box,
  Text,
  Flex,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import { useAuth } from "@/auth/context";
import { motion } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";

// Custom components to avoid spacing issues
const VStack = (props: any) => <Flex direction="column" {...props} />;
const HStack = (props: any) => <Flex direction="row" {...props} />;

const MotionBox = motion.create(Box);
const ITEMS_PER_PAGE = 10;

interface Message {
  id: string;
  timestamp: string;
  role: string;
  value: string;
}

interface Room {
  id: string;
  created_at: string;
  messages: Message[];
  message_count: number;
}

export const ListRooms = () => {
  const { isAuthenticated } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  const fetchRooms = async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/get_rooms?page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      if (!res.ok) throw new Error("Failed to fetch rooms");
      
      const data = await res.json();
      
      // Check if the data has the expected structure
      if (!data || !Array.isArray(data.rooms)) {
        console.error("Unexpected data format:", data);
        setError("Failed to load rooms: unexpected data format");
        return;
      }
      
      setRooms(prev => currentPage === 1 ? data.rooms : [...prev, ...data.rooms]);
      setHasMore(data.rooms.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError(err instanceof Error ? err.message : "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRooms(page);
    }
  }, [isAuthenticated, page]);

  const lastRoomRef = useCallback((node: HTMLDivElement) => {
    if (loading || !hasMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(prev => prev + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const handleRoomClick = (room: Room) => {
    setActiveRoom(room.id);
    window.history.pushState({}, '', `/?view=chat&roomId=${room.id}`);
    window.dispatchEvent(new CustomEvent('roomChange', { detail: room.id }));
  };

  if (!isAuthenticated) return null;

  return (
    <Flex direction="column" width="100%" height="100%" overflow="hidden" px={20}>
      <Flex direction="column" px={6} py={4} borderBottom="1px solid" borderColor="gray.200">
        <Text fontSize="xl" fontWeight="bold">Rooms</Text>
      </Flex>

      <Box flex="1" overflowY="auto" px={4} py={2}>
        {error && (
          <Text color="red.500" p={4} textAlign="center">
            {error}
          </Text>
        )}
        
        {Array.isArray(rooms) && rooms.map((room, index) => {
          const messageArray = Array.isArray(room.messages) ? room.messages : [];
          const lastMessage = messageArray[0]?.value || "Start a conversation...";
          const messageTime = messageArray[0]?.timestamp || room.created_at;
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
              transition={{ delay: index * 0.05, duration: 0.2 }}
              ref={index === rooms.length - 1 ? lastRoomRef : undefined}
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
                      Room #{room.id}
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
                        {messageCount} message{messageCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </HStack>
                </VStack>
              </Box>
            </MotionBox>
          );
        })}

        {/* Separate ref element removed since we're using ref on the last item */}

        {loading && (
          <Flex justify="center" py={4}>
            <Spinner size="md" />
          </Flex>
        )}

        {!hasMore && rooms.length > 0 && (
          <Text py={4} color="gray.500" textAlign="center">
            No more rooms to load
          </Text>
        )}

        {!loading && !error && rooms.length === 0 && (
          <Text py={4} color="gray.500" textAlign="center">
            No rooms yet
          </Text>
        )}
      </Box>
    </Flex>
  );
};