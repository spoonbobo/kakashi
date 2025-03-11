import { Box, Text, Input, Flex, VStack, IconButton } from "@chakra-ui/react";
import { useAuth } from "@/auth/context";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { FaPaperPlane } from 'react-icons/fa';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  initialSessionId?: string;
}

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 }
};

export const ChatInterface = ({ initialSessionId }: ChatInterfaceProps) => {
  const { isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId ? Number(initialSessionId) : null);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSessionId) {
      const loadMessages = async () => {
        try {
          const response = await fetch(`/api/chat/get_session?sessionId=${initialSessionId}`);
          const data = await response.json();
          
          if (data.messages) {
            const formattedMessages = data.messages.map((msg: any) => ({
              id: msg.id,
              text: msg.value,
              sender: msg.role === 'user' ? 'user' : 'bot',
              timestamp: new Date(msg.timestamp),
              isStreaming: false
            }));
            
            setMessages(formattedMessages);
          }
        } catch (error) {
          console.error('Error loading messages:', error);
        }
      };

      loadMessages();
    }
  }, [initialSessionId]);

  useEffect(() => {
    setSessionId(initialSessionId ? Number(initialSessionId) : null);
  }, [initialSessionId]);

  const isNearBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const threshold = 150;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  const scrollToBottom = (smooth = true) => {
    if (scrollContainerRef.current) {
      if (smooth) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      const shouldScroll = isNearBottom();
      setTimeout(() => {
        if (shouldScroll) {
          scrollToBottom(true);
        }
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  useEffect(() => {
    const handleNewChat = () => {
      setMessages([]); // Clear all messages
      setSessionId(null); // Clear session ID
    };

    window.addEventListener('newChat', handleNewChat);

    return () => {
      window.removeEventListener('newChat', handleNewChat);
    };
  }, []);

  const handleSendMessage = () => {
    if (message.trim()) {
      if (sessionId === null) {
        fetch('/api/chat/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
          .then(response => response.json())
          .then(data => {
            setSessionId(data.sessionId);
            sendMessage(data.sessionId);
          })
          .catch(error => {
            console.error('Error creating chat session:', error);
          });
      } else {
        sendMessage(sessionId);
      }
    }
  };

  const sendMessage = (sessionId: number | string) => {
    setIsSending(true);

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage("");

    fetch('/api/chat/insert_message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        message: newMessage,
      }),
    })
    .then(response => response.json())
    .then(() => {
      setIsSending(false);
      
      const botResponseId = Date.now().toString();
      const fullResponse = "This is a simulated response that will appear in chunks.";
      
      setMessages(prev => [...prev, {
        id: botResponseId,
        text: "",
        sender: 'bot',
        timestamp: new Date(),
        isStreaming: true
      }]);
      
      setIsStreaming(true);
      
      let charIndex = 0;
      const chunkSize = 10;
      const streamInterval = setInterval(() => {
        if (charIndex <= fullResponse.length) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === botResponseId 
                ? { ...msg, text: fullResponse.substring(0, charIndex) }
                : msg
            )
          );
          charIndex += chunkSize;
        } else {
          clearInterval(streamInterval);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === botResponseId 
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
          setIsStreaming(false);
        }
      }, 100);
    })
    .catch(error => {
      console.error('Error inserting message:', error);
      setIsSending(false);
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MotionBox
      width="100%"
      height="100%"
      p={4}
      pl={0}
      borderRadius="0"
      boxShadow="sm"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      alignItems="stretch"
      overflowY="auto"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ 
        duration: 0.7,
        x: { type: "spring", stiffness: 300, damping: 30 }
      }}
    >
      <VStack 
        align="stretch" 
        flex="1" 
        overflowY="auto" 
        mb={2}
        gap={4}
        p={2}
        px={30}
        ref={scrollContainerRef}
      >
        <Text fontSize="md" mb={2}>
          Total Messages: {messages.length} sessionId: {sessionId}
        </Text>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MotionFlex
              key={msg.id}
              alignSelf={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
              maxWidth="80%"
              variants={messageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
              flexDirection="column"
            >
              <Text 
                fontSize="sm" 
                color={msg.sender === 'user' ? 'blue.500' : 'gray.500'} 
                mb={1}
                alignSelf={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
              >
                {msg.sender === 'bot' ? 'Agent' : 'You'}
              </Text>
              <Box
                bg={msg.sender === 'user' ? 'blue.500' : 'gray.100'}
                color={msg.sender === 'user' ? 'white' : 'gray.800'}
                px={4}
                py={2}
                borderRadius="lg"
                boxShadow="sm"
              >
                <Text>{msg.text}{msg.isStreaming && "▋"}</Text>
                <Text 
                  fontSize="xs" 
                  color={msg.sender === 'user' ? 'whiteAlpha.700' : 'gray.500'}
                  textAlign="right"
                  mt={1}
                >
                  {msg.timestamp.toLocaleTimeString()}
                </Text>
              </Box>
            </MotionFlex>
          ))}
        </AnimatePresence>
        <Box ref={messagesEndRef} />
      </VStack>

      <Box width="100%" pt={2} mb={4} px={30}>
        <Flex
          direction="column"
          alignItems="stretch"
          bg="gray.10"
          borderRadius="lg"
          p={4}
        >
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            mb={2}
            height="40px"
            disabled={!isAuthenticated || isSending || isStreaming}
            borderRadius="full"
          />
          <Box alignSelf="flex-end">
            <IconButton
              aria-label="Send message"
              onClick={handleSendMessage}
              disabled={!isAuthenticated || isSending || isStreaming}
              colorScheme="blue"
              size="sm"
              borderRadius="full"
            >
              <FaPaperPlane />  
            </IconButton>
          </Box>
        </Flex>
      </Box>
    </MotionBox>
  );
};