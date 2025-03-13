import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { Box, Text, Input, Flex, VStack, IconButton, Spinner, Center, Button } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPaperPlane, FaSync } from "react-icons/fa";
import { useAuth } from "@/auth/context";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

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

export const ChatRoom = React.memo(({ roomId }: { roomId: string }) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [roomName, setRoomName] = useState<string>("Chat Room");
  const [retryCount, setRetryCount] = useState(0);
  
  // Use an actual room ID or generate one if not provided
  const currentRoomId = roomId || uuidv4();

  // Keep track of socket connection state to prevent multiple connections
  const socketRef = useRef<Socket | null>(null);
  // Track if we've initialized the connection to prevent loops
  const connectionInitialized = useRef(false);

  // Instead of using useCallback, we'll use a regular function and call it directly in useEffect
  const setupSocketConnection = () => {
    if (!isAuthenticated || !currentUser || socketRef.current) {
      return;
    }

    console.log('Setting up new socket connection');
    
    // Only attempt to connect if we have a token
    if (!currentUser.token) {
      console.error('No authentication token available');
      setConnectionError('No authentication token available. Please log in again.');
      setLoading(false);
      return;
    }

    // Add debug logging for the token
    console.log('Using token:', currentUser.token);
    console.log('Using JWT_SECRET:', process.env.NEXT_PUBLIC_JWT_SECRET);
    console.log('NEXT_PUBLIC_SOCKET_URL:', window.location.hostname);

    const newSocket = io(window.location.hostname, {
      path: '/socket.io/',
      auth: {
        token: currentUser.token,
        roomId: currentRoomId
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    console.log('Token being sent:', currentUser.token);

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setConnectionError(null);
      setLoading(false);
      
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        text: `You joined the chat`,
        sender: 'system',
        timestamp: new Date()
      }]);
    })

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      console.error('Connection error object:', err);

      if (err.message.includes('Authentication error')) {
        setConnectionError('Authentication failed. Please try logging out and back in.');
      } else if (err.message.includes('WebSocket')) {
        setConnectionError('Connection failed. Please check your network and try again.');
      } else {
        setConnectionError(`Connection error: ${err.message}`);
      }
      setLoading(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        setConnectionError('Disconnected by server. Please try reconnecting.');
      } else if (reason === 'transport close') {
        setConnectionError('Connection lost. Server might be unavailable.');
      }
    });

    newSocket.on('room_data', (data: { messages: ChatMessage[], users: User[] }) => {
      // Add deduplication logic
      const uniqueUsers = Array.from(new Set(data.users.map(user => user.id)))
        .map(id => data.users.find(user => user.id === id))
        .filter(Boolean) as User[];
      setMessages(data.messages || []);
      setUsers(uniqueUsers);
    });

    newSocket.on('message', (message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists
        const messageExists = prev.some(msg => msg.id === message.id);
        return messageExists ? prev : [...prev, message];
      });
    });

    newSocket.on('user_joined', (user: User) => {
      // Check if user already exists before adding
      setUsers(prev => {
        const userExists = prev.some(u => u.id === user.id);
        return userExists ? prev : [...prev, user];
      });
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        text: `${user.username} joined the chat`,
        sender: 'system',
        timestamp: new Date()
      }]);
    });

    newSocket.on('user_left', (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      
      setMessages(prev => {
        const userLeft = users.find(u => u.id === userId);
        const username = userLeft ? userLeft.username : 'A user';
        return [...prev, {
          id: `system-${Date.now()}`,
          text: `${username} left the chat`,
          sender: 'system',
          timestamp: new Date()
        }];
      });
    });

    return () => {
      if (newSocket.connected) {
        newSocket.disconnect();
      }
      socketRef.current = null;
    };
  };

  // Use a separate useEffect for the initial setup
  useEffect(() => {
    // Only initialize if authenticated and not already initialized
    if (isAuthenticated && currentUser && !connectionInitialized.current) {
      setLoading(true);
      connectionInitialized.current = true;
      const cleanup = setupSocketConnection();
      
      // Reset on unmount
      return () => {
        if (cleanup) cleanup();
        connectionInitialized.current = false;
      };
    }
  }, [isAuthenticated, currentUser]);

  // Use a separate useEffect for retry logic
  useEffect(() => {
    if (retryCount > 0) {
      // Clean up existing connection
      if (socketRef.current) {
        if (socketRef.current.connected) {
          socketRef.current.disconnect();
        }
        socketRef.current = null;
      }
      
      setLoading(true);
      const cleanup = setupSocketConnection();
      
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [retryCount]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useCallback(() => {
    if (socket && message.trim()) {
      socket.emit('message', {
        text: message,
        sender: currentUser?.username
      });
      setMessage("");
    }
  }, [socket, message, currentUser]);

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, 100);
  };

  const handleRetryConnection = () => {
    setRetryCount(prev => prev + 1);
  };

  const messageVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 }
  }), []);

  // Add message input handler without causing full re-renders
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }, []);

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

  return (
    <Flex direction="column" width="100%" height="100%" overflow="hidden">
      <Flex direction="column" px={6} py={4} borderBottom="1px solid" borderColor="gray.200">
        <Text fontSize="xl" fontWeight="bold">
          {roomName} {currentRoomId && `(ID: ${currentRoomId})`}
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
            {messages.map((msg, index) => (
              <MotionFlex
                key={`${msg.id}-${index}`}
                maxWidth="80%"
                alignSelf={msg.sender === 'system' 
                  ? 'center' 
                  : msg.sender === currentUser?.username || msg.sender === currentUser?.id?.toString() 
                    ? 'flex-end' 
                    : 'flex-start'
                }
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Box
                  bg={msg.sender === 'system' 
                    ? "gray.300" 
                    : msg.sender === currentUser?.username || msg.sender === currentUser?.id?.toString() 
                      ? "blue.500" 
                      : "gray.100"
                  }
                  color={msg.sender === 'system' 
                    ? "gray.700" 
                    : msg.sender === currentUser?.username || msg.sender === currentUser?.id?.toString() 
                      ? "white" 
                      : "gray.800"
                  }
                  px={4}
                  py={2}
                  borderRadius="lg"
                  boxShadow="sm"
                  maxWidth={msg.sender === 'system' ? "60%" : "100%"}
                >
                  {msg.sender !== 'system' && <Text fontSize="sm" fontWeight="bold">{msg.sender}</Text>}
                  <Text>{msg.text}</Text>
                  <Text fontSize="xs" textAlign="right">{new Date(msg.timestamp).toLocaleTimeString()}</Text>
                </Box>
              </MotionFlex>
            ))}
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
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
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