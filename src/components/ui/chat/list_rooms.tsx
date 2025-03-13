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

const MotionBox = motion(Box);
const ITEMS_PER_PAGE = 10;

interface Session {
  id: string;
  created_at: string;
  messages: { id: string; timestamp: string; role: string; value: string }[];
}

export const ListRooms = () => {
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  const fetchSessions = async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/get_sessions?page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(prev => currentPage === 1 ? data.sessions : [...prev, ...data.sessions]);
      setHasMore(data.sessions.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions(page);
    }
  }, [isAuthenticated, page]);

  const lastSessionRef = useCallback((node: HTMLDivElement) => {
    if (loading || !hasMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(prev => prev + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const handleSessionClick = (session: Session) => {
    setActiveSession(session.id);
    window.history.pushState({}, '', `/?view=chat&session=${session.id}`);
    window.dispatchEvent(new CustomEvent('sessionChange', { detail: session.id }));
  };

  if (!isAuthenticated) return null;

  return (
    <Flex direction="column" width="100%" height="100%" overflow="hidden">
      <Flex direction="column" px={6} py={4} borderBottom="1px solid" borderColor="gray.200">
        <Text fontSize="xl" fontWeight="bold">Rooms</Text>
      </Flex>

      <Box flex="1" overflowY="auto" px={4} py={2}>
        {sessions.map((session, index) => {
          const lastMessage = session.messages[0]?.value || "Start a conversation...";
          const messageTime = session.messages[0]?.timestamp || session.created_at;
          const isActive = activeSession === session.id;

          return (
            <MotionBox
              key={session.id}
              mb={2}
              borderBottom="1px solid"
              borderColor="gray.200"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
            >
              <Box
                p={3}
                borderRadius="md"
                bg={isActive ? 'blue.50' : 'transparent'}
                _hover={{ bg: isActive ? 'blue.50' : 'gray.100' }}
                cursor="pointer"
                onClick={() => handleSessionClick(session)}
              >
                <VStack align="start" gap={1}>
                  <HStack justify="space-between" width="100%">
                    <Text fontWeight="medium">
                      Room #{session.id}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {formatDistanceToNow(new Date(messageTime), { addSuffix: true })}
                    </Text>
                  </HStack>
                  <HStack width="100%">
                    <Text fontSize="sm" color="gray.500" flex={1}>
                      {lastMessage}
                    </Text>
                    {session.messages.length > 0 && (
                      <Badge colorScheme={isActive ? 'blue' : 'gray'} variant="subtle" fontSize="xs">
                        {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </HStack>
                </VStack>
              </Box>
            </MotionBox>
          );
        })}

        <div ref={lastSessionRef} style={{ height: '1px' }} />

        {loading && (
          <Flex justify="center" py={4}>
            <Spinner size="md" />
          </Flex>
        )}

        {!hasMore && sessions.length > 0 && (
          <Text py={4} color="gray.500" textAlign="center">
            No more conversations to load
          </Text>
        )}

        {!loading && sessions.length === 0 && (
          <Text py={4} color="gray.500" textAlign="center">
            No conversations yet
          </Text>
        )}
      </Box>
    </Flex>
  );
};