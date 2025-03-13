import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Box, Text, Input, Flex, VStack, IconButton } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPaperPlane } from "react-icons/fa";
import { useAuth } from "@/auth/context";

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

export const ChatRoom = ({ roomId }: { roomId: string }) => {
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

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setLoading(false);
      return;
    }

    if (!roomId) {
      setConnectionError('Room ID is required');
      setLoading(false);
      return;
    }

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        token: currentUser.token,
        roomId: roomId
      },
      reconnectionAttempts: 3,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setConnectionError(null);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', {
        message: err.message,
        ...(err as any).type && { type: (err as any).type },
        ...(err as any).description && { description: (err as any).description },
        stack: err.stack,
        auth: newSocket.auth,
        query: newSocket.io.opts.query,
        headers: newSocket.io.opts.extraHeaders
      });

      if (err.message.includes('Authentication error')) {
        setConnectionError(`Authentication failed. Please verify your token is valid. Token: ${currentUser.token}`);
      } else if (err.message.includes('WebSocket')) {
        setConnectionError('Connection failed. Please check your network and try again.');
      } else {
        setConnectionError('Connection error. Please try again later.');
      }
      setLoading(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        setConnectionError('Disconnected by server. Please try reconnecting.');
      }
    });

    newSocket.on('auth_error', (err) => {
      console.error('Detailed authentication error:', {
        message: err.message,
        ...(err as any).type && { type: (err as any).type },
        ...(err as any).description && { description: (err as any).description },
        stack: err.stack,
        auth: newSocket.auth,
        query: newSocket.io.opts.query
      });
      setConnectionError('Authentication failed. Please verify your credentials.');
      setLoading(false);
    });

    newSocket.on('room_data', (data: { messages: ChatMessage[], users: User[] }) => {
      setMessages(data.messages);
      setUsers(data.users);
    });

    newSocket.on('message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('user_joined', (user: User) => {
      setUsers(prev => [...prev, user]);
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        text: `${user.username} joined the chat`,
        sender: 'system',
        timestamp: new Date()
      }]);
    });

    newSocket.on('user_left', (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      const user = users.find(u => u.id === userId);
      if (user) {
        setMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          text: `${user.username} left the chat`,
          sender: 'system',
          timestamp: new Date()
        }]);
      }
    });

    setSocket(newSocket);
    setLoading(false);

    return () => {
      if (newSocket.connected) {
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated, currentUser, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (socket && message.trim()) {
      socket.emit('message', {
        text: message,
        sender: currentUser?.username
      });
      setMessage("");
    }
  };

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, 100);
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to join the chat</div>;
  }

  if (connectionError) {
    return <Box p={4} color="red.500">{connectionError}</Box>;
  }

  return (
    <Flex direction="column" width="100%" height="100%" overflow="hidden">
      <Flex direction="column" px={6} py={4} borderBottom="1px solid" borderColor="gray.200">
        <Text fontSize="xl" fontWeight="bold">
          {roomName} (ID: {roomId})
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
            {messages.map(msg => (
              <MotionFlex
                key={msg.id}
                maxWidth="80%"
                alignSelf={msg.sender === currentUser?.username || msg.sender === currentUser?.id.toString() ? 'flex-end' : 'flex-start'}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Box
                  bg={msg.sender === currentUser?.username || msg.sender === currentUser?.id.toString() ? "blue.500" : "gray.100"}
                  color={msg.sender === currentUser?.username || msg.sender === currentUser?.id.toString() ? "white" : "gray.800"}
                  px={4}
                  py={2}
                  borderRadius="lg"
                  boxShadow="sm"
                >
                  <Text fontSize="sm" fontWeight="bold">{msg.sender}</Text>
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
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            borderRadius="full"
          />
          <IconButton
            aria-label="Send"
            icon={<FaPaperPlane />}
            colorScheme="blue"
            onClick={sendMessage}
            borderRadius="full"
          />
        </Flex>
      </Box>
    </Flex>
  );
};

export default ChatRoom;