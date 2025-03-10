import { Box, Spinner, Text } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/auth/context';

interface WelcomeBoxProps {
  greeting: string;
}

const MotionBox = motion(Box);

export default function WelcomeBox({ greeting }: WelcomeBoxProps) {
  const { isAuthenticated } = useAuth();

  return (
    <AnimatePresence>
      {!isAuthenticated && (
        <MotionBox
          textAlign="center"
          boxShadow="md"
          p={6}
          bg="white"
          borderRadius="md"
        //   position="fixed"
          width="300px"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          left="50%"
          top="50%"
          transform="translate(-50%, -50%)"
          zIndex={1000}
        >
          <Text as="h1" fontSize="2xl" color="blue.600" mb={4}>
            {greeting === 'Loading...' ? <Spinner size="xl" /> : greeting}
          </Text>
          <Text fontSize="lg" color="gray.600" mb={4}>
            Welcome to Kakashi. Login to continue.
          </Text>
        </MotionBox>
      )}
    </AnimatePresence>
  );
}