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

  const [agents] = useState<User[]>([
    { id: 'agent', username: 'agent' },
  ]);

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
    // console.log("window.location.hostname", window.location.hostname);

    const socket = io(window.location.hostname, {
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
      setConnectionError(null);
      setLoading(false);
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
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, currentUser, retryCount, createSystemMessage]);

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