import React, { useState, ReactNode } from 'react';
import {
    Box,
    Icon,
    Tabs,
    Container,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaBell, FaTasks, FaComments } from 'react-icons/fa';
import { NotifyPanel } from '@/components/alert/notify_panel';
import AgentTaskPanel from '@/components/task/task_panel';
import { useTranslation } from 'react-i18next';
import { ListRooms } from '@/components/chat/rooms';

const MotionBox = motion(Box);

// Define the tab interface
interface LoggerTab {
    id: string;
    label: string;
    icon: React.ElementType;
    component: ReactNode;
}

interface LoggerTabsProps {
    tabs?: LoggerTab[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onTaskSelect?: (task: any) => void;
}

export const LoggerTabs: React.FC<LoggerTabsProps> = ({
    tabs,
    onTaskSelect = () => { /* Default empty handler */ }
}) => {
    const { t } = useTranslation();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeTab, setActiveTab] = useState('rooms');

    // Use provided tabs or default to tasks, notifications, and rooms tabs
    const tabsToRender = tabs || [
        {
            id: 'rooms',
            label: t('rooms'),
            icon: FaComments,
            component: <ListRooms />
        },
        {
            id: 'tasks',
            label: t('tasks'),
            icon: FaTasks,
            component: <AgentTaskPanel onTaskSelect={onTaskSelect} />
        },
        {
            id: 'notifications',
            label: t('notifications'),
            icon: FaBell,
            component: <NotifyPanel />
        }

    ];

    return (
        <Container
            maxW="1400px"
            px={{ base: 4, md: 6, lg: 8 }}
            py={4}
            height="100%"
            position="relative"
            overflow="hidden"
        >
            <MotionBox
                width="100%"
                height="100%"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                transition={{ duration: 0.5 } as any}
                display="flex"
                flexDirection="column"
                overflow="hidden"
                position="relative"
            >
                <Tabs.Root
                    defaultValue="tasks"
                    variant="line"
                    onChange={(value) => setActiveTab(String(value))}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'calc(100% - 40px)',
                        overflow: 'hidden'
                    }}
                >
                    <Tabs.List>
                        {tabsToRender.map(tab => (
                            <Tabs.Trigger key={tab.id} value={tab.id}>
                                <Icon as={tab.icon} mr={2} />
                                {tab.label}
                            </Tabs.Trigger>
                        ))}
                    </Tabs.List>

                    <Box
                        flex="1"
                        position="relative"
                        overflow="hidden"
                        width="100%"
                    >
                        {tabsToRender.map(tab => (
                            <Tabs.Content
                                key={tab.id}
                                value={tab.id}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    padding: '8px 0',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    height: '100%',
                                    width: 'calc(100% - 6px)', /* Subtract scrollbar width to prevent layout shift */
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: 'rgba(0,0,0,0.1) transparent',
                                    msOverflowStyle: '-ms-autohiding-scrollbar'
                                }}
                            >
                                {tab.component}
                            </Tabs.Content>
                        ))}
                    </Box>
                </Tabs.Root>
            </MotionBox>
        </Container>
    );
};
