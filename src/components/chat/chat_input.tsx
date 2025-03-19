import React, { useState, useCallback, useEffect } from "react";
import { Input, Flex, IconButton, Box } from "@chakra-ui/react";
import { FaPaperPlane } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/types/chat";

const MotionBox = motion(Box);

interface MentionState {
    isActive: boolean;
    startPosition: number;
    searchText: string;
}

interface ChatInputProps {
    message: string;
    setMessage: (message: string) => void;
    sendMessage: () => void;
    users: User[];
    agents: User[];
    currentUser: {
        id?: string;
        username?: string;
        token?: string;
        tokenCreatedAt?: number;
    } | null;
}


export const ChatInput: React.FC<ChatInputProps> = ({
    message,
    setMessage,
    sendMessage,
    users,
    agents,
    currentUser
}) => {
    const [mentionState, setMentionState] = useState<MentionState>({
        isActive: false,
        startPosition: 0,
        searchText: ''
    });
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

    const getMentionSuggestions = useCallback(() => {
        if (!mentionState.isActive) return [];

        // Filter out current user and include only other users plus dummy agents
        const filteredUsers = users.filter(user =>
            user.username !== currentUser?.username &&
            user.id !== currentUser?.id?.toString()
        );

        const allUsers = [...filteredUsers, ...agents];
        const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.username, user])).values());

        return mentionState.searchText.trim() === ''
            ? uniqueUsers
            : uniqueUsers.filter(user =>
                user.username.toLowerCase().includes(mentionState.searchText.toLowerCase()));
    }, [users, agents, mentionState, currentUser]);

    // Set selection index to the last item when search text changes
    useEffect(() => {
        const suggestions = getMentionSuggestions();
        setSelectedSuggestionIndex(Math.max(0, suggestions.length - 1));
    }, [mentionState.searchText, getMentionSuggestions]);

    // Set selection index to the last item when mention becomes active
    useEffect(() => {
        if (mentionState.isActive) {
            const suggestions = getMentionSuggestions();
            setSelectedSuggestionIndex(Math.max(0, suggestions.length - 1));
        }
    }, [mentionState.isActive, getMentionSuggestions]);

    // Prevent scrolling when mention dropdown is active
    useEffect(() => {
        if (mentionState.isActive) {
            // Prevent scrolling on the parent container
            const parentElement = document.querySelector('[data-scroll-container="true"]');
            if (parentElement) {
                parentElement.setAttribute('style', 'overflow: hidden;');
            }

            // Also prevent horizontal scrolling on the body
            document.body.style.overflowX = 'hidden';

            return () => {
                if (parentElement) {
                    parentElement.setAttribute('style', 'overflow: auto;');
                }
                document.body.style.overflowX = '';
            };
        }
    }, [mentionState.isActive]);

    const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setMessage(newValue);

        // Handle @ mentions
        const lastAtIndex = newValue.lastIndexOf('@');
        if (lastAtIndex >= 0 && (lastAtIndex === 0 || newValue[lastAtIndex - 1] === ' ')) {
            // Extract search text after @
            const searchText = newValue.substring(lastAtIndex + 1);

            // If there's a space after the search text, disable mention
            if (searchText.includes(' ')) {
                setMentionState({ isActive: false, startPosition: 0, searchText: '' });
            } else {
                setMentionState({
                    isActive: true,
                    startPosition: lastAtIndex,
                    searchText: searchText
                });
            }
        } else {
            setMentionState({ isActive: false, startPosition: 0, searchText: '' });
        }
    }, [setMessage]);

    const handleSelectMention = useCallback((username: string) => {
        const beforeMention = message.substring(0, mentionState.startPosition);
        const afterMention = message.substring(mentionState.startPosition + mentionState.searchText.length + 1);

        setMessage(`${beforeMention}@${username} ${afterMention}`);
        setMentionState({ isActive: false, startPosition: 0, searchText: '' });
    }, [message, mentionState, setMessage]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        const suggestions = getMentionSuggestions();

        if (mentionState.isActive && suggestions.length > 0) {
            // Handle arrow key navigation for mention suggestions
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
            } else if (e.key === "Enter" && mentionState.isActive) {
                e.preventDefault();
                handleSelectMention(suggestions[selectedSuggestionIndex].username);
                return;
            }
        }

        // Only send message on Enter if not handling mentions
        if (e.key === "Enter" && !mentionState.isActive) {
            sendMessage();
        }
    }, [sendMessage, mentionState.isActive, getMentionSuggestions, selectedSuggestionIndex, handleSelectMention]);

    return (
        <Box p={4} mb="60px">
            <Flex gap={2} position="relative">
                <Input
                    placeholder="Type your message..."
                    value={message}
                    onChange={handleMessageChange}
                    onKeyDown={handleKeyPress}
                    borderRadius="full"
                    borderColor="gray.200"
                    _focus={{
                        borderColor: "blue.300",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.3)"
                    }}
                />
                <IconButton
                    aria-label="Send"
                    colorScheme="blue"
                    onClick={sendMessage}
                    borderRadius="full"
                    disabled={!message.trim()}
                >
                    <FaPaperPlane />
                </IconButton>

                {/* Mention suggestions dropdown */}
                <AnimatePresence>
                    {mentionState.isActive && (
                        <MotionBox
                            position="absolute"
                            bottom="100%"
                            left="10px"
                            width="250px"
                            bg="white"
                            borderRadius="md"
                            boxShadow="lg"
                            zIndex={1000}
                            maxHeight="200px"
                            overflowY="auto"
                            border="1px solid"
                            borderColor="gray.200"
                            mb={2}
                            variants={{
                                hidden: { opacity: 0, y: 10, scale: 0.95 },
                                visible: {
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: {
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 30,
                                        staggerChildren: 0.03
                                    }
                                },
                                exit: {
                                    opacity: 0,
                                    y: 10,
                                    scale: 0.95,
                                    transition: { duration: 0.2 }
                                }
                            }}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            {getMentionSuggestions().length > 0 ? (
                                getMentionSuggestions().map((user, index) => (
                                    <MotionBox
                                        key={user.id}
                                        p={2}
                                        cursor="pointer"
                                        bg={index === selectedSuggestionIndex ? "blue.100" : "transparent"}
                                        _hover={{ bg: "gray.100" }}
                                        onClick={() => handleSelectMention(user.username)}
                                        variants={{
                                            hidden: { opacity: 0, x: -5 },
                                            visible: { opacity: 1, x: 0 },
                                            exit: { opacity: 0, x: 5 }
                                        }}
                                        display="flex"
                                        alignItems="center"
                                        borderBottom={index < getMentionSuggestions().length - 1 ? "1px solid" : "none"}
                                        borderColor="gray.100"
                                    >
                                        <Box
                                            borderRadius="full"
                                            bg={user.username.startsWith('agent') ? "green.100" : "blue.100"}
                                            color={user.username.startsWith('agent') ? "green.700" : "blue.700"}
                                            p={1}
                                            mr={2}
                                            fontSize="xs"
                                            width="24px"
                                            height="24px"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                        >
                                            {user.username[0].toUpperCase()}
                                        </Box>
                                        {user.username}
                                    </MotionBox>
                                ))
                            ) : (
                                <MotionBox
                                    p={2}
                                    color="gray.500"
                                    variants={{
                                        hidden: { opacity: 0 },
                                        visible: { opacity: 1 },
                                        exit: { opacity: 0 }
                                    }}
                                    textAlign="center"
                                >
                                    No users found
                                </MotionBox>
                            )}
                        </MotionBox>
                    )}
                </AnimatePresence>
            </Flex>
        </Box>
    );
};