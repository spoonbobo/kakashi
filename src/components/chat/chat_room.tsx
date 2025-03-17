import React, { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Tooltip } from "@/components/tooltip"
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

interface MentionState {
  isActive: boolean;
  startPosition: number;
  searchText: string;
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

  // Add mention state
  const [mentionState, setMentionState] = useState<MentionState>({
    isActive: false,
    startPosition: 0,
    searchText: ''
  });

  const [agents] = useState<User[]>([
    { id: 'agent', username: 'agent' },
  ]);

  // Animation variants for mention suggestions
  const mentionDropdownVariants = {
    hidden: { opacity: 0, y: 10, height: 0 },
    visible: { opacity: 1, y: 0, height: 'auto', transition: { staggerChildren: 0.05 } },
    exit: { opacity: 0, y: 10, height: 0 }
  };

  const mentionItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 }
  };

  // Modify to exclude current user and include specified agents
  const getMentionSuggestions = useCallback(() => {
    if (!mentionState.isActive) return [];

    // Filter out current user and include only other users plus dummy agents
    const filteredUsers = users.filter(user =>
      user.username !== currentUser?.username &&
      user.id !== currentUser?.id?.toString()
    );

    const allUsers = [...filteredUsers, ...agents];
    const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.username, user])).values());

    return mentionState.searchText.trim() === ''
      ? uniqueUsers
      : uniqueUsers.filter(user =>
        user.username.toLowerCase().includes(mentionState.searchText.toLowerCase()));
  }, [users, agents, mentionState, currentUser]);

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
    console.log("window.location.hostname", window.location.hostname);

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
      if (user.username.startsWith('agent')) {
        console.log("11111 agent joined the chat");
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // const handleRetryConnection = useCallback(() => setRetryCount(prev => prev + 1), []);
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);

    // Handle @ mentions
    const lastAtIndex = newValue.lastIndexOf('@');
    if (lastAtIndex >= 0 && (lastAtIndex === 0 || newValue[lastAtIndex - 1] === ' ')) {
      // Extract search text after @
      const searchText = newValue.substring(lastAtIndex + 1);

      // If there's a space after the search text, disable mention
      if (searchText.includes(' ')) {
        setMentionState({ isActive: false, startPosition: 0, searchText: '' });
      } else {
        setMentionState({
          isActive: true,
          startPosition: lastAtIndex,
          searchText: searchText
        });
      }
    } else {
      setMentionState({ isActive: false, startPosition: 0, searchText: '' });
    }
  }, []);

  const handleSelectMention = useCallback((username: string) => {
    const beforeMention = message.substring(0, mentionState.startPosition);
    const afterMention = message.substring(mentionState.startPosition + mentionState.searchText.length + 1);

    setMessage(`${beforeMention}@${username} ${afterMention}`);
    setMentionState({ isActive: false, startPosition: 0, searchText: '' });
  }, [message, mentionState]);

  const accessMCP = useCallback((agentName: string, messageText: string) => {
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

    fetch(`/mcp/api/app/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contextData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => console.log('Agent response:', data))
      .catch(error => {
        console.error('Error accessing agent:', error);
        // More detailed error logging
        console.error('Error details:', error.message);
      });
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
              const isToolCall = msg.text.includes('<tools>') && msg.text.includes('</tools>');
              const isSystem = msg.sender === 'system' || isToolCall;
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
                          ? `${msg.sender} initiated task "${msg.text.match(/<tools>\['(.+?)'\]<\/tools>/)?.[1] || 'DUMMY'}".`
                          : msg.text}
                      </Text>
                      {!isSystem && <Text fontSize="xs" textAlign="right">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </Text>}
                    </Box>
                  </Tooltip>
                </MotionFlex>
              );
            })}
          </AnimatePresence>
          <Box ref={messagesEndRef} />
        </VStack>
      </MotionBox>

      <Box p={4} mb="60px">
        <Flex gap={2} position="relative">
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

          {/* Mention suggestions dropdown with animations */}
          <AnimatePresence>
            {mentionState.isActive && (
              <MotionBox
                position="absolute"
                bottom="100%"
                left="10px"
                width="250px"
                bg="white"
                borderRadius="md"
                boxShadow="md"
                zIndex={10}
                maxHeight="200px"
                overflowY="auto"
                border="1px solid"
                borderColor="gray.200"
                variants={mentionDropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {getMentionSuggestions().length > 0 ? (
                  getMentionSuggestions().map(user => (
                    <MotionBox
                      key={user.id}
                      p={2}
                      cursor="pointer"
                      _hover={{ bg: "gray.100" }}
                      onClick={() => handleSelectMention(user.username)}
                      variants={mentionItemVariants}
                    >
                      {user.username}
                    </MotionBox>
                  ))
                ) : (
                  <MotionBox
                    p={2}
                    color="gray.500"
                    variants={mentionItemVariants}
                  >
                    No users found
                  </MotionBox>
                )}
              </MotionBox>
            )}
          </AnimatePresence>
        </Flex>
      </Box>
    </Flex>
  );
});

ChatRoom.displayName = 'ChatRoom';
export default React.memo(ChatRoom);