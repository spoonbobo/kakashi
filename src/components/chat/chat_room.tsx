import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { Tooltip } from "@/components/tooltip"
import { Box, Text, Flex, VStack, Spinner, Center } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/auth/context";
import { v4 as uuidv4 } from 'uuid';
import { ChatInput } from "@/components/chat/chat_input";
import { useTranslation } from 'react-i18next';
import Toast, { showSuccessToast, showErrorToast, showInfoToast } from '@/components/toast/toast';

const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  task_id?: string;
  is_tool_call?: boolean;
}

interface User {
  id: string;
  username: string;
}

interface RoomData {
  name: string;
  id: string;
  created_at: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'chat_messages_';
const MAX_CACHED_MESSAGES = 100;
const FETCH_DEBOUNCE_TIME = 500;
const RECONNECTION_ATTEMPTS = 5;
const SOCKET_TIMEOUT = 15000; // Increased timeout

const messageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const ChatRoom = React.memo(({ roomId }: { roomId?: string }) => {
  const { t } = useTranslation();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [roomName, setRoomName] = useState<string>("Chat Room");
  // const toast = useToast();

  // Socket and room state management
  const [retryCount, setRetryCount] = useState(0);
  const roomIdRef = useRef<string | undefined>(roomId);
  const socketRef = useRef<Socket | null>(null);
  const [receivedRoomData, setReceivedRoomData] = useState(false);
  const [lastFetchedRoomId, setLastFetchedRoomId] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const fetchingRef = useRef(false);

  // Memoize agents to prevent unnecessary re-renders
  const agents = useMemo(() => [{ id: 'agent', username: 'agent' }], []);

  // Create system message with memoization
  const createSystemMessage = useCallback((text: string) => ({
    id: `system-${Date.now()}-${uuidv4()}`,
    text,
    sender: 'system',
    timestamp: new Date()
  }), []);

  // Optimized fetchRoomDetails function
  const fetchRoomDetails = useCallback(async (roomIdToFetch: string) => {
    // Skip if already fetching, recently fetched, or we have socket data
    if (
      fetchingRef.current ||
      roomIdToFetch === lastFetchedRoomId ||
      (receivedRoomData && roomData?.id === roomIdToFetch)
    ) {
      return;
    }

    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    // Set a flag to prevent concurrent fetches
    fetchingRef.current = true;

    // Set a timeout to prevent rapid consecutive fetches
    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log("Fetching room details for:", roomIdToFetch);
        setLastFetchedRoomId(roomIdToFetch);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`/api/chat/get_room?id=${roomIdToFetch}`, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Error response: ${response.status}`);
        }

        const data = await response.json();

        // Store the complete room data
        setRoomData(data);

        // Update room name if needed
        if (data.name && data.name.trim() !== '') {
          setRoomName(data.name);
        } else {
          setRoomName(`${t('chat_room')} #${roomIdToFetch.substring(0, 8)}`);
        }
      } catch (error) {
        console.error("Error fetching room details:", error);
        // Only set fallback room name if we don't already have one
        if (!roomName || roomName === "Chat Room") {
          setRoomName(`${t('chat_room')} #${roomIdToFetch.substring(0, 8)}`);
        }
      } finally {
        fetchingRef.current = false;
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
      }
    }, FETCH_DEBOUNCE_TIME);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      fetchingRef.current = false;
    };
  }, [t, lastFetchedRoomId, receivedRoomData, roomData, roomName]);

  // Load cached messages on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const roomIdFromUrl = url.searchParams.get('roomId');

      if (roomIdFromUrl && roomIdFromUrl !== roomIdRef.current) {
        console.log("Found roomId in URL:", roomIdFromUrl);
        roomIdRef.current = roomIdFromUrl;

        // Load cached messages for this room
        const cachedMessages = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomIdFromUrl}`);
        if (cachedMessages) {
          try {
            setMessages(JSON.parse(cachedMessages));
          } catch (e) {
            console.error("Error parsing cached messages:", e);
            localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomIdFromUrl}`);
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
      }
    }

    // Cleanup function
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      fetchingRef.current = false;
    };
  }, []);

  // Visibility change handler with improved error handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          const url = new URL(window.location.href);
          const roomIdFromUrl = url.searchParams.get('roomId');

          if (roomIdFromUrl && roomIdFromUrl !== roomIdRef.current) {
            console.log("Tab visible again, updating roomId from URL:", roomIdFromUrl);
            roomIdRef.current = roomIdFromUrl;

            // Reset socket connection
            if (socketRef.current) {
              socketRef.current.disconnect();
              socketRef.current = null;
              setRetryCount(prev => prev + 1);
            }

            // Load cached messages
            const cachedMessages = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomIdFromUrl}`);
            if (cachedMessages) {
              try {
                setMessages(JSON.parse(cachedMessages));
              } catch (e) {
                console.error("Error parsing cached messages:", e);
                localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomIdFromUrl}`);
                setMessages([]);
              }
            } else {
              setMessages([]);
            }
          } else if (socketRef.current && !socketRef.current.connected && roomIdRef.current) {
            // Reconnect if socket is disconnected but should be connected
            console.log("Tab visible again, reconnecting socket");
            setRetryCount(prev => prev + 1);
          }
        } catch (error) {
          console.error("Error in visibility change handler:", error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Save messages to localStorage with error handling
  useEffect(() => {
    if (roomIdRef.current && messages.length > 0) {
      try {
        const messagesToCache = messages.slice(-MAX_CACHED_MESSAGES);
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomIdRef.current}`, JSON.stringify(messagesToCache));
      } catch (error) {
        console.error("Error saving messages to localStorage:", error);
      }
    }
  }, [messages]);

  // Socket connection effect with improved reliability
  useEffect(() => {
    // Early returns for invalid states
    if (!isAuthenticated || !currentUser?.token) {
      setConnectionError('Please log in to join the chat');
      setLoading(false);
      return;
    }

    if (!roomIdRef.current) {
      setLoading(false);
      setRoomName(t('chat'));
      return;
    }

    // CRITICAL FIX: Don't disconnect existing socket if it's already connected to the same room
    if (socketRef.current) {
      const currentSocketRoom = socketRef.current.auth?.roomId;
      if (currentSocketRoom === roomIdRef.current) {
        console.log("Socket already connected to room:", roomIdRef.current);
        return; // Skip reconnection if already connected to the same room
      }

      console.log("Cleaning up existing socket connection");
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Reset state for new connection
    setReceivedRoomData(false);
    setLoading(true);

    console.log("Attempting to connect to socket server for room:", roomIdRef.current);

    // Determine socket URL
    const socketUrl = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : `${window.location.protocol}//${window.location.hostname}:3001`;

    // Create socket connection with explicit reconnection settings
    const socket = io(socketUrl, {
      path: '/socket.io/chat/',
      auth: {
        token: currentUser.token,
        roomId: roomIdRef.current
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnection: true, // Ensure reconnection is enabled
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Socket event handlers
    socket.on('connect', () => {
      console.log("Socket connected successfully!");
      setConnectionError(null);
      setLoading(false);
      showSuccessToast("Connected to chat room");
    });

    socket.on('room_created', (data: { roomId: string }) => {
      roomIdRef.current = data.roomId;
      setRoomName(`${t('chat_room')} #${data.roomId.substring(0, 8)}`);

      // Update URL
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('roomId', data.roomId);
        window.history.pushState({}, '', url.toString());
      } catch (error) {
        console.error("Error updating URL:", error);
      }
    });

    socket.on('room_data', (data: {
      messages: ChatMessage[],
      users: User[],
      room?: RoomData
    }) => {
      try {
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }

        if (Array.isArray(data.users)) {
          setUsers(data.users);
        }

        // Mark that we've received data from socket
        setReceivedRoomData(true);

        // Update room data if available
        if (data.room) {
          setRoomData(data.room);
          setLastFetchedRoomId(data.room.id);

          if (data.room.name && data.room.name.trim() !== '') {
            setRoomName(data.room.name);
          }
        } else if (roomIdRef.current) {
          setRoomName(`${t('chat_room')} #${roomIdRef.current.substring(0, 8)}`);
        }
      } catch (error) {
        console.error("Error processing room_data event:", error);
      }
    });

    socket.on('connect_error', (err) => {
      console.error("Socket connection error:", err);
      setConnectionError(`Connection error: ${err.message}`);
      setLoading(false);
      showErrorToast(`Connection error: ${err.message}`);
    });

    socket.on('error', (err) => {
      console.error("Socket error:", err);
      setConnectionError(`Socket error: ${err.message || 'Unknown error'}`);
      showErrorToast(`Socket error: ${err.message || 'Unknown error'}`);
    });

    socket.on('disconnect', (reason) => {
      console.log("Socket disconnected, reason:", reason);
      setConnectionError('Disconnected from server.');
      if (reason !== 'io client disconnect') {
        showInfoToast("Disconnected from chat room");
      }
    });

    socket.on('message', (message: ChatMessage) => {
      try {
        setMessages(prev => [...prev, message]);
      } catch (error) {
        console.error("Error processing message event:", error);
      }
    });

    socket.on('user_joined', (user: User) => {
      try {
        if (user.username.startsWith('agent')) {
          return;
        }

        // Check if user already exists in the users array
        setUsers(prev => {
          if (!prev.some(u => u.id === user.id)) {
            return [...prev, user];
          }
          return prev;
        });

        setMessages(prevMsgs => [...prevMsgs, createSystemMessage(`${user.username} joined the chat`)]);
      } catch (error) {
        console.error("Error processing user_joined event:", error);
      }
    });

    socket.on('user_left', (userId: string) => {
      try {
        // Find the username before removing from users list
        const leavingUser = users.find(u => u.id === userId);
        const username = leavingUser ? leavingUser.username : 'A user';

        setUsers(prev => prev.filter(u => u.id !== userId));
        setMessages(prevMsgs => [...prevMsgs, createSystemMessage(`${username} left the chat`)]);
      } catch (error) {
        console.error("Error processing user_left event:", error);
      }
    });

    // CRITICAL FIX: Add reconnect event handler
    socket.io.on("reconnect_attempt", (attempt) => {
      console.log(`Socket reconnection attempt ${attempt}`);
      showInfoToast(`Reconnecting to chat room (attempt ${attempt})`);
    });

    socket.io.on("reconnect", () => {
      console.log("Socket reconnected successfully");
      showSuccessToast("Reconnected to chat room");
    });

    socket.io.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
      showErrorToast("Failed to reconnect to chat room");
    });

    socket.io.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
      setConnectionError("Connection failed after multiple attempts. Please refresh the page.");
      showErrorToast("Connection failed after multiple attempts. Please refresh the page.");
    });

    // Fetch room details if needed
    if (!receivedRoomData && roomIdRef.current !== lastFetchedRoomId) {
      fetchRoomDetails(roomIdRef.current);
    }

    // Cleanup function
    return () => {
      if (socketRef.current) {
        console.log("Disconnecting socket in cleanup...");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, currentUser, retryCount, createSystemMessage, t, roomIdRef.current, showSuccessToast, showErrorToast, showInfoToast, users, fetchRoomDetails, lastFetchedRoomId, receivedRoomData]);

  // Memoize message rendering function
  const renderMessage = useCallback((msg: ChatMessage) => {
    const isCurrentUser = msg.sender === currentUser?.username || msg.sender === currentUser?.id?.toString();
    const isToolCall = msg.is_tool_call;
    const isSystem = msg.sender === 'system';

    return (
      <MotionFlex
        key={msg.id}
        maxWidth="80%"
        alignSelf={isSystem ? 'center' : isCurrentUser ? 'flex-end' : 'flex-start'}
        variants={messageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3 }}
        mb={2}
      >
        <Tooltip content={new Date(msg.timestamp).toLocaleString([], {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })}>
          <Box
            bg={isSystem ? "gray.200" : isCurrentUser ? "blue.500" : "gray.100"}
            color={isSystem ? "gray.600" : isCurrentUser ? "white" : "gray.800"}
            px={4}
            py={isSystem ? 1 : 2}
            borderRadius={isSystem ? "md" : "lg"}
            boxShadow={isSystem ? "none" : "sm"}
            maxWidth={isSystem ? "70%" : "100%"}
            width={isSystem ? "auto" : undefined}
            textAlign={isSystem ? "center" : "left"}
            borderWidth={isSystem ? "1px" : "0"}
            borderColor={isSystem ? "gray.300" : "transparent"}
            mx={isSystem ? "auto" : undefined}
          >
            {!isSystem && <Text fontSize="sm" fontWeight="bold">{msg.sender}</Text>}
            <Text fontSize={isSystem ? "sm" : "md"} fontStyle={isSystem ? "italic" : "normal"}>
              {isToolCall
                ? `${msg.sender} initiated task ${msg.id}.`
                : msg.text}
            </Text>
            {!isSystem && <Text fontSize="xs" textAlign="right">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </Text>}
          </Box>
        </Tooltip>
      </MotionFlex>
    );
  }, [currentUser?.username, currentUser?.id]);

  // Optimized scrolling behavior
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer && messages.length > 0) {
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage && (lastMessage.sender === currentUser?.username || lastMessage.sender === currentUser?.id?.toString());

      if (isNearBottom || isOwnMessage) {
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(scrollToBottom);
      }
    }
  }, [messages, currentUser?.username, currentUser?.id, scrollToBottom]);

  // MCP integration with improved error handling
  const accessMCP = useCallback(async (agentName: string, messageText: string) => {
    try {
      const messageHistory = messages.slice(-10).map(msg => ({
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp
      }));

      const contextData = {
        sender: currentUser?.username,
        text: messageText,
        mentioned_agent: agentName,
        history: messageHistory,
        room_id: roomIdRef.current
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/mcp/api/app/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Agent request timed out');
        showInfoToast(`Request to agent ${agentName} timed out.`);
      } else {
        console.error('Error accessing MCP:', error);
        showErrorToast(`Error communicating with agent ${agentName}.`);
      }
    }
  }, [messages, currentUser?.username]);

  // Send message function with improved error handling
  const sendMessage = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      showErrorToast("Cannot send message: Not connected to chat room");
      return;
    }

    if (message.trim()) {
      try {
        const agentMentionRegex = /@(agent\S*)\b/g;
        const mentionMatches = [...message.matchAll(agentMentionRegex)];

        mentionMatches.forEach(match => {
          const agentName = match[1];
          accessMCP(agentName, message);
        });

        socketRef.current.emit('message', {
          id: uuidv4(),
          text: message,
          sender: currentUser?.username,
          timestamp: new Date()
        });

        setMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
        showErrorToast(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [message, currentUser?.username, accessMCP]);

  // Room selection event handler with improved reliability
  useEffect(() => {
    const handleRoomSelection = (event: CustomEvent) => {
      if (event.detail && event.detail !== roomIdRef.current) {
        try {
          const newRoomId = event.detail;
          console.log("Room selection event - changing to room:", newRoomId);

          // Update the ref first
          roomIdRef.current = newRoomId;

          // Reset states
          setReceivedRoomData(false);
          setLastFetchedRoomId(null);

          // Load cached messages
          const cachedMessages = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${newRoomId}`);
          if (cachedMessages) {
            try {
              setMessages(JSON.parse(cachedMessages));
            } catch (e) {
              console.error("Error parsing cached messages:", e);
              localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${newRoomId}`);
              setMessages([]);
            }
          } else {
            setMessages([]);
          }

          // Update URL
          const url = new URL(window.location.href);
          url.searchParams.set('roomId', newRoomId);
          window.history.pushState({}, '', url.toString());

          // Force disconnect and reconnect with new room ID
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
          }

          // Trigger reconnection after a short delay
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 100);
        } catch (error) {
          console.error("Error in room selection handler:", error);
          showErrorToast("Failed to switch chat rooms. Please try again.");
        }
      }
    };

    window.addEventListener('roomChange', handleRoomSelection as EventListener);
    return () => {
      window.removeEventListener('roomChange', handleRoomSelection as EventListener);
    };
  }, []);

  // Render UI based on state
  if (loading) return <Center height="100%"><Spinner size="xl" color="blue.500" /></Center>;
  if (!isAuthenticated) return <Box p={4}>Please log in to join the chat</Box>;
  if (connectionError) {
    return (
      <Center height="100%" p={4} flexDirection="column">
        <Text mb={4}>{connectionError}</Text>
        <Box
          as="button"
          bg="blue.500"
          color="white"
          px={4}
          py={2}
          borderRadius="md"
          onClick={() => setRetryCount(prev => prev + 1)}
        >
          Retry Connection
        </Box>
      </Center>
    );
  }

  if (!roomIdRef.current) {
    return (
      <Flex direction="column" width="100%" height="100%" overflow="hidden" px={20} justifyContent="center" alignItems="center">
        <Text fontSize="xl" fontWeight="bold" mb={4}>{t('select_or_create_room')}</Text>
        <Text color="gray.500">{t('no_room_selected')}</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" width="100%" height="100%" overflow="hidden" px={20}>
      <Toast />

      <Flex direction="column" px={6} py={4} borderBottom="1px solid" borderColor="gray.200">
        <Text fontSize="xl" fontWeight="bold">
          {roomName} {roomIdRef.current && <Text as="span" color="gray.500" fontSize="md">(ID: {roomIdRef.current.substring(0, 8)})</Text>}
        </Text>
        <Flex mt={2}>
          <Text fontSize="sm" color="gray.500" mr={2}>
            {t('active_users')}: ({users.length})
          </Text>
          <Text fontSize="sm" color="gray.700">
            {users.map(user => user.username).join(', ')}
          </Text>
        </Flex>
      </Flex>

      <MotionBox flex="1" overflow="auto" p={4} ref={scrollContainerRef}>
        <VStack align="stretch">
          <AnimatePresence initial={false}>
            {messages.map(renderMessage)}
          </AnimatePresence>
          <Box ref={messagesEndRef} />
        </VStack>
      </MotionBox>

      <ChatInput
        message={message}
        setMessage={setMessage}
        sendMessage={sendMessage}
        users={users}
        agents={agents}
        currentUser={currentUser}
      />
    </Flex>
  );
});

ChatRoom.displayName = 'ChatRoom';
export default React.memo(ChatRoom);