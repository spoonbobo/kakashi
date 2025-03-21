import { Box, HStack, Text, Icon, Flex, IconButton } from '@chakra-ui/react';
import { Tooltip } from "@/components/tooltip"
import {
    FaCog,
    FaComment,
    FaTasks,
    FaPlus,
    FaBook,
} from 'react-icons/fa';
import { AuthPopover } from './auth/auth_popover';
import { memo } from 'react';

interface NavbarProps {
    onConversationsClick: () => void;
    onNewChatClick: () => void;
    onTasksClick: () => void;
    onApprovalsClick: () => void;
    onLearnClick: () => void;
    onFeedbackClick: () => void;
}

export const Navbar = memo(function Navbar({
    onConversationsClick,
    onNewChatClick,
    onTasksClick,
    onLearnClick
}: NavbarProps) {

    const handleNewChatClick = () => {
        window.dispatchEvent(new Event('newChat'));
        onNewChatClick();
    };

    console.log('User (from Navbar):', "hi");

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
                    Kakashi <Text as="span" fontSize="sm" opacity="0.8">v{process.env.NEXT_PUBLIC_VERSION}</Text>
                </Text>
            </Flex>

            <HStack>
                <Tooltip content="New Chat">
                    <IconButton
                        bg="transparent"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                        _active={{ bg: 'rgba(255, 255, 255, 0.3)' }}
                        _focus={{ boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.3)' }}
                        aria-label="New Chat"
                        onClick={handleNewChatClick}
                    >
                        <Icon as={FaPlus} />
                    </IconButton>
                </Tooltip>

                <Tooltip content="Rooms">
                    <IconButton
                        bg="transparent"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                        _active={{ bg: 'rgba(255, 255, 255, 0.3)' }}
                        _focus={{ boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.3)' }}
                        aria-label="Rooms"
                        onClick={onConversationsClick}
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
                        onClick={onTasksClick}
                    >
                        <Icon as={FaTasks} />
                    </IconButton>
                </Tooltip>

            </HStack>

            <Flex align="center">
                <Tooltip content="Learn">
                    <IconButton
                        bg="transparent"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                        _active={{ bg: 'rgba(255, 255, 255, 0.3)' }}
                        _focus={{ boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.3)' }}
                        aria-label="Learn"
                        onClick={onLearnClick}
                    >
                        <Icon as={FaBook} />
                    </IconButton>
                </Tooltip>
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
});

Navbar.displayName = 'Navbar';
