"use client";

import {
    Box,
    Text,
    Flex,
    Icon,
    VStack,
    Badge,
    AvatarGroup,
    Avatar,
} from "@chakra-ui/react";
import { FaPlus } from "react-icons/fa";
import { IChatRoom } from "@/types/chat";
import { useTranslations } from "next-intl";
import { useChatRoomColors } from "@/utils/colors";
import { useEffect, useState } from "react";
import { User } from "@/types/user";

interface ChatRoomListProps {
    rooms: IChatRoom[];
    selectedRoomId: string | null;
    unreadCounts: Record<string, number>;
    onSelectRoom: (roomId: string) => void;
    onCreateRoomClick: () => void;
    isCreatingRoomLoading: boolean;
}

export const ChatRoomList = ({
    rooms,
    selectedRoomId,
    unreadCounts,
    onSelectRoom,
    onCreateRoomClick,
    isCreatingRoomLoading,
}: ChatRoomListProps) => {
    const t = useTranslations("Chat");
    const colors = useChatRoomColors();
    const [roomUsers, setRoomUsers] = useState<Record<string, User[]>>({});

    const sortedRooms = [...rooms].sort((a, b) => {
        // Make sure we're comparing valid dates
        const dateA = new Date(a.last_updated || 0).getTime();
        const dateB = new Date(b.last_updated || 0).getTime();
        return dateB - dateA; // Sort in descending order (newest first)
    });

    useEffect(() => {
        const fetchRoomUsers = async () => {
            // Collect all unique user IDs from all rooms
            const allUserIds = new Set<string>();
            rooms.forEach(room => {
                room.active_users.forEach(userId => {
                    allUserIds.add(userId);
                });
            });

            if (allUserIds.size === 0) return;

            try {
                const response = await fetch('/api/user/get_users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_ids: Array.from(allUserIds),
                        limit: 100 // Adjust as needed
                    }),
                });

                if (!response.ok) throw new Error('Failed to fetch users');

                const data = await response.json();
                const users = data.users;

                // Create a map of user_id to user object
                const userMap = users.reduce((acc: Record<string, User>, user: User) => {
                    acc[user.user_id] = user;
                    return acc;
                }, {});

                // Map room users
                const roomUsersMap: Record<string, User[]> = {};
                rooms.forEach(room => {
                    roomUsersMap[room.id] = room.active_users
                        .map(userId => userMap[userId])
                        .filter(Boolean); // Filter out any undefined users
                });

                setRoomUsers(roomUsersMap);
            } catch (error) {
                console.error('Error fetching room users:', error);
            }
        };

        fetchRoomUsers();
    }, [rooms]);

    return (
        <Box
            width="280px"
            height="100%"
            overflow="auto"
            pr={3}
        >
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Text fontSize="xl" fontWeight="bold" textAlign="left" color={colors.textColorHeading}>
                    {t("rooms")}
                </Text>
                <Box
                    as="button"
                    py={2}
                    px={3}
                    borderRadius="md"
                    bg={colors.bgSubtle}
                    color={colors.textColor}
                    fontWeight="medium"
                    fontSize="sm"
                    _hover={{ bg: colors.buttonHoverBg }}
                    _active={{ bg: colors.buttonActiveBg }}
                    _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                    onClick={onCreateRoomClick}
                    // @ts-ignore
                    disabled={isCreatingRoomLoading}
                >
                    <Flex align="center" justify="center">
                        <Icon as={FaPlus} mr={2} />
                        {t("new_room")}
                    </Flex>
                </Box>
            </Flex>

            <VStack align="stretch">
                {sortedRooms.map((room: IChatRoom) => (
                    <Flex
                        key={room.id}
                        p={3}
                        borderRadius="lg"
                        bg={selectedRoomId === room.id ? colors.selectedRoomBg : colors.bgSubtle}
                        borderWidth="1px"
                        borderColor={
                            selectedRoomId === room.id ? colors.selectedRoomBorder : colors.borderColor
                        }
                        _hover={{
                            bg: selectedRoomId === room.id ? colors.selectedRoomBg : colors.roomHoverBg,
                        }}
                        cursor="pointer"
                        onClick={() => onSelectRoom(room.id)}
                        align="center"
                        transition="all 0.2s"
                    >
                        <Box flex="1">
                            <Flex justify="space-between" align="center" mb={1}>
                                <Text fontWeight="medium" fontSize="md" color={colors.textColorHeading}>
                                    {room.name}
                                </Text>
                                <AvatarGroup gap="0" size="xs">
                                    {(roomUsers[room.id] || []).slice(0, 3).map((user, idx) => (
                                        <Avatar.Root key={idx}>
                                            <Avatar.Fallback name={user.username} />
                                            <Avatar.Image src={user.avatar} />
                                        </Avatar.Root>
                                    ))}
                                    {room.active_users.length > 3 && (
                                        <Avatar.Root variant="solid">
                                            <Avatar.Fallback>
                                                +{room.active_users.length - 3}
                                            </Avatar.Fallback>
                                        </Avatar.Root>
                                    )}
                                </AvatarGroup>
                            </Flex>

                            <Flex justify="space-between" align="center">
                                <Text fontSize="sm" color={colors.textColor} maxW="160px">
                                    {new Date(room.last_updated).toLocaleString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </Text>
                                {unreadCounts[room.id] > 0 && (
                                    <Badge
                                        borderRadius="full"
                                        colorScheme="blue"
                                        fontSize="xs"
                                        px={2}
                                    >
                                        {unreadCounts[room.id]}
                                    </Badge>
                                )}
                            </Flex>
                        </Box>
                    </Flex>
                ))}
            </VStack>
        </Box>
    );
};