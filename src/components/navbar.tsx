import { Box, HStack, Text, Icon, Flex, IconButton } from '@chakra-ui/react';
import { Tooltip } from "@/components/tooltip"
import {
    FaComment,
    FaTasks,
    FaPlus,
    FaBook,
    FaChartLine,
} from 'react-icons/fa';
import { AuthPopover } from './auth/auth_popover';
import { memo } from 'react';
import { SettingsPopover } from './settings/settings_popover';
interface NavbarProps {
    onConversationsClick: () => void;
    onNewChatClick: () => void;
    onTasksClick: () => void;
    onApprovalsClick: () => void;
    onLearnClick: () => void;
    onFeedbackClick: () => void;
    onDashboardClick: () => void;
}
import { useTranslation } from 'react-i18next';

export const Navbar = memo(function Navbar({
    onConversationsClick,
    onNewChatClick,
    onTasksClick,
    onLearnClick,
    onDashboardClick
}: NavbarProps) {
    const { t } = useTranslation();
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
                <Tooltip content={t('new_chat')}>
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

                <Tooltip content={t('rooms')}>
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
                <Tooltip content={t('tasks')}>
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
                <Tooltip content={t('dashboard')}>
                    <IconButton
                        bg="transparent"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                        _active={{ bg: 'rgba(255, 255, 255, 0.3)' }}
                        _focus={{ boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.3)' }}
                        aria-label="Dashboard"
                        onClick={onDashboardClick}
                    >
                        <Icon as={FaChartLine} />
                    </IconButton>
                </Tooltip>
                <Tooltip content={t('learn')}>
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
                <Tooltip content={t('settings')}>
                    <SettingsPopover />
                </Tooltip>
                <AuthPopover />
            </Flex>
        </Box>
    );
});

Navbar.displayName = 'Navbar';
