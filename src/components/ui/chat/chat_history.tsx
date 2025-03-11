"use client";

import { 
  Box, 
  Text, 
  Flex,
  IconButton,
  Badge,
} from "@chakra-ui/react";
import { useAuth } from "@/auth/context";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
// Create custom components that don't have the spacing issue
const VStack = (props: any) => <Flex direction="column" {...props} />;
const HStack = (props: any) => <Flex direction="row" {...props} />;

const MotionBox = motion(Box);
const ITEMS_PER_PAGE = 10;

// Define a type for the session
interface Session {
  id: string;
  created_at: string;
  messages: { id: string; timestamp: string; role: string; value: string }[];
}

export const Conversations = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isRouterReady, setIsRouterReady] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated, page]);

  // Wait for router to be ready
  useEffect(() => {
    setIsRouterReady(true);
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chat/get_sessions?page=${page}&limit=${ITEMS_PER_PAGE}`);
      const data = await response.json();
      setSessions(prev => page === 1 ? data.sessions : [...prev, ...data.sessions]);
      setHasMore(data.sessions.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleSessionClick = (session: Session) => {
    if (!isRouterReady) return;
    setActiveSession(session.id);
    window.history.pushState({}, '', `/?view=chat&session=${session.id}`);
    window.dispatchEvent(new CustomEvent('sessionChange', { detail: session.id }));
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box
      width="100%"
      height="100vh"
      display="flex"
      flexDirection="column"
      position="relative"
    >
      <VStack 
        align="stretch" 
        gap={4} 
        width="100%" 
        height="100%" 
        p={4} 
        px={30}
        overflow="hidden"
      >
        <HStack width="100%" justify="space-between" px={2}>
          <Text fontSize="xl" fontWeight="bold">Chats</Text>
        </HStack>
        
        <Box 
          width="100%" 
          flex="1" 
          overflowY="auto" 
          pr={2}
          borderRadius="md"
          css={{
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'gray.300',
              borderRadius: '24px',
            },
          }}
        >
          {loading && page === 1 ? (
            <Text p={4}>Loading conversations...</Text>
          ) : sessions.length === 0 ? (
            <Text p={4} color="gray.500">No conversations yet</Text>
          ) : (
            <Flex direction="column" width="100%">
              {sessions.map((session, index) => {
                const lastMessage = session.messages[0]?.value || "Start a conversation...";
                const messageTime = session.messages[0]?.timestamp || session.created_at;
                const isActive = activeSession === session.id;

                return (
                  <MotionBox 
                    key={session.id} 
                    width="100%" 
                    mb={2}
                    borderBottom="1px solid"
                    borderColor="gray.200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <Box 
                      p={3}
                      borderRadius="md"
                      bg={isActive ? 'blue.50' : 'transparent'}
                      _hover={{ bg: isActive ? 'blue.50' : 'gray.100' }}
                      cursor="pointer"
                      onClick={() => handleSessionClick(session)}
                      transition="background 0.2s"
                    >
                      <HStack gap={3} align="center" width="100%">
                        <VStack align="start" gap={1} flex={1} width="100%">
                          <HStack justify="space-between" width="100%">
                            <Text fontWeight="medium" truncate maxWidth="70%">
                              Chat #{session.id}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {formatDistanceToNow(new Date(messageTime), { addSuffix: true })}
                            </Text>
                          </HStack>
                          <HStack gap={2} width="100%">
                            <Text fontSize="sm" color="gray.500" truncate flex="1">
                              {lastMessage}
                            </Text>
                            {session.messages.length > 0 && (
                              <Badge 
                                colorScheme={isActive ? 'blue' : 'gray'} 
                                variant="subtle"
                                fontSize="xs"
                                ml="auto"
                              >
                                {session.messages.length} message{session.messages.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </HStack>
                        </VStack>
                      </HStack>
                    </Box>
                  </MotionBox>
                );
              })}
            </Flex>
          )}
        </Box>

        {hasMore && !loading && (
          <IconButton
            size="sm"
            onClick={loadMore}
            aria-label="Load more"
          >
            <FaChevronDown />
          </IconButton>
        )}
      </VStack>
    </Box>
  );
};