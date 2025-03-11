import { Box, Text, Input, Button, Flex, VStack } from "@chakra-ui/react";
import { useAuth } from "@/auth/context";
import { motion } from "framer-motion";
import { useState } from "react";

const MotionBox = motion(Box);

export const TextMessage = () => {
  const { isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log("Message sent:", message);
      setMessage("");
    }
  };

  return (
    <MotionBox
        width="75%"
        height="calc(100vh - 80px - 40px)"
        minWidth={{ base: "100%", md: "50%" }}
        maxWidth={{ base: "100%", md: "75%" }}
        p={4}
        pl={0}
        borderRadius="0"
        boxShadow="sm"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        alignItems="stretch"
        flexShrink={0}
        overflowY="auto"
        style={{
          opacity: isAuthenticated ? 1 : 0,
        }}
        transition={{ 
          duration: 0.7,
          x: { type: "spring", stiffness: 300, damping: 30 }
        }}
    >
        <VStack align="stretch" flex="1" overflowY="auto" mb={4}>
          {/* Add your message components here */}
        </VStack>
        
        <Box 
          width="100%" 
          pt={2}
          borderTop="1px solid"
          borderColor="gray.200"
        >
          <Flex>
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              mr={2}
              disabled={!isAuthenticated}
            />
            <Button 
              colorScheme="blue" 
              onClick={handleSendMessage}
              disabled={!isAuthenticated}
            >
              Send
            </Button>
          </Flex>
        </Box>
    </MotionBox>
  );
};