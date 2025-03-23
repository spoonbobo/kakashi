import React, { useEffect, useState } from 'react';
import {
    Box,
    Heading,
    Text,
    Badge,
    VStack,
    HStack,
    Spinner,
    Code,
    Button,
    Flex,
    useClipboard,
    Icon,
    Table,
    Input,
} from '@chakra-ui/react';
import { Tooltip } from "@/components/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiSearch, FiServer, FiTool, FiInfo, FiCopy, FiExternalLink } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

interface InputSchemaProperty {
    title: string;
    type: string;
}

interface InputSchema {
    properties: Record<string, InputSchemaProperty>;
    required: string[];
    title: string;
    type: string;
}

interface ServerTool {
    name: string;
    description: string;
    input_schema: InputSchema;
}

interface Server {
    server_name: string;
    server_description: string;
    server_tools: ServerTool[];
}

interface ServerListProps {
    // Optional props can be added here
}

// Create a separate component for each tool to handle its own hooks
const ToolCard = ({ tool, serverKey, isExpanded, toggleToolExpansion }: { tool: ServerTool, serverKey: string, isExpanded: boolean, toggleToolExpansion: (toolId: string) => void }) => {
    const toolId = `${serverKey}-${tool.name}`;
    // @ts-expect-error - useClipboard hook returns complex object with hasCopied property
    const clipboard = useClipboard(tool.name);
    // @ts-expect-error - accessing hasCopied from clipboard object
    const hasCopied = clipboard.hasCopied;
    // @ts-expect-error - accessing onCopy from clipboard object
    const onCopy = clipboard.onCopy;

    return (
        <MotionBox
            p={3}
            borderRadius="md"
            bg="gray.50"
            border="1px"
            borderColor="gray.200"
            boxShadow="sm"
            _hover={{ boxShadow: "md", borderColor: "purple.200" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transition={{ duration: 0.3 } as any}
        >
            <Flex justifyContent="space-between" mb={2}>
                <HStack>
                    <Heading size="sm" color="purple.700">{tool.name}</Heading>
                    <Tooltip content={hasCopied ? "Copied!" : "Copy tool name"}>
                        <Button
                            size="xs"
                            variant="ghost"
                            onClick={onCopy}
                            aria-label="Copy tool name"
                        >
                            <Icon as={FiCopy} />
                        </Button>
                    </Tooltip>
                </HStack>
                <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => toggleToolExpansion(toolId)}
                >
                    {isExpanded ? "Hide details" : "Show details"}
                    {!isExpanded && <Icon as={FiExternalLink} ml={1} />}
                </Button>
            </Flex>

            {/* Input Parameters - Always visible without header */}
            <Box mb={3} overflowX="auto">
                <Table.Root size="sm" variant="outline" colorScheme="purple" mb={1}>
                    <Table.Header bg="purple.50" position="sticky" top={0} zIndex={1}>
                        <Table.Row>
                            <Table.ColumnHeader fontWeight="semibold" fontSize="xs">Parameter</Table.ColumnHeader>
                            <Table.ColumnHeader fontWeight="semibold" fontSize="xs">Type</Table.ColumnHeader>
                            <Table.ColumnHeader fontWeight="semibold" fontSize="xs">Required</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {Object.entries(tool.input_schema.properties).map(([paramName, param]) => (
                            <Table.Row key={paramName} _hover={{ bg: "gray.50" }}>
                                <Table.Cell fontWeight="medium" fontSize="xs">{param.title || paramName}</Table.Cell>
                                <Table.Cell fontSize="xs"><Code colorScheme="purple" px={1} py={0}>{param.type}</Code></Table.Cell>
                                <Table.Cell fontSize="xs">
                                    {tool.input_schema.required.includes(paramName) ?
                                        <Badge colorScheme="red" borderRadius="full" px={1} fontSize="2xs">Required</Badge> :
                                        <Badge colorScheme="gray" borderRadius="full" px={1} fontSize="2xs">Optional</Badge>
                                    }
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>

            {/* Description - Expandable section */}
            {isExpanded && (
                <Box
                    mt={3}
                    pt={3}
                    borderTop="1px"
                    borderColor="gray.200"
                >
                    <Text whiteSpace="pre-wrap" mb={3} color="gray.700" fontSize="sm">{tool.description}</Text>

                    <Box mt={3} p={2} bg="blue.50" borderRadius="md" fontSize="xs">
                        <Heading size="xs" mb={1} color="blue.700">Usage Hint</Heading>
                        <Text>This tool can be accessed through the MCP protocol using <Code>{tool.name}</Code> as the identifier.</Text>
                    </Box>
                </Box>
            )}
        </MotionBox>
    );
};

export const MCPResourceExplorer: React.FC<ServerListProps> = () => {
    const { t } = useTranslation();
    const [servers, setServers] = useState<Record<string, Server>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
    const [searchFocused, setSearchFocused] = useState(false);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);

    useEffect(() => {
        const fetchServers = async () => {
            try {
                const response = await fetch('/mcp/api/app/get_servers');
                if (!response.ok) {
                    throw new Error(`Failed to fetch servers: ${response.statusText}`);
                }
                const data = await response.json();

                // Process server descriptions to remove leading "You "
                Object.values(data as Record<string, Server>).forEach((server) => {
                    if (server.server_description.startsWith("You ")) {
                        server.server_description = server.server_description.substring(4);
                    }
                });

                setServers(data);

                // Set the first server as selected by default if available
                const serverKeys = Object.keys(data);
                if (serverKeys.length > 0) {
                    setSelectedServer(serverKeys[0]);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
                toast.error(`Failed to load servers: ${err instanceof Error ? err.message : 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };

        fetchServers();
    }, []);

    const toggleToolExpansion = (toolId: string) => {
        const newExpandedTools = new Set(expandedTools);
        if (expandedTools.has(toolId)) {
            newExpandedTools.delete(toolId);
        } else {
            newExpandedTools.add(toolId);
        }
        setExpandedTools(newExpandedTools);
    };

    // Filter servers based on search term
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const filteredServers = Object.entries(servers).filter(([serverKey, server]) => {
        const serverMatches = server.server_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            server.server_description.toLowerCase().includes(searchTerm.toLowerCase());

        const toolMatches = server.server_tools.some(tool =>
            tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return serverMatches || toolMatches;
    });

    // Get tools for the selected server
    const selectedServerTools = selectedServer && servers[selectedServer]
        ? servers[selectedServer].server_tools
        : [];

    // Filter tools based on search term
    const filteredTools = selectedServerTools.filter(tool =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh" flexDirection="column" gap={4}>
                <Spinner size="xl" color="blue.500" />
                <Text fontSize="lg" fontWeight="medium">Loading available MCP servers...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={6} textAlign="center" borderRadius="lg" bg="red.50" color="red.600" maxW="800px" mx="auto" my={10} boxShadow="md">
                <Icon as={FiInfo} w={8} h={8} mb={3} />
                <Heading size="md" mb={2}>Error Loading Servers</Heading>
                <Text fontWeight="medium">{error}</Text>
                <Button mt={4} colorScheme="red" onClick={() => window.location.reload()}>Try Again</Button>
            </Box>
        );
    }

    return (
        <MotionBox
            width="100%"
            height="100%"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transition={{ duration: 0.5 } as any}
            maxW="100%"
            mx="auto"
            overflow="hidden"
            display="flex"
            flexDirection="column"
        >
            <ToastContainer
                position="bottom-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />

            <MotionFlex
                direction={{ base: "column", md: "row" }}
                gap={3}
                flex="1"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                transition={{ duration: 0.3 } as any}
                h={{ base: "auto", md: "100%" }}
                overflow="hidden"
                width="100%"
            >
                {/* Left Column - Search and Server Selection */}
                <Box
                    width={{ base: "100%", md: "25%" }}
                    minW={{ md: "220px" }}
                    position="relative"
                    display="flex"
                    flexDirection="column"
                    h={{ base: "300px", md: "100%" }}
                >
                    {/* Search Box */}
                    <Box
                        mb={3}
                        position="relative"
                    >
                        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1} pointerEvents="none">
                            <Icon as={FiSearch} color={searchFocused ? "blue.400" : "gray.400"} transition="color 0.2s" />
                        </Box>
                        <Input
                            placeholder="Search servers and tools..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            pl={10}
                            bg={searchFocused ? "gray.50" : "white"}
                            borderRadius="md"
                            border="none"
                            boxShadow="none"
                            _hover={{ bg: "gray.50" }}
                            _focus={{ bg: "gray.50", outline: "none", boxShadow: "none" }}
                            transition="all 0.2s"
                        />
                        {searchTerm && (
                            <Box position="absolute" right={3} top="50%" transform="translateY(-50%)">
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => setSearchTerm('')}
                                    aria-label="Clear search"
                                >
                                    Clear
                                </Button>
                            </Box>
                        )}
                    </Box>

                    {/* Server List */}
                    <Box
                        bg="white"
                        borderRadius="md"
                        boxShadow="sm"
                        border="1px"
                        borderColor="gray.200"
                        overflow="hidden"
                        flex="1"
                        display="flex"
                        flexDirection="column"
                    >
                        <Heading size="sm" p={2} bg="gray.50" borderBottom="1px" borderColor="gray.200">
                            <Icon as={FiServer} mr={2} />
                            {t("available_servers")}
                        </Heading>
                        <VStack
                            align="stretch"
                            overflowY="auto"
                            flex="1"
                            pb={2}
                            css={{
                                '&::-webkit-scrollbar': { width: '8px' },
                                '&::-webkit-scrollbar-track': { background: 'transparent' },
                                '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)', borderRadius: '4px' },
                                '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(0,0,0,0.2)' }
                            }}
                            overflowX="hidden"
                        >
                            {filteredServers.length === 0 ? (
                                <Box p={4} textAlign="center">
                                    <Text fontSize="sm" color="gray.500">No servers match your search</Text>
                                </Box>
                            ) : (
                                filteredServers.map(([serverKey, server]) => (
                                    <MotionBox
                                        key={serverKey}
                                        p={3}
                                        cursor="pointer"
                                        bg={selectedServer === serverKey ? "blue.50" : "white"}
                                        borderLeft={selectedServer === serverKey ? "4px solid" : "4px solid transparent"}
                                        borderColor={selectedServer === serverKey ? "blue.500" : "transparent"}
                                        _hover={{ bg: selectedServer === serverKey ? "blue.50" : "gray.50" }}
                                        onClick={() => setSelectedServer(serverKey)}
                                        transitionDuration="0.2s"
                                        borderBottom="1px"
                                        borderBottomColor="gray.100"
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Flex justify="space-between" align="center">
                                            <Heading size="xs">{server.server_name}</Heading>
                                            <Badge colorScheme="blue" fontSize="xs">
                                                {server.server_tools.length}
                                            </Badge>
                                        </Flex>
                                    </MotionBox>
                                ))
                            )}
                        </VStack>
                    </Box>
                </Box>

                {/* Right Column - Tools */}
                <Box
                    width={{ base: "100%", md: "75%" }}
                    h={{ base: "auto", md: "100%" }}
                    display="flex"
                    flexDirection="column"
                    overflow="hidden"
                >
                    {selectedServer && servers[selectedServer] ? (
                        <>
                            <MotionBox
                                mb={2}
                                p={2}
                                bg="blue.50"
                                borderRadius="md"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                transition={{ duration: 0.3 } as any}
                                key={selectedServer}
                            >
                                <Heading size="sm" mb={1}>{servers[selectedServer].server_name}</Heading>
                                <Text fontSize="xs">{servers[selectedServer].server_description}</Text>
                            </MotionBox>

                            {filteredTools.length > 0 ? (
                                <VStack
                                    align="stretch"
                                    overflowY="auto"
                                    pr={2}
                                    flex="1"
                                    pb={3}
                                    css={{
                                        '&::-webkit-scrollbar': { width: '6px' },
                                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                                        '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)', borderRadius: '4px' },
                                        '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(0,0,0,0.2)' }
                                    }}
                                >
                                    <AnimatePresence>
                                        {filteredTools.map((tool, index) => {
                                            const toolId = `${selectedServer}-${tool.name}`;
                                            const isExpanded = expandedTools.has(toolId);

                                            return (
                                                <motion.div
                                                    key={toolId}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{
                                                        duration: 0.3,
                                                        delay: 0.05 * index,
                                                        ease: "easeOut"
                                                    }}
                                                >
                                                    <ToolCard
                                                        tool={tool}
                                                        serverKey={selectedServer}
                                                        isExpanded={isExpanded}
                                                        toggleToolExpansion={toggleToolExpansion}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </VStack>
                            ) : (
                                <Box p={6} textAlign="center" bg="gray.50" borderRadius="md" flex="1" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                                    <Text>No tools match your search criteria.</Text>
                                    {searchTerm && (
                                        <Button
                                            mt={4}
                                            size="sm"
                                            colorScheme="blue"
                                            variant="outline"
                                            onClick={() => setSearchTerm('')}
                                        >
                                            Clear search
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </>
                    ) : (
                        <Box p={6} textAlign="center" bg="gray.50" borderRadius="md" flex="1" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                            <Icon as={FiTool} w={8} h={8} color="gray.400" mb={3} />
                            <Text>Select a server to view available tools.</Text>
                        </Box>
                    )}
                </Box>
            </MotionFlex>
        </MotionBox>
    );
};