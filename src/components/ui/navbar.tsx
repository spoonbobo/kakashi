import { Box, HStack, Text, Icon, Flex, IconButton} from '@chakra-ui/react';
import { Tooltip } from "@/components/ui/tooltip"
import { FaCog, FaComment, FaCheck , FaTasks } from 'react-icons/fa';
import { AuthPopover } from './popover/auth_popover';

export default function Navbar() {
    return (
        <Box
            as="nav"
            position="fixed"
            zIndex={1000}
            h="50px"
            top={0}
            left={0}
            w="100%"
            bg="rgba(29, 78, 216, 0.8)"
            color="white"
            p={4}
            boxShadow="md"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
        >
            <Flex align="center">
                <Text fontSize="2xl" fontWeight="bold">
                    Kakashi
                </Text>
            </Flex>

            <HStack>
                <Tooltip content="Messages">
                    <IconButton
                       bg="transparent"
                       _hover={{ bg: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                       _active={{ bg: 'rgba(255, 255, 255, 0.3)' }}
                       _focus={{ boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.3)' }}
                       aria-label="Messages"
                    >
                        <Icon as={FaComment} />
                    </IconButton>
                </Tooltip>
                <Tooltip content="Tasks">
                    <IconButton
                       bg="transparent"
                       _hover={{ bg: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                       _active={{ bg: 'rgba(255, 255, 255, 0.3)' }}
                       _focus={{ boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.3)' }}
                       aria-label="Tasks"
                    >
                        <Icon as={FaTasks} />
                    </IconButton>
                </Tooltip>
                <Tooltip content="Approvals">
                    <IconButton
                       bg="transparent"
                       _hover={{ bg: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                       _active={{ bg: 'rgba(255, 255, 255, 0.3)' }}
                       _focus={{ boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.3)' }}
                       aria-label="Completed"
                    >
                        <Icon as={FaCheck} />
                    </IconButton>
                </Tooltip>
            </HStack>

            <Flex align="center">
                <Tooltip content="Settings">
                    <IconButton
                        bg="transparent"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                        _active={{ bg: 'rgba(255, 255, 255, 0.3)' }}
                        _focus={{ boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.3)' }}
                        aria-label="Settings"
                    >
                        <Icon as={FaCog} />
                    </IconButton>
                </Tooltip>
                <AuthPopover />
            </Flex>
        </Box>
    );
}
