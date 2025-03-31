"use client"

import {
    Box, Text, VStack, HStack, Input, Button, Flex,
    Icon, Badge, Heading,
    Tag, Spinner,
    IconButton
} from "@chakra-ui/react";

import { motion, HTMLMotionProps, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import axios from "axios";
import {
    FiSearch, FiFolder, FiFile, FiFileText,
    FiClock, FiInfo, FiExternalLink, FiDatabase, FiCloud,
    FiChevronRight, FiFolderPlus, FiChevronDown, FiRefreshCw
} from "react-icons/fi";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from 'next-intl';
import { toaster } from "@/components/ui/toaster";
import { DataSource, Folder, Document } from "@/types/kb";
const MotionBox = motion.create(Box) as React.FC<Omit<React.ComponentProps<typeof Box>, "transition"> & HTMLMotionProps<"div">>;
const MotionFlex = motion.create(Flex);

// Create an icon mapping
const iconMap = {
    'database': FiDatabase,
    'file': FiFile,
    'folder': FiFolder,
    // Add other mappings as needed
};

export const KnowledgeBase = () => {
    // Add state for search and data source selection
    const t = useTranslations("Learn");
    const [searchQuery, setSearchQuery] = useState("");
    const [folderSearchQuery, setFolderSearchQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [folderSearchFocused, setFolderSearchFocused] = useState(false);
    const [selectedSource, setSelectedSource] = useState<string>("");
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [folderStructures, setFolderStructures] = useState<Record<string, Folder[]>>({});
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [documents, setDocuments] = useState<Record<string, Document[]>>({});

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // Color mode values - MOVED HERE to ensure consistent hook order
    const bgColor = useColorModeValue("white", "gray.800");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const categoryHeaderBg = useColorModeValue("gray.50", "gray.700");
    const selectedCategoryBg = useColorModeValue("blue.50", "blue.800");
    const selectedCategoryBorderColor = useColorModeValue("blue.500", "blue.300");
    const categoryHoverBg = useColorModeValue("gray.50", "gray.700");
    const emptyStateBg = useColorModeValue("gray.50", "gray.700");
    const scrollbarThumbColor = useColorModeValue("rgba(0,0,0,0.1)", "rgba(255,255,255,0.1)");
    const scrollbarThumbHoverColor = useColorModeValue("rgba(0,0,0,0.2)", "rgba(255,255,255,0.2)");
    const cardBg = useColorModeValue("white", "gray.800");
    const cardBorderColor = useColorModeValue("gray.200", "gray.700");
    const cardHoverBorderColor = useColorModeValue("blue.200", "blue.300");
    const cardHeadingColor = useColorModeValue("blue.700", "blue.300");
    const folderBg = useColorModeValue("gray.50", "gray.700");
    const folderActiveBg = useColorModeValue("blue.50", "blue.900");
    const folderActiveColor = useColorModeValue("blue.600", "blue.300");
    const loadingOverlayBg = useColorModeValue("rgba(255,255,255,0.9)", "rgba(26,32,44,0.9)");

    // Fetch knowledge base data
    const fetchKnowledgeBase = async () => {
        try {
            setIsLoading(true);
            // Use a relative path that will be routed by Nginx
            const url = `/api/kb/list_documents`;
            const response = await axios.get(url);
            const data = response.data;

            setDataSources(data.dataSources || []);
            setFolderStructures(data.folderStructures || {});
            setDocuments(data.documents || {});

            // Select the first data source by default if available and none is selected
            if (data.dataSources && data.dataSources.length > 0 && !selectedSource) {
                setSelectedSource(data.dataSources[0].id);
            }
        } catch (error) {
            toaster.create({
                title: "Error loading knowledge base",
                description: "Could not load documents. Please try again later.",
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Sync knowledge base
    const syncKnowledgeBase = async () => {
        try {
            setIsSyncing(true);
            const url = `/api/kb/sync`;
            await axios.post(url);

            // Refetch data after sync
            await fetchKnowledgeBase();

            toaster.create({
                title: "Knowledge base synchronized",
                description: "Documents have been updated successfully.",
                duration: 3000,
            });
        } catch (error) {
            toaster.create({
                title: "Sync failed",
                description: "Could not synchronize knowledge base. Please try again later.",
                duration: 5000,
            });
        } finally {
            setIsSyncing(false);
        }
    };

    // Load data on component mount
    useEffect(() => {
        fetchKnowledgeBase();
    }, []);

    // Filter documents based on search, selected data source, and selected folder
    const filteredDocuments = (documents[selectedSource] || []).filter(doc => {
        const matchesSearch = searchQuery === "" ||
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesFolder = selectedFolder === null || doc.folderId === selectedFolder;

        return matchesSearch && matchesFolder;
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
    const paginatedDocuments = filteredDocuments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedSource, selectedFolder]);

    // Filter folders based on folder search query
    const filteredFolders = (folderStructures[selectedSource] || []).filter(folder =>
        folderSearchQuery === "" ||
        folder.name.toLowerCase().includes(folderSearchQuery.toLowerCase())
    );

    // Handle data source selection
    const handleSourceSelect = (sourceId: string) => {
        setIsLoading(true);
        setSelectedSource(sourceId);
        setSelectedFolder(null);

        // Simulate loading process
        setTimeout(() => {
            setIsLoading(false);
        }, 300);
    };

    // Handle folder selection
    const handleFolderSelect = (folderId: string) => {
        setIsLoading(true);
        setSelectedFolder(folderId);

        // Simulate loading process
        setTimeout(() => {
            setIsLoading(false);
        }, 500);
    };

    // Handle document click to open URL
    const handleDocumentClick = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Toggle folder open/closed state
    const toggleFolder = (folderId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent folder selection when toggling

        // Create a deep copy of the folder structures
        const updatedFolderStructures = JSON.parse(JSON.stringify(folderStructures));

        // Helper function to find and toggle the folder recursively
        const toggleFolderInStructure = (folders: Folder[]): boolean => {
            for (let i = 0; i < folders.length; i++) {
                if (folders[i].id === folderId) {
                    folders[i].isOpen = !folders[i].isOpen;
                    return true;
                }

                // Recursively check nested folders
                if (folders[i].folders && toggleFolderInStructure(folders[i].folders)) {
                    return true;
                }
            }
            return false;
        };

        // Apply the toggle to the current data source
        toggleFolderInStructure(updatedFolderStructures[selectedSource]);

        // Update state with the modified structure
        setFolderStructures(updatedFolderStructures);
    };

    // Render folder structure recursively
    const renderFolders = (folders: Folder[], depth = 0) => {
        return folders.map((folder) => (
            <VStack key={folder.id} align="stretch" pl={depth > 0 ? 2 : 0} gap={1}>
                <HStack
                    p={2}
                    borderRadius="md"
                    cursor="pointer"
                    bg={selectedFolder === folder.id ? folderActiveBg : "transparent"}
                    color={selectedFolder === folder.id ? folderActiveColor : textColorStrong}
                    _hover={{ bg: selectedFolder === folder.id ? folderActiveBg : folderBg }}
                    onClick={() => handleFolderSelect(folder.id)}
                >
                    <Flex alignItems="center" flex="1">
                        {folder.folders && folder.folders.length > 0 && (
                            <Icon
                                as={folder.isOpen ? FiChevronDown : FiChevronRight}
                                mr={1}
                                w={4}
                                h={4}
                                color="gray.500"
                                cursor="pointer"
                                onClick={(e) => toggleFolder(folder.id, e)}
                            />
                        )}
                        <Icon as={FiFolder} color={selectedFolder === folder.id ? folderActiveColor : "blue.400"} />
                        <Text fontSize="sm" fontWeight={selectedFolder === folder.id ? "medium" : "normal"} ml={2} noOfLines={1}>
                            {folder.name}
                        </Text>
                    </Flex>
                    {folder.files && folder.files.length > 0 && (
                        <Badge size="sm" colorScheme="blue" ml="auto">
                            {folder.files.length}
                        </Badge>
                    )}
                </HStack>
                {folder.folders && folder.folders.length > 0 && folder.isOpen && (
                    <AnimatePresence>
                        <MotionBox
                            pl={2}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            overflow="hidden"
                        >
                            {renderFolders(folder.folders, depth + 1)}
                        </MotionBox>
                    </AnimatePresence>
                )}
            </VStack>
        ));
    };

    return (
        <MotionBox
            width="100%"
            height="100%"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
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
                {/* Left Column - Data Sources */}
                <Box
                    width={{ base: "100%", md: "20%" }}
                    minW={{ md: "200px" }}
                    position="relative"
                    display="flex"
                    flexDirection="column"
                    h={{ base: "300px", md: "100%" }}
                >
                    {/* Search Box with Sync Buttons - Modified section */}
                    <Flex mb={3} position="relative" alignItems="center" gap={2}>
                        <Box position="relative" flex="1">
                            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1} pointerEvents="none">
                                <Icon as={FiSearch} color={searchFocused ? "blue.400" : "gray.400"} transition="color 0.2s" />
                            </Box>
                            <Input
                                placeholder={t("kb.search_data_sources")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                pl={10}
                                bg="transparent"
                                borderRadius="md"
                                border="none"
                                boxShadow="none"
                                _hover={{ bg: searchFocused ? "transparent" : "transparent" }}
                                _focus={{ bg: "transparent", outline: "none", boxShadow: "0 1px 0 0 var(--chakra-colors-blue-500)" }}
                                transition="all 0.2s"
                            />
                            {searchQuery && (
                                <Box position="absolute" right={3} top="50%" transform="translateY(-50%)">
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => setSearchQuery('')}
                                        aria-label="Clear search"
                                    >
                                        Clear
                                    </Button>
                                </Box>
                            )}
                        </Box>

                        {/* Sync and Update Knowledge buttons */}
                        {/* <IconButton
                            aria-label="Sync Knowledge Base"
                            icon={<Icon as={FiRefreshCw} />}
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            isLoading={isSyncing}
                            onClick={syncKnowledgeBase}
                            _hover={{ bg: "blue.50", color: "blue.600" }}
                        />

                        <IconButton
                            aria-label="Update Knowledge"
                            icon={<Icon as={FiCloud} />}
                            size="sm"
                            colorScheme="green"
                            variant="ghost"
                            _hover={{ bg: "green.50", color: "green.600" }}
                        /> */}
                    </Flex>

                    {/* Data Sources List */}
                    <Box
                        bg={bgColor}
                        borderRadius="md"
                        boxShadow="sm"
                        border="1px"
                        borderColor={borderColor}
                        overflow="hidden"
                        flex="1"
                        display="flex"
                        flexDirection="column"
                    >
                        <Heading size="sm" p={2} bg={categoryHeaderBg} borderBottom="1px" borderColor={borderColor} color={textColorHeading}>
                            <Icon as={FiDatabase} mr={2} />
                            {t("kb.data_sources")}
                        </Heading>
                        <VStack
                            align="stretch"
                            overflowY="auto"
                            flex="1"
                            pb={2}
                            css={{
                                '&::-webkit-scrollbar': { width: '8px' },
                                '&::-webkit-scrollbar-track': { background: 'transparent' },
                                '&::-webkit-scrollbar-thumb': { background: scrollbarThumbColor, borderRadius: '4px' },
                                '&::-webkit-scrollbar-thumb:hover': { background: scrollbarThumbHoverColor }
                            }}
                            overflowX="hidden"
                        >
                            {dataSources
                                .filter(source =>
                                    searchQuery === "" ||
                                    source.name.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((source) => (
                                    <MotionBox
                                        key={source.id}
                                        p={3}
                                        cursor="pointer"
                                        bg={source.id === selectedSource ? selectedCategoryBg : bgColor}
                                        borderLeft={source.id === selectedSource ? "4px solid" : "4px solid transparent"}
                                        borderColor={source.id === selectedSource ? selectedCategoryBorderColor : "transparent"}
                                        _hover={{ bg: source.id === selectedSource ? selectedCategoryBg : categoryHoverBg }}
                                        onClick={() => handleSourceSelect(source.id)}
                                        transitionDuration="0.2s"
                                        borderBottom="1px"
                                        borderBottomColor={borderColor}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Flex justify="space-between" align="center">
                                            <HStack>
                                                {/* // TODO: it's working fine */}
                                                {/* @ts-ignore */}
                                                <Icon as={iconMap[source.icon] || FiFile} color="blue.500" />
                                                <Text fontSize="sm" color={textColorStrong}>{source.name}</Text>
                                            </HStack>
                                            <HStack>
                                                {source.count > 0 && (
                                                    <Badge colorScheme="blue" fontSize="xs">
                                                        {source.count}
                                                    </Badge>
                                                )}
                                                {source.id === selectedSource && (
                                                    <Icon as={FiChevronRight} color="blue.500" />
                                                )}
                                            </HStack>
                                        </Flex>
                                    </MotionBox>
                                ))}
                        </VStack>
                    </Box>
                </Box>

                {/* Middle Column - Folder Structure */}
                <AnimatePresence>
                    {selectedSource && (
                        <MotionBox
                            width={{ base: "100%", md: "25%" }}
                            minW={{ md: "220px" }}
                            position="relative"
                            display="flex"
                            flexDirection="column"
                            h={{ base: "300px", md: "100%" }}
                            initial={{ opacity: 0, x: -20, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: "25%" }}
                            exit={{ opacity: 0, x: -20, width: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Box
                                bg={bgColor}
                                borderRadius="md"
                                boxShadow="sm"
                                border="1px"
                                borderColor={borderColor}
                                overflow="hidden"
                                flex="1"
                                display="flex"
                                flexDirection="column"
                            >
                                <Heading size="sm" p={2} bg={categoryHeaderBg} borderBottom="1px" borderColor={borderColor} color={textColorHeading}>
                                    <Icon as={FiFolderPlus} mr={2} />
                                    {t("kb.folder_structure")}
                                </Heading>

                                {/* New Folder Search Box - Simplified and borderless */}
                                <Box position="relative" px={2} py={2} borderBottom="1px" borderColor={borderColor}>
                                    <Box position="absolute" left={4} top="50%" transform="translateY(-50%)" zIndex={1} pointerEvents="none">
                                        <Icon as={FiSearch} color={folderSearchFocused ? "blue.400" : "gray.400"} transition="color 0.2s" />
                                    </Box>
                                    <Input
                                        placeholder={t("kb.search_folders")}
                                        value={folderSearchQuery}
                                        onChange={(e) => setFolderSearchQuery(e.target.value)}
                                        onFocus={() => setFolderSearchFocused(true)}
                                        onBlur={() => setFolderSearchFocused(false)}
                                        pl={8}
                                        size="sm"
                                        bg="transparent"
                                        borderRadius="md"
                                        border="none"
                                        boxShadow="none"
                                        _hover={{ bg: "transparent" }}
                                        _focus={{ bg: "transparent", outline: "none", boxShadow: "0 1px 0 0 var(--chakra-colors-blue-500)" }}
                                        transition="all 0.2s"
                                    />
                                    {folderSearchQuery && (
                                        <Box position="absolute" right={4} top="50%" transform="translateY(-50%)">
                                            <Button
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => setFolderSearchQuery('')}
                                                aria-label="Clear folder search"
                                            >
                                                Clear
                                            </Button>
                                        </Box>
                                    )}
                                </Box>

                                {/* Sync and Update Knowledge buttons - Fixed icon colors */}
                                <Flex px={3} py={2} borderBottom="1px" borderColor={borderColor} gap={2} >
                                    <IconButton
                                        aria-label="Sync Knowledge Base"
                                        size="sm"
                                        colorScheme="blue"
                                        variant="ghost"
                                        loading={isSyncing}
                                        onClick={syncKnowledgeBase}
                                        _hover={{ bg: "blue.50", color: "blue.600" }}
                                    >
                                        <Icon as={FiRefreshCw} color={textColorStrong} />
                                    </IconButton>

                                    <IconButton
                                        aria-label="Update Knowledge"
                                        size="sm"
                                        colorScheme="green"
                                        variant="ghost"
                                        _hover={{ bg: "green.50", color: "green.600" }}
                                    >
                                        <Icon as={FiCloud} color={textColorStrong} />
                                    </IconButton>
                                </Flex>

                                <VStack
                                    align="stretch"
                                    overflowY="auto"
                                    flex="1"
                                    p={2}
                                    gap={2}
                                    css={{
                                        '&::-webkit-scrollbar': { width: '8px' },
                                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                                        '&::-webkit-scrollbar-thumb': { background: scrollbarThumbColor, borderRadius: '4px' },
                                        '&::-webkit-scrollbar-thumb:hover': { background: scrollbarThumbHoverColor }
                                    }}
                                    overflowX="hidden"
                                >
                                    <HStack
                                        p={2}
                                        borderRadius="md"
                                        cursor="pointer"
                                        bg={selectedFolder === null ? folderActiveBg : "transparent"}
                                        color={selectedFolder === null ? folderActiveColor : textColorStrong}
                                        _hover={{ bg: selectedFolder === null ? folderActiveBg : folderBg }}
                                        onClick={() => setSelectedFolder(null)}
                                    >
                                        <Icon as={FiFolder} color={selectedFolder === null ? folderActiveColor : "blue.400"} />
                                        <Text fontSize="sm" fontWeight={selectedFolder === null ? "medium" : "normal"}>
                                            All Files
                                        </Text>
                                        <Badge size="sm" colorScheme="blue" ml="auto">
                                            {documents[selectedSource]?.length || 0}
                                        </Badge>
                                    </HStack>

                                    {filteredFolders.length > 0 ? renderFolders(filteredFolders) : (
                                        <Box p={4} textAlign="center">
                                            <Text color={textColor}>No folders match your search</Text>
                                        </Box>
                                    )}
                                </VStack>
                            </Box>
                        </MotionBox>
                    )}
                </AnimatePresence>

                {/* Right Column - Documents */}
                <Box
                    width={{ base: "100%", md: selectedSource ? "55%" : "80%" }}
                    h={{ base: "auto", md: "100%" }}
                    display="flex"
                    flexDirection="column"
                    overflow="hidden"
                    position="relative"
                >
                    <VStack
                        align="stretch"
                        overflowY="auto"
                        pr={2}
                        flex="1"
                        pb={3}
                        css={{
                            '&::-webkit-scrollbar': { width: '6px' },
                            '&::-webkit-scrollbar-track': { background: 'transparent' },
                            '&::-webkit-scrollbar-thumb': { background: scrollbarThumbColor, borderRadius: '4px' },
                            '&::-webkit-scrollbar-thumb:hover': { background: scrollbarThumbHoverColor }
                        }}
                    >
                        <AnimatePresence>
                            {filteredDocuments.length > 0 ? (
                                <>
                                    <Flex flexWrap="wrap" gap={4} p={1}>
                                        {paginatedDocuments.map((doc, index) => (
                                            <motion.div
                                                key={doc.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    duration: 0.3,
                                                    delay: 0.05 * index,
                                                    ease: "easeOut"
                                                }}
                                                style={{ width: 'calc(33.33% - 11px)' }}
                                            >
                                                <MotionBox
                                                    p={4}
                                                    borderRadius="md"
                                                    bg={cardBg}
                                                    border="1px"
                                                    borderColor={cardBorderColor}
                                                    boxShadow="sm"
                                                    _hover={{ boxShadow: "md", borderColor: cardHoverBorderColor }}
                                                    transition={{ duration: 0.3 }}
                                                    height="200px"
                                                    display="flex"
                                                    flexDirection="column"
                                                    position="relative"
                                                    overflow="hidden"
                                                    whileHover={{ y: -4 }}
                                                    cursor="pointer"
                                                    onClick={() => handleDocumentClick(doc.url)}
                                                    as="a"
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Flex justifyContent="space-between" mb={3}>
                                                        <Icon
                                                            as={doc.type === "PDF" ? FiFileText : FiFile}
                                                            color={
                                                                doc.type === "PDF" ? "red.500" :
                                                                    doc.type === "DOCX" ? "blue.500" :
                                                                        doc.type === "XLSX" ? "green.500" :
                                                                            doc.type === "PPTX" ? "orange.500" : "gray.500"
                                                            }
                                                            w={5}
                                                            h={5}
                                                        />
                                                        <Badge
                                                            colorScheme={
                                                                doc.type === "PDF" ? "red" :
                                                                    doc.type === "DOCX" ? "blue" :
                                                                        doc.type === "XLSX" ? "green" :
                                                                            doc.type === "PPTX" ? "orange" : "gray"
                                                            }
                                                            fontSize="xs"
                                                        >
                                                            {doc.type}
                                                        </Badge>
                                                    </Flex>

                                                    <Heading size="sm" color={cardHeadingColor} mb={2}>{doc.title}</Heading>

                                                    <Text fontSize="sm" color={textColorStrong} mb={3} flex="1" lineClamp={2}>
                                                        {doc.description}
                                                    </Text>

                                                    <Flex wrap="wrap" gap={1} mb={3}>
                                                        {doc.tags.map((tag, idx) => (
                                                            <Tag.Root key={idx} size="sm" colorScheme="blue" variant="subtle">
                                                                <Tag.Label fontSize="xs">{tag}</Tag.Label>
                                                            </Tag.Root>
                                                        ))}
                                                    </Flex>

                                                    <Flex justify="space-between" align="center" mt="auto">
                                                        <Text fontSize="xs" color={textColor}>
                                                            <Icon as={FiClock} mr={1} />
                                                            {doc.date}
                                                        </Text>

                                                        <Icon as={FiExternalLink} color="blue.500" />
                                                    </Flex>
                                                </MotionBox>
                                            </motion.div>
                                        ))}
                                    </Flex>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <Flex justify="center" mt={6} mb={2} align="center">
                                            <IconButton
                                                aria-label="Previous Page"
                                                size="sm"
                                                colorScheme="blue"
                                                variant="outline"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                mr={2}
                                                _hover={{ bg: "blue.50", color: "blue.600" }}
                                            >
                                                <Icon as={FiChevronRight} transform="rotate(180deg)" />
                                            </IconButton>

                                            <Text fontSize="sm" mx={4}>
                                                Page {currentPage} of {totalPages}
                                                <Text as="span" ml={2} color={textColor}>
                                                    ({filteredDocuments.length} items)
                                                </Text>
                                            </Text>

                                            <IconButton
                                                aria-label="Next Page"
                                                size="sm"
                                                colorScheme="blue"
                                                variant="outline"
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                ml={2}
                                                _hover={{ bg: "blue.50", color: "blue.600" }}
                                            >
                                                <Icon as={FiChevronRight} />
                                            </IconButton>
                                        </Flex>
                                    )}
                                </>
                            ) : (
                                <Box p={6} textAlign="center" bg={emptyStateBg} borderRadius="md" flex="1" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                                    <Icon as={FiInfo} w={8} h={8} color={textColor} mb={3} />
                                    <Text color={textColorStrong}>No documents match your search criteria.</Text>
                                    {searchQuery && (
                                        <Button
                                            mt={4}
                                            size="sm"
                                            colorScheme="blue"
                                            variant="outline"
                                            onClick={() => setSearchQuery('')}
                                        >
                                            Clear search
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </AnimatePresence>
                    </VStack>

                    {/* Loading overlay */}
                    {isLoading && (
                        <Box
                            position="absolute"
                            top="0"
                            left="0"
                            right="0"
                            bottom="0"
                            bg={loadingOverlayBg}
                            zIndex={10}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            flexDirection="column"
                            p={6}
                        >
                            <Spinner size="xl" color="blue.500" mb={4} />
                            <Heading size="md" mb={2} color={textColorHeading}>Loading Knowledge Base</Heading>
                            <Text color={textColorStrong}>
                                {selectedFolder
                                    ? `Fetching documents from folder...`
                                    : selectedSource
                                        ? `Fetching documents from ${selectedSource}...`
                                        : "Loading data sources..."}
                            </Text>
                        </Box>
                    )}
                </Box>
            </MotionFlex>
        </MotionBox >
    );
};