import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Flex, Input, Box, Icon } from "@chakra-ui/react";
import { FaPaperPlane } from "react-icons/fa";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/types/user";
import { IChatRoom, IMessage } from "@/types/chat";
import { v4 as uuidv4 } from "uuid";

const MotionBox = motion.create(Box);

// do not change
interface MentionState {
    isActive: boolean;
    startPosition: number;
    searchText: string;
}

// do not change
interface ChatInputProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage: (message: IMessage) => void;
    selectedRoomId: string | null;
    users?: User[];
    agents?: User[];
    currentUser?: User | null;
    isTaskMode?: boolean;
    currentRoom?: IChatRoom | null;
    roomUsers?: User[];
}

// Extract color values to a custom hook to prevent recalculation on every render
const useInputColors = (isTaskMode = true) => {
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const bgSubtle = useColorModeValue("bg.subtle", "gray.800");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const inputBg = useColorModeValue("white", "#1A202C");
    const mentionBg = useColorModeValue("white", "#1A202C");
    const mentionHoverBg = useColorModeValue("gray.100", "gray.800");
    const mentionSelectedBg = useColorModeValue("blue.100", "blue.900");
    const buttonBg = useColorModeValue(
        isTaskMode ? "blue.500" : "green.500",
        isTaskMode ? "blue.600" : "green.600"
    );
    const buttonHoverBg = useColorModeValue(
        isTaskMode ? "blue.600" : "green.600",
        isTaskMode ? "blue.700" : "green.700"
    );

    return {
        borderColor,
        bgSubtle,
        textColor,
        textColorStrong,
        inputBg,
        mentionBg,
        mentionHoverBg,
        mentionSelectedBg,
        buttonBg,
        buttonHoverBg
    };
};

export const ChatInput = React.memo(({
    messageInput,
    setMessageInput,
    handleSendMessage,
    selectedRoomId,
    users = [],
    agents = [],
    currentUser = null,
    isTaskMode = true,
    currentRoom = null,
    roomUsers = [],
}: ChatInputProps) => {
    const t = useTranslations("Chat");
    const [mentionState, setMentionState] = useState<MentionState>({
        isActive: false,
        startPosition: 0,
        searchText: ''
    });
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
    const [activeMentions, setActiveMentions] = useState<User[]>([]);

    // Use memoized colors
    const colors = useInputColors(isTaskMode);

    // Memoize current room users to prevent recalculations
    const currentRoomUsers = useMemo(() => {
        return roomUsers.length > 0
            ? roomUsers.filter(user => user.user_id !== currentUser?.user_id)
            : users.filter(user => currentRoom?.active_users?.includes(user.user_id || ''));
    }, [roomUsers, users, currentRoom?.active_users, currentUser?.user_id]);

    // Memoize all users to prevent array recreation on every render
    const allUsers = useMemo(() => {
        const combined = [...currentRoomUsers, ...agents];
        return Array.from(new Map(combined.map(user => [user.username, user])).values());
    }, [currentRoomUsers, agents]);

    const getMentionSuggestions = useCallback(() => {
        if (!mentionState.isActive) return [];

        return mentionState.searchText.trim() === ''
            ? allUsers
            : allUsers.filter(user =>
                user.username.toLowerCase().includes(mentionState.searchText.toLowerCase())
            ).sort((a, b) => {
                const aIsAgent = a.role === "agent";
                const bIsAgent = b.role === "agent";
                if (aIsAgent && !bIsAgent) return -1;
                if (!aIsAgent && bIsAgent) return 1;
                return a.username.localeCompare(b.username);
            });
    }, [mentionState.isActive, mentionState.searchText, allUsers]);

    // Memoize suggestions to prevent recalculation
    const suggestions = useMemo(() => {
        return getMentionSuggestions();
    }, [getMentionSuggestions]);

    useEffect(() => {
        if (mentionState.isActive) {
            setSelectedSuggestionIndex(Math.max(0, suggestions.length - 1));
        }
    }, [mentionState.searchText, suggestions.length, mentionState.isActive]);

    useEffect(() => {
        if (mentionState.isActive) {
            const parentElement = document.querySelector('[data-scroll-container="true"]');
            if (parentElement) {
                parentElement.setAttribute('style', 'overflow: hidden;');
            }
            document.body.style.overflowX = 'hidden';

            return () => {
                if (parentElement) {
                    parentElement.setAttribute('style', 'overflow: auto;');
                }
                document.body.style.overflowX = '';
            };
        }
    }, [mentionState.isActive]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setMessageInput(newValue);

        const lastAtIndex = newValue.lastIndexOf('@');
        if (lastAtIndex >= 0 && (lastAtIndex === 0 || newValue[lastAtIndex - 1] === ' ')) {
            const searchText = newValue.substring(lastAtIndex + 1);
            if (searchText.includes(' ')) {
                if (mentionState.isActive) {
                    setMentionState({ isActive: false, startPosition: 0, searchText: '' });
                }
            } else {
                if (!mentionState.isActive ||
                    mentionState.startPosition !== lastAtIndex ||
                    mentionState.searchText !== searchText) {
                    setMentionState({
                        isActive: true,
                        startPosition: lastAtIndex,
                        searchText: searchText
                    });
                }
            }
        } else if (mentionState.isActive) {
            setMentionState({ isActive: false, startPosition: 0, searchText: '' });
        }
    }, [mentionState.isActive, mentionState.startPosition, mentionState.searchText, setMessageInput]);

    const handleSelectMention = useCallback((user: User) => {
        const beforeMention = messageInput.substring(0, mentionState.startPosition);
        const afterMention = messageInput.substring(mentionState.startPosition + mentionState.searchText.length + 1);

        setMessageInput(`${beforeMention}@${user.username} ${afterMention}`);

        setActiveMentions(prev => {
            if (!prev.some(u => u.user_id === user.user_id)) {
                return [...prev, user];
            }
            return prev;
        });

        setMentionState({ isActive: false, startPosition: 0, searchText: '' });
    }, [messageInput, mentionState.startPosition, mentionState.searchText, setMessageInput]);

    const createNewMessage = useCallback((content: string): IMessage => {
        return {
            id: uuidv4(),
            room_id: selectedRoomId || '',
            sender: {
                user_id: currentUser?.user_id || '',
                username: currentUser?.username || '',
                email: currentUser?.email || '',
                created_at: currentUser?.created_at || new Date().toISOString(),
                updated_at: currentUser?.updated_at || new Date().toISOString(),
                active_rooms: currentUser?.active_rooms || [],
                archived_rooms: currentUser?.archived_rooms || [],
                avatar: currentUser?.avatar || '',
                role: currentUser?.role || 'user',
                id: currentUser?.id
            },
            content,
            created_at: new Date().toISOString(),
            avatar: currentUser?.avatar || "",
            mentions: activeMentions.length > 0 ? activeMentions : undefined,
        };
    }, [selectedRoomId, currentUser, activeMentions]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (mentionState.isActive && suggestions.length > 0) {
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
                handleSelectMention(suggestions[selectedSuggestionIndex]);
                return;
            } else if (e.key === "Escape") {
                e.preventDefault();
                setMentionState({ isActive: false, startPosition: 0, searchText: '' });
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey && !mentionState.isActive) {
            e.preventDefault();
            if (messageInput.trim() && selectedRoomId) {
                const newMessage = createNewMessage(messageInput);
                handleSendMessage(newMessage);
                setActiveMentions([]);
            }
        }
    }, [
        mentionState.isActive,
        suggestions,
        selectedSuggestionIndex,
        handleSelectMention,
        messageInput,
        selectedRoomId,
        createNewMessage,
        handleSendMessage
    ]);

    const handleSendButtonClick = useCallback(() => {
        if (messageInput.trim() && selectedRoomId) {
            const newMessage = createNewMessage(messageInput);
            handleSendMessage(newMessage);
            setActiveMentions([]);
        }
    }, [messageInput, selectedRoomId, createNewMessage, handleSendMessage]);

    // Memoize the mention suggestion list to prevent rerenders
    const renderSuggestions = useMemo(() => {
        if (!mentionState.isActive) return null;

        return (
            <MotionBox
                position="absolute"
                bottom="100%"
                left="10px"
                width="250px"
                bg={colors.mentionBg}
                borderRadius="md"
                boxShadow="lg"
                zIndex={1000}
                maxHeight="200px"
                overflowY="auto"
                overflowX="hidden"
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
                {suggestions.length > 0 ? (
                    suggestions.map((user, index) => (
                        <MotionBox
                            key={user.user_id}
                            p={2}
                            cursor="pointer"
                            bg={index === selectedSuggestionIndex ? colors.mentionSelectedBg : "transparent"}
                            _hover={{ bg: colors.mentionHoverBg }}
                            onClick={() => handleSelectMention(user)}
                            variants={{
                                hidden: { opacity: 0, x: -5 },
                                visible: { opacity: 1, x: 0 },
                                exit: { opacity: 0, x: 5 }
                            }}
                            display="flex"
                            alignItems="center"
                            borderBottom={index < suggestions.length - 1 ? "1px solid" : "none"}
                            borderColor="gray.200"
                            color={colors.textColorStrong}
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
                            <Flex flex="1" alignItems="center" justifyContent="space-between">
                                <Box>{user.username}</Box>
                                {user.role && (
                                    <Box
                                        ml={2}
                                        px={2}
                                        py={0.5}
                                        borderRadius="full"
                                        fontSize="xs"
                                        fontWeight="medium"
                                        bg={user.role === "agent" ? "green.100" : "blue.100"}
                                        color={user.role === "agent" ? "green.700" : "blue.700"}
                                        _dark={{
                                            bg: user.role === "agent" ? "green.800" : "blue.800",
                                            color: user.role === "agent" ? "green.200" : "blue.200"
                                        }}
                                    >
                                        {user.role}
                                    </Box>
                                )}
                            </Flex>
                        </MotionBox>
                    ))
                ) : (
                    <MotionBox
                        p={2}
                        color={colors.textColor}
                        variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1 },
                            exit: { opacity: 0 }
                        }}
                        textAlign="center"
                    >
                        {t("no_users_found")}
                    </MotionBox>
                )}
            </MotionBox>
        );
    }, [
        mentionState.isActive,
        suggestions,
        selectedSuggestionIndex,
        colors,
        handleSelectMention,
        t
    ]);

    return (
        <Flex
            p={4}
            borderTopWidth="1px"
            borderColor={isTaskMode ? colors.borderColor : "green.200"}
            bg={isTaskMode ? colors.bgSubtle : "rgba(236, 253, 245, 0.4)"}
            align="center"
            position="relative"
        >
            <Input
                flex="1"
                placeholder={!selectedRoomId ? t("please_select_a_room") : t("type_message")}
                mr={2}
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                borderRadius="full"
                size="md"
                disabled={!selectedRoomId}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                bg={colors.inputBg}
                color={colors.textColorStrong}
                _placeholder={{ color: colors.textColor }}
                borderColor={isTaskMode ? "inherit" : "green.200"}
                _focus={{
                    borderColor: isTaskMode ? "blue.500" : "green.400",
                    boxShadow: isTaskMode ?
                        "0 0 0 1px var(--chakra-colors-blue-500)" :
                        "0 0 0 1px var(--chakra-colors-green-400)"
                }}
            />

            <Box
                as="button"
                py={2}
                px={4}
                borderRadius="md"
                bg={isTaskMode ? "blue.500" : "green.500"}
                color="white"
                fontWeight="medium"
                fontSize="sm"
                _hover={{ bg: isTaskMode ? "blue.600" : "green.600" }}
                _active={{ bg: isTaskMode ? "blue.700" : "green.700" }}
                opacity={!messageInput.trim() || !selectedRoomId ? 0.5 : 1}
                cursor={!messageInput.trim() || !selectedRoomId ? "not-allowed" : "pointer"}
                pointerEvents={!messageInput.trim() || !selectedRoomId ? "none" : "auto"}
                onClick={handleSendButtonClick}
            >
                <Flex align="center" justify="center">
                    <Icon as={FaPaperPlane} mr={2} />
                    {t("send")}
                </Flex>
            </Box>

            <AnimatePresence onExitComplete={() => {
                const parentElement = document.querySelector('[data-scroll-container="true"]');
                if (parentElement) {
                    parentElement.setAttribute('style', 'overflow: auto;');
                }
                document.body.style.overflowX = '';
            }}>
                {mentionState.isActive && renderSuggestions}
            </AnimatePresence>
        </Flex>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Return true if props are equal (no re-render), false if they're not equal (trigger re-render)

    // Simple comparison for primitive props
    if (prevProps.messageInput !== nextProps.messageInput) return false;
    if (prevProps.selectedRoomId !== nextProps.selectedRoomId) return false;
    if (prevProps.isTaskMode !== nextProps.isTaskMode) return false;

    // Deep comparison for complex objects when needed
    if (prevProps.currentRoom?.id !== nextProps.currentRoom?.id) return false;

    // No need to deeply compare functions since they should be memoized in the parent

    // Compare arrays length as a quick check
    if (prevProps.roomUsers?.length !== nextProps.roomUsers?.length) return false;
    if (prevProps.users?.length !== nextProps.users?.length) return false;
    if (prevProps.agents?.length !== nextProps.agents?.length) return false;

    // By default, assume props are equal
    return true;
});