import { Box, Text, VStack } from "@chakra-ui/react";
import { useAuth } from "@/auth/context";
import { motion } from "framer-motion";

const MotionBox = motion.create(Box);

export const Approvals = () => {
  const { isAuthenticated } = useAuth();

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
      justifyContent="center"
      alignItems="center"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{
        duration: 0.7,
        x: { type: "spring", stiffness: 300, damping: 30 }
      }}
    >
      <VStack align="center">
        <Text fontSize="xl" fontWeight="bold">Approvals View</Text>
        <Text>This is a placeholder for approvals.</Text>
        <Text>Feature coming soon!</Text>
      </VStack>
    </MotionBox>
  );
};