import React, { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Box, Text, Input, Flex, VStack, IconButton, Spinner, Center } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPaperPlane } from "react-icons/fa";
import { useAuth } from "@/auth/context";
import { v4 as uuidv4 } from 'uuid';

const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
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
  const { user: currentUser, isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [roomName, setRoomName] = useState<string>("Chat Room");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [retryCount, setRetryCount] = useState(0);

  const roomIdRef = useRef<string | undefined>(roomId);
  const socketRef = useRef<Socket | null>(null);

  const createSystemMessage = useCallback((text: string) => ({
    id: `system-${Date.now()}-${uuidv4()}`,
    text,
    sender: 'system',
    timestamp: new Date()
  }), []);

  // Load cached messages on mount
  useEffect(() => {
    if (roomIdRef.current) {
      const cachedMessages = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${roomIdRef.current}`);
      if (cachedMessages) {
        setMessages(JSON.parse(cachedMessages));
      }
    }
  }, []);

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

    setLoading(true);

    const socket = io(window.location.hostname, {
      path: '/socket.io/',
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
      setConnectionError(null);
      setLoading(false);
    });

    socket.on('room_created', (data: { roomId: string }) => {
      roomIdRef.current = data.roomId;
      setRoomName(`Chat Room #${data.roomId.substring(0, 8)}`);
      const url = new URL(window.location.href);
      url.searchParams.set('roomId', data.roomId);
      window.history.pushState({}, '', url.toString());
    });

    socket.on('room_data', (data: { messages: ChatMessage[], users: User[] }) => {
      setMessages(data.messages || []);
      setUsers(data.users || []);
    });

    socket.on('connect_error', (err) => {
      setConnectionError(`Connection error: ${err.message}`);
      setLoading(false);
    });

    socket.on('disconnect', () => {
      setConnectionError('Disconnected from server.');
    });

    socket.on('message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user_joined', (user: User) => {
      setUsers(prev => [...prev, user]);
      setMessages(prevMsgs => [...prevMsgs, createSystemMessage(`${user.username} joined the chat`)]);
    });

    socket.on('user_left', (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setMessages(prevMsgs => [...prevMsgs, createSystemMessage(`A user left the chat`)]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, currentUser, retryCount, createSystemMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // const handleRetryConnection = useCallback(() => setRetryCount(prev => prev + 1), []);
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value), []);
  const sendMessage = useCallback(() => {
    if (socketRef.current && message.trim()) {
      socketRef.current.emit('message', { text: message, sender: currentUser?.username });
      setMessage("");
    }
  }, [message, currentUser?.username]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendMessage();
  }, [sendMessage]);

  if (loading) return <Center height="100%"><Spinner size="xl" color="blue.500" /></Center>;
  if (!isAuthenticated) return <Box p={4}>Please log in to join the chat</Box>;
  if (connectionError) return <Center height="100%" p={4}><Text>{connectionError}</Text></Center>;

  return (
    <Flex direction="column" width="100%" height="100%" overflow="hidden" px={20}>
      <Flex direction="column" px={6} py={4} borderBottom="1px solid" borderColor="gray.200">
        <Text fontSize="xl" fontWeight="bold">
          {roomName} {roomIdRef.current && <Text as="span" color="gray.500" fontSize="md">(ID: {roomIdRef.current.substring(0, 8)})</Text>}
        </Text>
        <Flex mt={2}>
          <Text fontSize="sm" color="gray.500" mr={2}>
            Active Users ({users.length}):
          </Text>
          <Text fontSize="sm" color="gray.700">
            {users.map(user => user.username).join(', ')}
          </Text>
        </Flex>
      </Flex>

      <MotionBox flex="1" overflow="auto" p={4} ref={scrollContainerRef}>
        <VStack align="stretch">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isCurrentUser = msg.sender === currentUser?.username || msg.sender === currentUser?.id?.toString();
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
                  <Box
                    bg={isSystem ? "gray.300" : isCurrentUser ? "blue.500" : "gray.100"}
                    color={isSystem ? "gray.700" : isCurrentUser ? "white" : "gray.800"}
                    px={4}
                    py={2}
                    borderRadius="lg"
                    boxShadow="sm"
                    maxWidth={isSystem ? "60%" : "100%"}
                  >
                    {!isSystem && <Text fontSize="sm" fontWeight="bold">{msg.sender}</Text>}
                    <Text>{msg.text}</Text>
                    <Text fontSize="xs" textAlign="right">{new Date(msg.timestamp).toLocaleTimeString()}</Text>
                  </Box>
                </MotionFlex>
              );
            })}
          </AnimatePresence>
          <Box ref={messagesEndRef} />
        </VStack>
      </MotionBox>

      <Box p={4}>
        <Flex gap={2}>
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            borderRadius="full"
          />
          <IconButton
            aria-label="Send"
            colorScheme="blue"
            onClick={sendMessage}
            borderRadius="full"
          >
            <FaPaperPlane />
          </IconButton>
        </Flex>
      </Box>
    </Flex>
  );
});

ChatRoom.displayName = 'ChatRoom';
export default React.memo(ChatRoom);