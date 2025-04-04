"use client";

import {
  Box,
  Text,
  Flex,
  Icon,
  Container,
  Heading,
  Button,
  CloseButton,
  Drawer,
  Portal,
  VStack,
  HStack,
  Avatar,
  Badge,
  Separator,
  IconButton
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FaComments, FaUsers, FaTasks, FaUserPlus } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { IChatRoom, IMessage } from "@/types/chat";
import { User } from "@/types/user";
import { useSession } from "next-auth/react";
import Loading from "@/components/loading";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import {
  setRooms,
  setSelectedRoom,
  setLoadingRooms,
  setLoadingMessages,
  joinRoom,
  setMessages,
  markRoomMessagesLoaded,
  clearSelectedRoom,
  quitRoom,
  updateRoom,
  removeUserFromRoom
} from '@/store/features/chatSlice';
import React from "react";
import { ChatRoomList } from "@/components/chat/room_list";
import { ChatMessageList } from "@/components/chat/message_list";
import { ChatInput } from "@/components/chat/chat_input";
import { CreateRoomForm } from "@/components/chat/create_room_form";
import { ChatModeProvider, useChatMode } from "@/components/chat/chat_mode_context";
import { ChatModeMessageList } from "@/components/chat/chat_mode_message_list";
import { ChatModeInput } from "@/components/chat/chat_mode_input";
import { toaster } from "@/components/ui/toaster";
import { useChatPageColors } from "@/utils/colors";
import { RoomMenu } from "@/components/chat/room_menu";
import { RoomInvitation } from "@/components/chat/room_invitation";


const MotionBox = motion.create(Box);

// Add this dummy TaskLog component
const TaskLog = () => {
  const t = useTranslations("Chat");
  const colors = useChatPageColors();

  return (
    <Box
      height="100%"
      width="100%"
      bg={colors.bgSubtle}
      borderRadius="md"
      borderWidth="1px"
      borderColor={colors.borderColor}
      overflow="hidden"
      display="flex"
      flexDirection="column"
      transition="all 0.3s ease"
      boxShadow="sm"
    >
      <Flex
        p={4}
        borderBottomWidth="1px"
        borderColor={colors.borderColor}
        bg={colors.bgSubtle}
        align="center"
      >
        <Icon as={FaTasks} color="blue.500" mr={2} />
        <Text fontWeight="bold" color={colors.textColorHeading}>{t("task_log")}</Text>
      </Flex>

      <Box flex="1" p={4} overflow="auto">
        {/* Empty content for now - will be replaced later */}
        <Text color={colors.textColor} fontSize="sm" textAlign="center" mt={10}>
          {t("task_log_empty")}
        </Text>
      </Box>
    </Box>
  );
};

// Wrap the main component with the ChatModeProvider
export default function ChatPage() {
  const { data: session } = useSession();
  const { currentUser } = useSelector((state: RootState) => state.user);

  if (!session) {
    return <Loading />;
  }

  return (
    <ChatModeProvider currentUser={currentUser}>
      <ChatPageContent />
    </ChatModeProvider>
  );
}

// The existing ChatPageContent component remains as is
const ChatPageContent = () => {
  const t = useTranslations("Chat");
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const colors = useChatPageColors();

  // Get chat state from Redux - use individual selectors for better performance
  const rooms = useSelector((state: RootState) => state.chat.rooms);
  const selectedRoomId = useSelector((state: RootState) => state.chat.selectedRoomId);
  const messages = useSelector((state: RootState) => state.chat.messages);
  const unreadCounts = useSelector((state: RootState) => state.chat.unreadCounts);
  const isLoadingRooms = useSelector((state: RootState) => state.chat.isLoadingRooms);
  const isLoadingMessages = useSelector((state: RootState) => state.chat.isLoadingMessages);
  const messagesLoaded = useSelector((state: RootState) => state.chat.messagesLoaded);

  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const isOwner = useSelector((state: RootState) => state.user.isOwner);

  // UAT flag to check if user is not an owner
  // const UAT = !isOwner;
  const UAT = false;

  // Get messages for the selected room
  const currentMessages = selectedRoomId ? messages[selectedRoomId] || [] : [];

  const [messageInput, setMessageInput] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [isCreatingRoomLoading, setIsCreatingRoomLoading] = useState<boolean>(false);
  const [isLayoutFlipped, setIsLayoutFlipped] = useState<boolean>(false);
  // Force chat mode for non-owners in UAT
  const [isTaskMode, setIsTaskMode] = useState<boolean>(!UAT);
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<User[]>([]);

  // Add ref for message container to enable auto-scrolling
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Function to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when messages change or when a room is selected
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, selectedRoomId]);

  // Add this new useEffect to ensure scrolling on initial load
  useEffect(() => {
    // This will run after the component has mounted and the DOM is ready
    scrollToBottom();

    // Add a small delay to ensure content is fully rendered
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Use the centralized colors instead of direct useColorModeValue calls
  const bgSubtle = colors.bgSubtle;
  const textColor = colors.textColor;
  const textColorHeading = colors.textColorHeading;
  const borderColor = colors.borderColor;
  const chatModeBg = colors.chatModeBg;
  const chatModeBorder = colors.chatModeBorder;
  const chatModeHeading = colors.chatModeHeading;

  // Add new color variables for message list consistency
  const messageListBg = bgSubtle;
  const messageTextColor = colors.messageTextColor || textColor;

  // Add this new state to track if event source is active
  const [isEventSourceActive, setIsEventSourceActive] = useState<boolean>(false);

  // Add this ref to store the event source instance
  const eventSourceRef = React.useRef<EventSource | null>(null);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get("/api/chat/get_rooms");
        console.log("response", response);
        // Make sure rooms have their active_users properly populated
        const roomsWithUsers = response.data.map((room: IChatRoom) => {
          // If active_users is null or undefined, initialize as empty array
          if (!room.active_users) {
            room.active_users = [];
          }
          return room;
        });

        dispatch(setRooms(roomsWithUsers));
      } catch (error) {
        toaster.create({
          title: t("error"),
          description: t("error_fetching_rooms"),
          type: "error"
        });
      } finally {
        dispatch(setLoadingRooms(false));
      }
    };

    if (session) {
      fetchRooms();
    }
  }, [session, dispatch]);

  // Fetch users and agents
  useEffect(() => {
    const fetchUsersAndAgents = async () => {
      try {
        // Fetch regular users
        const usersResponse = await axios.get("/api/user/get_users");
        setUsers(usersResponse.data.users);

        // Fetch agents specifically
        const agentsResponse = await axios.get("/api/user/get_users?role=agent");
        setAgents(agentsResponse.data.users);
      } catch (error) {
        toaster.create({
          title: t("error"),
          description: t("error_fetching_users_agents"),
          type: "error"
        });
      }
    };

    if (session) {
      fetchUsersAndAgents();
    }
  }, [session]);

  // Add this new function to handle the agent API call
  const triggerAgentAPI = async (message: string, roomId: string) => {
    try {
      toaster.create({
        title: t("agent_mentioned"),
        description: t("agent_mentioned_description"),
        type: "info"
      });

      // Extract the mentioned agent username
      let assigneeId = null;
      const mentionMatch = message.match(/@([a-zA-Z0-9_]+)/);

      if (mentionMatch && mentionMatch[1]) {
        const mentionedUsername = mentionMatch[1];

        // Only look for specific agents if we have agents available
        if (agents.length > 0) {
          // If it's the default "agent" mention, use the first available agent
          if (mentionedUsername === "agent") {
            assigneeId = agents[0].user_id;
          } else {
            // Find the specific agent that was mentioned
            const mentionedAgent = agents.find(agent => agent.username === mentionedUsername);
            if (mentionedAgent) {
              assigneeId = mentionedAgent.user_id;
            }
          }
        }
      }

      const url = `/api/mcp/create_plan`;
      const payload = {
        summoner: currentUser?.email,
        query: message,
        room_id: roomId,
        assigner: currentUser?.user_id,
        assignee: assigneeId,
        created_at: new Date().toISOString()
      };
      console.log("Payload:", payload);

      // Only add assignee to the payload if we found a valid assignee
      if (assigneeId) {
        // @ts-ignore
        payload.assignee = assigneeId;
      }

      await axios.post(url, payload);
    }
    catch (error) {
      toaster.create({
        title: t("error"),
        description: t("error_calling_agent_api"),
        type: "error"
      });
    }
  };

  const handleCreateRoom = async () => {
    if (newRoomName.trim()) {
      try {
        setIsCreatingRoomLoading(true);
        const roomName = newRoomName.trim();
        const response = await axios.post("/api/chat/create_room", {
          name: roomName,
          active_users: [],
          unread: 0,
        });
        const roomId = response.data.room_id;
        setNewRoomName("");
        setIsCreatingRoom(false);

        // join the new room
        dispatch(joinRoom(roomId));

        // Add the room to the user's active_rooms
        await axios.post("/api/user/update_active_rooms", {
          roomId: roomId,
          action: "add"
        });

        if (currentUser) {
          await axios.put("/api/chat/update_room", {
            roomId: roomId,
            active_users: [currentUser.user_id]
          });
        }

        const roomsResponse = await axios.get("/api/chat/get_rooms");

        dispatch(setRooms(roomsResponse.data));


        toaster.create({
          title: t("room_created"),
          description: t("room_created_description"),
          type: "success"
        });
      } catch (error) {
        toaster.create({
          title: t("error"),
          description: t("error_creating_room"),
          type: "error"
        });
      } finally {
        setIsCreatingRoomLoading(false);
      }
    }
  };

  // Group messages by sender for continuous messages
  const groupedMessages = selectedRoomId
    ? (messages[selectedRoomId]?.reduce(
      (
        acc: { sender: string; senderId?: string; avatar: string; messages: IMessage[]; isCurrentUser: boolean }[],
        message,
        index
      ) => {
        const prevMessage = messages[selectedRoomId][index - 1];

        // Check if this message is from the current user
        const isCurrentUser = message.sender.email === session?.user?.email;

        // Check if this message is from the same sender as the previous one
        const isContinuation =
          prevMessage &&
          prevMessage.sender.email === message.sender.email;

        if (isContinuation) {
          // Add to the last group
          acc[acc.length - 1].messages.push(message);
        } else {
          // Create a new group
          acc.push({
            sender: message.sender.username,
            senderId: message.sender.user_id,
            avatar: message.avatar,
            messages: [message],
            isCurrentUser: isCurrentUser
          });
        }

        return acc;
      },
      []
    ) || [])
    : [];

  // Update to use selectedRoomId from Redux
  const currentRoom = rooms.find((r) => r.id === selectedRoomId);
  const [roomUsers, setRoomUsers] = useState<User[]>([]);

  // Fetch user details when currentRoom changes
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (currentRoom?.active_users && currentRoom.active_users.length > 0) {
        try {
          const response = await axios.post('/api/chat/get_rooms', {
            userIds: currentRoom.active_users
          });

          if (response.data && response.data.users) {
            setRoomUsers(response.data.users);
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      } else {
        setRoomUsers([]);
      }
    };

    fetchUserDetails();
  }, [currentRoom]);

  // Fetch messages when selecting a room
  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedRoomId) {
        // Check if we already have messages for this room and if they've been loaded from server
        const hasLoadedMessages = messagesLoaded[selectedRoomId];

        if (!hasLoadedMessages) {
          try {
            dispatch(setLoadingMessages(true));
            const response = await axios.get(`/api/chat/get_messages?roomId=${selectedRoomId}`);

            // Merge with any existing messages we might have
            const existingMessages = messages[selectedRoomId] || [];
            const serverMessages = response.data;

            // Create a map of existing messages by ID for quick lookup
            const existingMessageMap = new Map(
              existingMessages.map(msg => [msg.id, msg])
            );

            // Combine messages, avoiding duplicates
            const combinedMessages = [
              ...existingMessages,
              ...serverMessages.filter((msg: IMessage) => !existingMessageMap.has(msg.id))
            ];

            // Sort by created_at
            combinedMessages.sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            dispatch(setMessages({
              roomId: selectedRoomId,
              messages: combinedMessages
            }));

            dispatch(markRoomMessagesLoaded(selectedRoomId));
          } catch (error) {
            toaster.create({
              title: t("error"),
              description: t("error_fetching_messages"),
              type: "error"
            });
          } finally {
            dispatch(setLoadingMessages(false));
          }
        }
      }
    };

    fetchMessages();
  }, [selectedRoomId, dispatch, messages, messagesLoaded]);

  const handleFlipLayout = () => {
    setIsLayoutFlipped(!isLayoutFlipped);
  };

  // Modify the handleTaskModeToggle function to prevent non-owners from switching to task mode
  const handleTaskModeToggle = () => {
    // If user is not an owner in UAT, don't allow switching to task mode
    if (UAT && isTaskMode === false) {
      return;
    }

    // If switching to task mode while event source is active
    if (isTaskMode === false && isEventSourceActive) {
      // Don't immediately clear messages, just pause the UI updates
      chatModeContext.setPauseUpdates(true);
    } else if (isTaskMode === true && isEventSourceActive) {
      // Resuming updates when switching back to chat mode
      chatModeContext.setPauseUpdates(false);
    }

    setIsTaskMode(!isTaskMode);
  };

  // Add this effect to clean up event source when component unmounts
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        setIsEventSourceActive(false);
      }
    };
  }, []);

  // Get the chat mode context
  const chatModeContext = useChatMode();

  // Use a ref to track if we're in task mode to avoid dependency cycles
  const isTaskModeRef = React.useRef(isTaskMode);
  isTaskModeRef.current = isTaskMode;

  // Effect to clear chat mode messages when switching back to task mode
  useEffect(() => {
    if (isTaskMode && !isTaskModeRef.current) {
      chatModeContext.clearChatModeMessages();
    }
    isTaskModeRef.current = isTaskMode;
  }, [isTaskMode, chatModeContext]);

  // Force chat mode for non-owners when component mounts
  useEffect(() => {
    if (UAT) {
      setIsTaskMode(false);
    }
  }, [UAT]);

  // If there are no rooms but a room is selected, clear the selection
  useEffect(() => {
    if (rooms.length === 0 && selectedRoomId) {
      dispatch(clearSelectedRoom());
    }
  }, [rooms, selectedRoomId, dispatch]);

  const [isRoomDetailsOpen, setIsRoomDetailsOpen] = useState<boolean>(false);
  const [isInvitingUsers, setIsInvitingUsers] = useState<boolean>(false);

  const handleSendMessage = useCallback((newMessage: IMessage) => {
    if (newMessage.content.trim() && selectedRoomId && isTaskMode) {

      dispatch({
        type: 'chat/sendMessage',
        payload: { message: newMessage }
      });

      if (newMessage.mentions?.some(user => user.role === "agent")) {
        triggerAgentAPI(newMessage.content, selectedRoomId);
      }

      if (newMessage.mentions?.some(user => user.role === "user")) {
        dispatch({
          type: 'chat/mentionUser',
          payload: {
            message: newMessage,
          }
        });
      }

      setMessageInput("");
    }
  }, [dispatch, isTaskMode, selectedRoomId, setMessageInput, triggerAgentAPI]);

  // Memoize the ChatInput props to prevent unnecessary re-renders
  const chatInputProps = useMemo(() => ({
    messageInput,
    setMessageInput,
    handleSendMessage,
    selectedRoomId,
    users,
    agents,
    currentUser,
    isTaskMode,
    currentRoom,
    roomUsers,
  }), [
    messageInput,
    setMessageInput,
    handleSendMessage,
    selectedRoomId,
    users,
    agents,
    currentUser,
    isTaskMode,
    currentRoom,
    roomUsers
  ]);

  if (isLoadingRooms || isLoadingMessages || !session) {
    return <Loading />;
  }

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
        transition={{ duration: 0.3 }}
        display="flex"
        flexDirection="column"
        overflow="hidden"
        position="relative"
      >
        <Heading
          size="lg"
          mb={6}
          display="flex"
          alignItems="center"
          color={isTaskMode ? textColorHeading : "green.600"}
        >
          <Icon as={FaComments} mr={3} color={isTaskMode ? "blue.500" : "green.500"} />
          {t("chat")}
          {!isTaskMode && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              style={{ marginLeft: '8px', color: 'green.500' }}
            >
              ({t("chat_mode")})
            </motion.span>
          )}
        </Heading>

        <Flex
          width="100%"
          height="calc(100% - 60px)"
          position="relative"
          overflow="hidden"
          gap={4}
        >
          {/* Room List or Task Log Component with fixed width */}
          <MotionBox
            layout
            initial={false}
            animate={{
              left: isLayoutFlipped ? "calc(100% - 300px)" : 0,
              opacity: isTaskMode ? 1 : 0,
              scale: isTaskMode ? 1 : 0.9,
              width: isTaskMode ? "300px" : "0px",
              pointerEvents: isTaskMode ? "auto" : "none",
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 },
              width: { duration: 0.5 }
            }}
            position="absolute"
            height="100%"
            zIndex={1}
            whileHover={{ boxShadow: isTaskMode ? "0 4px 12px rgba(0,0,0,0.1)" : "none" }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isLayoutFlipped ? (
                <motion.div
                  key="task-log"
                  initial={{
                    opacity: 0,
                    scale: 0.92,
                    filter: "blur(8px)",
                    x: -20
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                    x: 0
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    filter: "blur(4px)",
                    x: 20
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeOut",
                    opacity: { duration: 0.4 },
                    scale: { duration: 0.5 },
                    filter: { duration: 0.4 },
                    x: { duration: 0.4 }
                  }}
                  style={{ height: '100%' }}
                >
                  <TaskLog />
                </motion.div>
              ) : (
                <motion.div
                  key="chat-room-list"
                  initial={{
                    opacity: 0,
                    scale: 0.92,
                    filter: "blur(8px)",
                    x: -20
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                    x: 0
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    filter: "blur(4px)",
                    x: 20
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeOut",
                    opacity: { duration: 0.4 },
                    scale: { duration: 0.5 },
                    filter: { duration: 0.4 },
                    x: { duration: 0.4 }
                  }}
                  style={{ height: '100%' }}
                >
                  <ChatRoomList
                    rooms={rooms}
                    selectedRoomId={selectedRoomId}
                    unreadCounts={unreadCounts}
                    onSelectRoom={(roomId) => dispatch(setSelectedRoom(roomId))}
                    onCreateRoomClick={() => setIsCreatingRoom(true)}
                    isCreatingRoomLoading={isCreatingRoomLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </MotionBox>

          {/* Chat Interface Component */}
          <MotionBox
            layout
            initial={false}
            animate={{
              left: !isTaskMode ? 0 : (isLayoutFlipped ? 0 : "300px"),
              width: !isTaskMode ? "100%" : (isLayoutFlipped ? "calc(100% - 300px - 1rem)" : "calc(100% - 300px - 1rem)"),
              opacity: 1,
              scale: 1,
            }}
            style={{
              backgroundColor: isTaskMode ? bgSubtle : chatModeBg,
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 }
            }}
            position="absolute"
            height="100%"
            overflow="hidden"
            borderRadius="md"
            display="flex"
            flexDirection="column"
            borderWidth="1px"
            borderColor={isTaskMode ? borderColor : chatModeBorder}
            zIndex={2}
            whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          >
            {/* Chat header */}
            <Flex
              p={4}
              borderBottomWidth="1px"
              borderColor={isTaskMode ? borderColor : chatModeBorder}
              bg={isTaskMode ? bgSubtle : chatModeBg}
              align="center"
              minHeight="80px"
              width="100%"
              position="relative"
            >
              <AnimatePresence mode="wait">
                {isCreatingRoom ? (
                  <CreateRoomForm
                    newRoomName={newRoomName}
                    setNewRoomName={setNewRoomName}
                    handleCreateRoom={handleCreateRoom}
                    handleCancel={() => {
                      setIsCreatingRoom(false);
                      setNewRoomName("");
                    }}
                    isCreatingRoomLoading={isCreatingRoomLoading}
                  />
                ) : (
                  <motion.div
                    key="room-info"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <Box ml={3}>
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color={isTaskMode ? textColorHeading : chatModeHeading}
                        display="flex"
                        alignItems="center"
                      >
                        {currentRoom?.name || t("select_room")}
                        {currentRoom && isTaskMode && (
                          <RoomMenu
                            onRoomDetails={() => {
                              setIsRoomDetailsOpen(true);
                            }}
                            onExitRoom={async () => {
                              try {
                                // Call API to remove room from active rooms
                                const response = await fetch('/api/user/update_active_rooms', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    roomId: currentRoom.id,
                                    action: 'remove'
                                  }),
                                });

                                // Call the remove_user_from_room endpoint
                                await axios.put(`/api/chat/remove_user_from_room`, {
                                  roomId: currentRoom.id,
                                  userId: currentUser?.user_id
                                });

                                // Only dispatch if currentUser and user_id exist
                                if (currentUser?.user_id) {
                                  dispatch(removeUserFromRoom({
                                    roomId: currentRoom.id,
                                    userId: currentUser.user_id
                                  }));
                                }

                                if (!response.ok) {
                                  throw new Error('Failed to exit room');
                                }

                                // Clear the selected room in Redux
                                dispatch(clearSelectedRoom());

                                // notice server to quit room
                                dispatch(quitRoom(currentRoom.id));

                                // refresh room list
                                const roomsResponse = await axios.get("/api/chat/get_rooms");
                                dispatch(setRooms(roomsResponse.data));

                                toaster.create({
                                  title: t("success"),
                                  description: t("left_room_successfully"),
                                  type: "info"
                                });
                              } catch (error) {
                                console.error("Error exiting room:", error);
                                toaster.create({
                                  title: t("error"),
                                  description: t("error_leaving_room"),
                                  type: "error"
                                });
                              }
                            }}
                          />
                        )}
                      </Text>
                      <AnimatePresence>
                        {isTaskMode && currentRoom && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Flex align="center">
                              <Icon
                                as={FaUsers}
                                color="blue.500"
                                boxSize={3}
                                mr={1}
                              />
                              <Text fontSize="xs" color={textColor}>
                                {t("active_users")}:{" "}
                                {currentRoom?.active_users?.length || 0}
                              </Text>
                            </Flex>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Layout toggle button with text - only show when not creating a room */}
              <AnimatePresence>
                {!isCreatingRoom && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    }}
                  >
                    {/* Task mode toggle - disabled for non-owners in UAT */}
                    <Text
                      as="button"
                      color={isTaskMode ? colors.taskModeColor : colors.chatModeColor}
                      fontWeight="medium"
                      cursor={UAT && !isTaskMode ? "not-allowed" : "pointer"}
                      onClick={handleTaskModeToggle}
                      opacity={UAT && !isTaskMode ? 0.6 : 1}
                      _hover={{
                        color: UAT && !isTaskMode
                          ? (isTaskMode ? colors.taskModeColor : colors.chatModeColor)
                          : (isTaskMode ? colors.taskModeHoverColor : colors.chatModeHoverColor),
                        textDecoration: UAT && !isTaskMode ? "none" : "underline"
                      }}
                      transition="color 0.2s ease"
                    >
                      {isTaskMode
                        ? t("switch_to_chat_mode")
                        : UAT
                          ? `${t("switch_to_task_mode")} (${t("disabled_task_view_due_to_uat")})`
                          : t("switch_to_task_mode")
                      }
                    </Text>

                    {/* Reset chat button - only show in chat mode */}
                    {!isTaskMode && (
                      <Text
                        as="button"
                        color={colors.chatModeColor}
                        fontWeight="medium"
                        cursor="pointer"
                        onClick={() => chatModeContext.clearChatModeMessages()}
                        _hover={{ color: colors.chatModeHoverColor, textDecoration: "underline" }}
                        transition="color 0.2s ease"
                        ml={4}
                      >
                        {t("reset_chat_mode") || "Reset Chat"}
                      </Text>
                    )}

                    {/* Layout toggle - only show in task mode and for owners */}
                    {isTaskMode && !UAT && (
                      <Text
                        as="button"
                        color="blue.500"
                        fontWeight="medium"
                        cursor="pointer"
                        onClick={handleFlipLayout}
                        _hover={{ color: "blue.600", textDecoration: "underline" }}
                        transition="color 0.2s ease"
                      >
                        {isLayoutFlipped ? t("switch_to_room_view") : t("switch_to_task_view")}
                      </Text>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Flex>

            {/* Messages area - conditionally render based on mode */}
            {isTaskMode ? (
              <ChatMessageList
                messageGroups={groupedMessages}
                messagesEndRef={messagesEndRef}
                isTaskMode={isTaskMode}
                // TODO: do not delete
                // @ts-ignore
                style={{
                  backgroundColor: messageListBg,
                  color: messageTextColor,
                }}
              />
            ) : (
              <ChatModeMessageList
                messagesEndRef={messagesEndRef}
                // TODO: do not delete
                // @ts-ignore
                style={{
                  backgroundColor: chatModeBg,
                  color: messageTextColor,
                }}
              />
            )}

            {/* Input area - conditionally render based on mode */}
            {isTaskMode ? (
              <ChatInput {...chatInputProps} />
            ) : (
              <ChatModeInput
                currentUser={currentUser}
                setIsEventSourceActive={setIsEventSourceActive}
                eventSourceRef={eventSourceRef}
              />
            )}
          </MotionBox>
        </Flex>
      </MotionBox>

      {/* Room Details Drawer */}
      <Drawer.Root open={isRoomDetailsOpen} onOpenChange={(e) => setIsRoomDetailsOpen(e.open)}>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bg={colors.bgSubtle} borderColor={colors.borderColor}>
              <Drawer.Header borderBottomColor={colors.borderColor}>
                <Drawer.Title color={colors.textColorHeading}>{currentRoom?.name || t("room_details")}</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                {currentRoom ? (
                  <VStack align="stretch" gap={4}>
                    <Box>
                      <Text fontWeight="bold" mb={2} color={colors.textColorHeading}>{t("room_info")}</Text>
                      <Text fontSize="sm" color={colors.textColor}>ID: {currentRoom.id}</Text>
                      <Text fontSize="sm" color={colors.textColor}>{t("created_at")}: {new Date(currentRoom.created_at || Date.now()).toLocaleString()}</Text>
                    </Box>

                    <Separator />

                    {/* Invite Users Section */}
                    <Box>
                      <HStack justifyContent="space-between" mb={2}>
                        <Text fontWeight="bold" color={colors.textColorHeading}>{t("invite_users")}</Text>
                        <IconButton
                          aria-label={isInvitingUsers ? t("cancel") : t("invite")}
                          size="sm"
                          variant="outline"
                          borderRadius="full"
                          onClick={() => setIsInvitingUsers(!isInvitingUsers)}
                          colorScheme="blue"
                        >
                          {/* Icon is provided via the icon prop */}
                          <Icon as={FaUserPlus} />
                        </IconButton>
                      </HStack>

                      {isInvitingUsers && currentRoom && (
                        <Box mt={2} mb={4}>
                          <RoomInvitation
                            roomId={currentRoom.id}
                            currentUsers={roomUsers}
                            onClose={() => setIsInvitingUsers(false)}
                          />
                        </Box>
                      )}
                    </Box>

                    <Separator />

                    <Box>
                      <Text fontWeight="bold" mb={2} color={colors.textColorHeading}>{t("active_users")}</Text>
                      {roomUsers && roomUsers.length > 0 ? (
                        <VStack align="stretch" gap={2}>
                          {roomUsers.map((user: User) => (
                            <HStack key={user.user_id} gap={3}>

                              <Avatar.Root size="sm" mt={2}>
                                <Avatar.Fallback name={user.username || user.email} />
                                <Avatar.Image src={user.avatar || undefined} />
                              </Avatar.Root>
                              <Text fontSize="sm" color={colors.textColor}>{user.username || user.email}</Text>
                              {user.email === currentUser?.email && (
                                <Badge colorScheme="green" size="sm">{t("you")}</Badge>
                              )}
                            </HStack>
                          ))}
                        </VStack>
                      ) : (
                        <Text fontSize="sm" color={colors.textColorSecondary || "gray.500"}>
                          {t("no_active_users")}
                          <Button
                            colorScheme="blue"
                            size="sm"
                            ml={2}
                            onClick={async () => {
                              try {
                                // Fetch the latest room data
                                const response = await axios.get(`/api/chat/get_room?roomId=${currentRoom.id}`);
                                if (response.data) {
                                  // Update the room in Redux
                                  dispatch(updateRoom(response.data));
                                }
                              } catch (error) {
                                console.error("Error refreshing room data:", error);
                              }
                            }}
                          >
                            {t("refresh")}
                          </Button>
                        </Text>
                      )}
                    </Box>
                  </VStack>
                ) : (
                  <Text color={colors.textColor}>{t("no_room_selected")}</Text>
                )}
              </Drawer.Body>
              <Drawer.Footer borderTopColor={colors.borderColor}>
                <Button variant="outline" onClick={() => setIsRoomDetailsOpen(false)}
                  borderColor={colors.borderColor} color={colors.textColor}>
                  {t("close")}
                </Button>
              </Drawer.Footer>
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" position="absolute" right={3} top={3} color={colors.textColor} />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Container>
  );
};

