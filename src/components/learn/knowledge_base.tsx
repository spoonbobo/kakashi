// metadata: 
import {
  Box, Text, VStack, HStack, Input, Button, Flex,
  Icon, Badge, Heading, IconButton,
  Tag, Spinner
} from "@chakra-ui/react";

import { useAuth } from "@/auth/context";
import { motion, HTMLMotionProps, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  FiUpload, FiSearch, FiFolder, FiFile, FiFileText,
  FiClock, FiInfo, FiExternalLink,
  FiChevronUp,
} from "react-icons/fi";
import { Tooltip } from "@/components/tooltip";

// Define MotionBox component with proper typing
const MotionBox = motion(Box) as React.FC<Omit<React.ComponentProps<typeof Box>, "transition"> & HTMLMotionProps<"div">>;
const MotionFlex = motion(Flex);

export const KnowledgeBase = () => {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  // Sample document data for UI mockup
  const sampleDocuments = [
    {
      id: "doc1",
      title: "Introduction to AI",
      type: "PDF",
      date: "2023-12-01",
      tags: ["AI", "Technology"],
      source: "Upload",
      description: "A comprehensive introduction to artificial intelligence concepts, history, and modern applications."
    },
    {
      id: "doc2",
      title: "Database Design Patterns",
      type: "DOCX",
      date: "2023-11-20",
      tags: ["Database", "Design"],
      source: "Upload",
      description: "Best practices for database schema design, normalization techniques, and common design patterns."
    },
    {
      id: "doc3",
      title: "Machine Learning Basics",
      type: "PDF",
      date: "2023-10-15",
      tags: ["ML", "AI", "Tutorial"],
      source: "Web",
      description: "An introduction to machine learning algorithms, training methodologies, and evaluation metrics."
    },
  ];

  // Sample categories for the sidebar
  const categories = [
    { id: "all", name: "All Documents", count: sampleDocuments.length, icon: FiFolder },
    { id: "ai", name: "AI & Machine Learning", count: 2, icon: FiFileText },
    { id: "database", name: "Database", count: 1, icon: FiFileText },
    { id: "recent", name: "Recently Added", count: 3, icon: FiClock },
    { id: "upload", name: "Upload Document", count: 0, icon: FiUpload },
  ];


  const toggleDocExpansion = (docId: string) => {
    const newExpandedDocs = new Set(expandedDocs);
    if (expandedDocs.has(docId)) {
      newExpandedDocs.delete(docId);
    } else {
      newExpandedDocs.add(docId);
    }
    setExpandedDocs(newExpandedDocs);
  };

  // Filter documents based on search and category
  const filteredDocuments = sampleDocuments.filter(doc => {
    const matchesSearch = searchQuery === "" ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" ||
      (selectedCategory === "ai" && doc.tags.some(tag => ["AI", "ML"].includes(tag))) ||
      (selectedCategory === "database" && doc.tags.some(tag => ["Database"].includes(tag))) ||
      (selectedCategory === "recent" && new Date(doc.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    return matchesSearch && matchesCategory;
  });

  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === "upload") {
      handleUpload();
    } else {
      setSelectedCategory(categoryId);
    }
  };

  const handleUpload = () => {
    setIsUploading(true);
    // Simulate upload process
    setTimeout(() => {
      setIsUploading(false);
      // You would add the new document to the list here
    }, 2000);
  };

  if (!isAuthenticated) {
    return null;
  }

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
        {/* Left Column - Categories */}
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
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Categories List */}
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
              <Icon as={FiFolder} mr={2} />
              Document Categories
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
              {categories.map((category) => (
                <MotionBox
                  key={category.id}
                  p={3}
                  cursor="pointer"
                  bg={selectedCategory === category.id ? "blue.50" : "white"}
                  borderLeft={selectedCategory === category.id ? "4px solid" : "4px solid transparent"}
                  borderColor={selectedCategory === category.id ? "blue.500" : "transparent"}
                  _hover={{ bg: selectedCategory === category.id ? "blue.50" : "gray.50" }}
                  onClick={() => handleCategorySelect(category.id)}
                  transitionDuration="0.2s"
                  borderBottom="1px"
                  borderBottomColor="gray.100"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Flex justify="space-between" align="center">
                    <HStack>
                      <Icon as={category.icon} />
                      <Text fontSize="sm">{category.name}</Text>
                    </HStack>
                    {category.count > 0 && (
                      <Badge colorScheme="blue" fontSize="xs">
                        {category.count}
                      </Badge>
                    )}
                  </Flex>
                </MotionBox>
              ))}
            </VStack>
          </Box>
        </Box>

        {/* Right Column - Documents */}
        <Box
          width={{ base: "100%", md: "75%" }}
          h={{ base: "auto", md: "100%" }}
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          {selectedCategory !== "upload" ? (
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
                key={selectedCategory}
              >
                <Heading size="sm" mb={1}>
                  {categories.find(c => c.id === selectedCategory)?.name || "All Documents"}
                </Heading>
                <Text fontSize="xs">
                  {selectedCategory === "all"
                    ? "All available documents in your knowledge base"
                    : selectedCategory === "ai"
                      ? "Documents related to AI and machine learning"
                      : selectedCategory === "database"
                        ? "Documents about database design and management"
                        : "Recently added documents"}
                </Text>
              </MotionBox>

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
                  {filteredDocuments.map((doc, index) => {
                    const isExpanded = expandedDocs.has(doc.id);

                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: 0.05 * index,
                          ease: "easeOut"
                        }}
                      >
                        <MotionBox
                          p={3}
                          borderRadius="md"
                          bg="white"
                          border="1px"
                          borderColor="gray.200"
                          boxShadow="sm"
                          _hover={{ boxShadow: "md", borderColor: "blue.200" }}
                          transition={{ duration: 0.3 }}
                        >
                          <Flex justifyContent="space-between" mb={2}>
                            <HStack>
                              <Icon
                                as={doc.type === "PDF" ? FiFileText : FiFile}
                                color={doc.type === "PDF" ? "red.500" : "blue.500"}
                                w={4}
                                h={4}
                              />
                              <Heading size="sm" color="blue.700">{doc.title}</Heading>
                              <Badge colorScheme={doc.type === "PDF" ? "red" : "blue"} fontSize="xs">{doc.type}</Badge>
                            </HStack>
                            <Tooltip content={isExpanded ? "Hide details" : "Show details"}>
                              <IconButton
                                size="xs"
                                variant="ghost"
                                onClick={() => toggleDocExpansion(doc.id)}
                                aria-label={isExpanded ? "Hide details" : "Show details"}
                                colorScheme="blue"
                              >
                                <Icon as={!isExpanded ? FiExternalLink : FiChevronUp} />
                              </IconButton>
                            </Tooltip>
                          </Flex>

                          <Flex justify="space-between" mb={2}>
                            <Text fontSize="xs" color="gray.500">
                              <Icon as={FiClock} mr={1} />
                              {doc.date}
                            </Text>
                            <Text fontSize="xs" color="gray.500">{doc.source}</Text>
                          </Flex>

                          <Flex wrap="wrap" gap={1} mb={isExpanded ? 3 : 0}>
                            {doc.tags.map((tag, idx) => (
                              <Tag.Root key={idx} size="sm" colorScheme="blue" variant="subtle">
                                <Tag.Label fontSize="xs">{tag}</Tag.Label>
                              </Tag.Root>
                            ))}
                          </Flex>

                          {/* Expanded content */}
                          {isExpanded && (
                            <Box
                              mt={3}
                              pt={3}
                              borderTop="1px"
                              borderColor="gray.200"
                            >
                              <Text whiteSpace="pre-wrap" mb={3} color="gray.700" fontSize="sm">{doc.description}</Text>

                              <Box mt={3} p={2} bg="blue.50" borderRadius="md" fontSize="xs">
                                <Heading size="xs" mb={1} color="blue.700">Usage Hint</Heading>
                                <Text fontSize="xs">This document can be used as a knowledge source for AI queries.</Text>
                              </Box>
                            </Box>
                          )}
                        </MotionBox>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </VStack>
            </>
          ) : (
            <Box p={6} textAlign="center" bg="gray.50" borderRadius="md" flex="1" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
              <Icon as={FiInfo} w={8} h={8} color="gray.400" mb={3} />
              <Text>No documents match your search criteria.</Text>
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

          {/* Upload Area - Shows when uploading */}
          {isUploading && (
            <Box
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              bg="rgba(255,255,255,0.9)"
              zIndex={10}
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              p={6}
            >
              <Spinner size="xl" color="blue.500" mb={4} />
              <Heading size="md" mb={2}>Uploading Document</Heading>
              <Text>Please wait while your document is being processed...</Text>
            </Box>
          )}
        </Box>
      </MotionFlex>
    </MotionBox>
  );
};