import React, { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Tooltip } from "@/components/tooltip"
import { Box, Text, Flex, VStack, Spinner, Center } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/auth/context";
import { v4 as uuidv4 } from 'uuid';
import { ChatInput } from "@/components/chat/chat_input";
import { useTranslation } from 'react-i18next';

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

const LOCAL_STORAGE_KEY_PREFIX = 'chat_messages_';

const MAX_CACHED_MESSAGES = 100;

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

  const [retryCount, setRetryCount] = useState(0);

  // Use the roomId from props only, not from localStorage
  const roomIdRef = useRef<string | undefined>(roomId);
  const socketRef = useRef<Socket | null>(null);

  const createSystemMessage = useCallback((text: string) => ({
    id: `system-${Date.now()}-${uuidv4()}`,
    text,
    sender: 'system',
    timestamp: new Date()
  }), []);

  const [agents] = useState<User[]>([
    { id: 'agent', username: 'agent' },
  ]);

  // Add this function to fetch room details
  const fetchRoomDetails = useCallback(async (roomIdToFetch: string) => {
    try {
      console.log("Fetching room details for:", roomIdToFetch);
      const response = await fetch(`/api/chat/get_room?id=${roomIdToFetch}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Room data received:", data);
        // Check if data.name exists and is not empty before using it
        if (data.name && data.name.trim() !== '') {
          setRoomName(data.name);
          console.log("Room name set to:", data.name);
        } else {
          setRoomName(`${t('chat_room')} #${roomIdToFetch.substring(0, 8)}`);
          console.log("No valid name in data, using fallback:", `${t('chat_room')} #${roomIdToFetch.substring(0, 8)}`);
        }
      } else {
        console.log("Error response from room API:", response.status);
        setRoomName(`${t('chat_room')} #${roomIdToFetch.substring(0, 8)}`);
      }
    } catch (error) {
      console.error("Error fetching room details:", error);
      setRoomName(`${t('chat_room')} #${roomIdToFetch.substring(0, 8)}`);
    }
  }, [t]);

  // Add a useEffect that runs on component mount to fetch room details
  useEffect(() => {
    // Only run this on initial mount if we have a roomId
    if (roomIdRef.current) {
      console.log("Initial mount - fetching room details for:", roomIdRef.current);
      fetchRoomDetails(roomIdRef.current);
    }
  }, [fetchRoomDetails]);

  // Add this effect to check URL for roomId when component mounts or becomes visible
  useEffect(() => {
    // Check URL for roomId parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const roomIdFromUrl = url.searchParams.get('roomId');

      if (roomIdFromUrl && roomIdFromUrl !== roomIdRef.current) {
        console.log("Found roomId in URL:", roomIdFromUrl);
        roomIdRef.current = roomIdFromUrl;

        // Fetch room details
        fetchRoomDetails(roomIdFromUrl);

        // Reconnect socket with new roomId
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          setRetryCount(prev => prev + 1); // Trigger socket reconnection
        }

        // Load cached messages for this room
        const cachedMessages = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomIdFromUrl}`);
        if (cachedMessages) {
          setMessages(JSON.parse(cachedMessages));
        } else {
          setMessages([]); // Clear messages when switching to a new room
        }
      }
    }
  }, [fetchRoomDetails]);

  // Add this effect to listen for visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When tab becomes visible again, check URL for roomId
        const url = new URL(window.location.href);
        const roomIdFromUrl = url.searchParams.get('roomId');

        if (roomIdFromUrl && roomIdFromUrl !== roomIdRef.current) {
          console.log("Tab visible again, updating roomId from URL:", roomIdFromUrl);
          roomIdRef.current = roomIdFromUrl;

          // Fetch room details
          fetchRoomDetails(roomIdFromUrl);

          // Reconnect socket with new roomId
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setRetryCount(prev => prev + 1); // Trigger socket reconnection
          }

          // Load cached messages for this room
          const cachedMessages = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomIdFromUrl}`);
          if (cachedMessages) {
            setMessages(JSON.parse(cachedMessages));
          } else {
            setMessages([]); // Clear messages when switching to a new room
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchRoomDetails]);

  // Save messages to localStorage whenever they change (optimized)
  useEffect(() => {
    if (roomIdRef.current) {
      const messagesToCache = messages.slice(-MAX_CACHED_MESSAGES);
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomIdRef.current}`, JSON.stringify(messagesToCache));
    }
  }, [messages]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.token) {
      setConnectionError('Please log in to join the chat');
      setLoading(false);
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // If no roomId is provided, just show the interface without connecting
    if (!roomIdRef.current) {
      setLoading(false);
      setRoomName(t('chat'));
      return;
    }

    // Fetch room details immediately, don't wait for socket connection
    console.log("Socket effect - fetching room details for:", roomIdRef.current);
    fetchRoomDetails(roomIdRef.current);

    setLoading(true);
    console.log("Attempting to connect to socket server...");
    console.log("Room ID:", roomIdRef.current);

    // Determine the correct socket server URL
    const socketUrl = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : `${window.location.protocol}//${window.location.hostname}:3001`;

    console.log("Socket URL:", socketUrl);

    const socket = io(socketUrl, {
      path: '/socket.io/chat/',
      auth: {
        token: currentUser.token,
        roomId: roomIdRef.current
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("Socket connected successfully!");
      setConnectionError(null);
      setLoading(false);

      // Fetch room details after connection
      if (roomIdRef.current) {
        console.log("Fetching room details after connection for:", roomIdRef.current);
        fetchRoomDetails(roomIdRef.current);
      }
    });

    socket.on('room_created', (data: { roomId: string }) => {
      roomIdRef.current = data.roomId;
      setRoomName(`${t('chat_room')} #${data.roomId.substring(0, 8)}`);
      const url = new URL(window.location.href);
      url.searchParams.set('roomId', data.roomId);
      window.history.pushState({}, '', url.toString());
    });

    socket.on('room_data', (data: { messages: ChatMessage[], users: User[] }) => {
      setMessages(data.messages || []);
      setUsers(data.users || []);
    });

    socket.on('connect_error', (err) => {
      console.error("Socket connection error:", err);
      setConnectionError(`Connection error: ${err.message}`);
      setLoading(false);
    });

    socket.on('error', (err) => {
      console.error("Socket error:", err);
      setConnectionError(`Socket error: ${err.message || 'Unknown error'}`);
    });

    socket.on('disconnect', () => {
      setConnectionError('Disconnected from server.');
    });

    socket.on('message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user_joined', (user: User) => {
      if (user.username.startsWith('agent')) {
        return;
      }
      setUsers(prev => [...prev, user]);
      setMessages(prevMsgs => [...prevMsgs, createSystemMessage(`${user.username} joined the chat`)]);
    });

    socket.on('user_left', (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setMessages(prevMsgs => [...prevMsgs, createSystemMessage(`A user left the chat`)]);
    });

    return () => {
      console.log("Disconnecting socket...");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, currentUser, retryCount, createSystemMessage, t, fetchRoomDetails]);

  // Memoize message rendering function to prevent unnecessary re-renders
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

  // Optimize scrolling behavior
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Replace the previous useEffect for scrolling with a more efficient one
  useEffect(() => {
    // Only scroll if we're already near the bottom or if the last message is from the current user
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage && (lastMessage.sender === currentUser?.username || lastMessage.sender === currentUser?.id?.toString());

      if (isNearBottom || isOwnMessage) {
        scrollToBottom();
      }
    }
  }, [messages, currentUser?.username, currentUser?.id, scrollToBottom]);

  const accessMCP = useCallback(async (agentName: string, messageText: string) => {
    // Add error handling and prevent UI blocking
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

      // Set a timeout to prevent long-running requests from blocking the UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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

      const data = await response.json();
      console.log('Agent response:', data);
      return data;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Agent request timed out');
      } else {
        console.error('Error accessing MCP:', error);
      }
      // Don't rethrow - we don't want to crash the chat experience
    }
  }, [messages, currentUser?.username]);

  const sendMessage = useCallback(() => {
    if (socketRef.current && message.trim()) {
      const agentMentionRegex = /@(agent\S*)\b/g;
      const mentionMatches = [...message.matchAll(agentMentionRegex)];

      mentionMatches.forEach(match => {
        const agentName = match[1];
        accessMCP(agentName, message);
      });

      socketRef.current.emit('message', { text: message, sender: currentUser?.username });
      setMessage("");
    }
  }, [message, currentUser?.username, accessMCP]);

  // Modify the handleRoomSelection function
  useEffect(() => {
    const handleRoomSelection = (event: CustomEvent) => {
      if (event.detail && event.detail !== roomIdRef.current) {
        const newRoomId = event.detail;
        console.log("Room selection event - changing to room:", newRoomId);

        roomIdRef.current = newRoomId;

        // Explicitly fetch room details here
        console.log("Room selection event - fetching room details for:", newRoomId);
        fetchRoomDetails(newRoomId);

        setRetryCount(prev => prev + 1); // Trigger socket reconnection

        // Load cached messages for this room
        const cachedMessages = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${newRoomId}`);
        if (cachedMessages) {
          setMessages(JSON.parse(cachedMessages));
        } else {
          setMessages([]); // Clear messages when switching to a new room
        }

        // Update URL to reflect the new room
        const url = new URL(window.location.href);
        url.searchParams.set('roomId', newRoomId);
        window.history.pushState({}, '', url.toString());
      }
    };

    window.addEventListener('roomChange', handleRoomSelection as EventListener);

    return () => {
      window.removeEventListener('roomChange', handleRoomSelection as EventListener);
    };
  }, [fetchRoomDetails]);

  // Add this effect to monitor roomName changes
  useEffect(() => {
    console.log("Room name state changed to:", roomName);
  }, [roomName]);

  if (loading) return <Center height="100%"><Spinner size="xl" color="blue.500" /></Center>;
  if (!isAuthenticated) return <Box p={4}>Please log in to join the chat</Box>;
  if (connectionError) return <Center height="100%" p={4}><Text>{connectionError}</Text></Center>;

  // Show a different UI when no room is selected
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