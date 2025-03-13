import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { Box, Text, Input, Flex, VStack, IconButton, Spinner, Center, Button } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPaperPlane, FaSync } from "react-icons/fa";
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
  const [retryCount, setRetryCount] = useState(0);
  
  // Simplify room ID tracking - no need for both state and memo
  const roomIdRef = useRef<string>(roomId || uuidv4());
  
  // Use a single socket ref for managing connection
  const socketRef = useRef<Socket | null>(null);

  // Create system message helper function
  const createSystemMessage = useCallback((text: string) => ({
    id: `system-${Date.now()}-${uuidv4()}`,
    text,
    sender: 'system',
    timestamp: new Date()
  }), []);

  // Consolidated socket connection logic
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.token) {
      if (!loading) return;
      
      setConnectionError(!currentUser?.token ? 
        'No authentication token available. Please log in again.' : 
        'Please log in to join the chat');
      setLoading(false);
      return;
    }

    // Clean up previous connection if it exists
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('Connecting to chat server...');
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

    // Socket event handlers
    socket.on('connect', () => {
      console.log(roomIdRef.current);
      console.log('Socket connected successfully');
      setConnectionError(null);
      setLoading(false);
    });

    socket.on('room_created', (data: { roomId: string }) => {
      console.log('Room created by server:', data.roomId);
      roomIdRef.current = data.roomId;
      setRoomName(`Chat Room #${data.roomId.substring(0, 8)}`);
      
      // Update URL for sharing
      const url = new URL(window.location.href);
      url.searchParams.set('roomId', data.roomId);
      window.history.pushState({}, '', url.toString());
    });

    socket.on('room_data', (data: { messages: ChatMessage[], users: User[] }) => {
      setMessages(data.messages || []);
      setUsers(data.users || []);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      
      let errorMessage = 'Connection error. Please try again.';
      if (err.message.includes('Authentication error')) {
        errorMessage = 'Authentication failed. Please try logging out and back in.';
      } else if (err.message.includes('WebSocket')) {
        errorMessage = 'Connection failed. Please check your network and try again.';
      } else {
        errorMessage = `Connection error: ${err.message}`;
      }
      
      setConnectionError(errorMessage);
      setLoading(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (!['io client disconnect', 'transport close'].includes(reason)) {
        setConnectionError(
          reason === 'io server disconnect' 
            ? 'Disconnected by server. Please try reconnecting.' 
            : 'Connection lost. Server might be unavailable.'
        );
      }
    });

    socket.on('message', (message: ChatMessage) => {
      setMessages(prev => {
        // Only add if message doesn't exist already (using Set for more efficient lookup)
        const messageIds = new Set(prev.map(msg => msg.id));
        return messageIds.has(message.id) ? prev : [...prev, message];
      });
    });

    socket.on('user_joined', (user: User) => {
      setUsers(prev => [...prev, user]);
      
      // Add system message about user joining
      setMessages(prevMsgs => [
        ...prevMsgs, 
        createSystemMessage(`${user.username} joined the chat`)
      ]);
    });

    socket.on('user_left', (userId: string) => {
      setUsers(prev => {
        // Capture username before removing
        const userLeft = prev.find(u => u.id === userId);
        const username = userLeft?.username || 'A user';
        
        // Add system message about user leaving
        setMessages(prevMsgs => [
          ...prevMsgs, 
          createSystemMessage(`${username} left the chat`)
        ]);
        
        return prev.filter(u => u.id !== userId);
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, currentUser, retryCount, createSystemMessage]);

  // Auto-scroll when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    // Small timeout to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  // Memoize message variants
  const messageVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      transition: { duration: 0.2 }
    }
  }), []);

  // Optimized handlers
  const handleRetryConnection = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }, []);

  const sendMessage = useCallback(() => {
    if (socketRef.current && message.trim()) {
      socketRef.current.emit('message', {
        text: message,
        sender: currentUser?.username
      });
      setMessage("");
    }
  }, [message, currentUser?.username]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendMessage();
  }, [sendMessage]);

  // Render logic - optimized conditionals
  if (loading) {
    return (
      <Center height="100%">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Box p={4}>Please log in to join the chat</Box>;
  }

  if (connectionError) {
    return (
      <Center height="100%" flexDirection="column" gap={4} p={4}>
        <Box 
          p={4} 
          bg="red.100" 
          color="red.700" 
          borderRadius="md" 
          borderLeft="4px solid" 
          borderColor="red.500"
        >
          {connectionError}
        </Box>
        <Button 
          colorScheme="blue" 
          onClick={handleRetryConnection}
        >
          <Flex align="center" gap="2">
            <FaSync />
            <Text>Retry Connection</Text>
          </Flex>
        </Button>
      </Center>
    );
  }

  // Main chat UI component
  return (
    <Flex direction="column" width="100%" height="100%" overflow="hidden">
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
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
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