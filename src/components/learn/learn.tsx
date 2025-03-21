import React, { useState, ReactNode } from 'react';
import {
    Box,
    Icon,
    Tabs,
    Container,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiServer } from 'react-icons/fi';
import { MCPResourceExplorer } from './mcp_guide';

const MotionBox = motion(Box);

// Define the tab interface
interface LearnTab {
    id: string;
    label: string;
    icon: React.ElementType;
    component: ReactNode;
}

interface LearnTabsProps {
    tabs?: LearnTab[];
}

export const LearnTabs: React.FC<LearnTabsProps> = ({ tabs }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeTab, setActiveTab] = useState('mcp');

    // Use provided tabs or default to just the MCP tab
    const tabsToRender = tabs || [
        {
            id: 'mcp',
            label: 'MCP',
            icon: FiServer,
            component: <MCPResourceExplorer />
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
                {/* <MotionBox
                    as="h1"
                    fontSize="lg"
                    fontWeight="bold"
                    mb={3}
                    bgGradient="linear(to-r, blue.400, purple.500)"
                    bgClip="text"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    transition={{ duration: 0.4 } as any}
                >
                    Learn
                </MotionBox> */}

                <Tabs.Root
                    defaultValue="mcp"
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