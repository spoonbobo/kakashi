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
  IconButton,
  Input
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FaComments, FaUsers, FaTasks, FaUserPlus, FaEdit, FaTimes } from "react-icons/fa";
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
  removeUserFromRoom,
  setUnreadCount
} from '@/store/features/chatSlice';
import { updateActiveRooms } from '@/store/features/userSlice';
import React from "react";
import { ChatRoomList } from "@/components/chat/room_list";
import { ChatMessageList } from "@/components/chat/message_list";
import { ChatInput } from "@/components/chat/chat_input";
import { CreateRoomForm } from "@/components/chat/create_room_form";
import { toaster } from "@/components/ui/toaster";
import { useChatPageColors } from "@/utils/colors";
import { RoomMenu } from "@/components/chat/room_menu";
import { RoomInvitation } from "@/components/chat/room_invitation";
import { useRouter } from "next/navigation";

const MotionBox = motion.create(Box);
const MESSAGE_LIMIT = 30;

export default function ChatPage() {
  const { currentUser, isAuthenticated } = useSelector((state: RootState) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <ChatPageContent />;
}

// The main ChatPageContent component
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
  const isSocketConnected = useSelector((state: RootState) => state.chat.isSocketConnected);

  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const isOwner = useSelector((state: RootState) => state.user.isOwner);

  // Get messages for the selected room
  const currentMessages = selectedRoomId ? messages[selectedRoomId] || [] : [];

  const [messageInput, setMessageInput] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [isCreatingRoomLoading, setIsCreatingRoomLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<User[]>([]);

  // Add ref for message container to enable auto-scrolling
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Use the centralized colors instead of direct useColorModeValue calls
  const bgSubtle = colors.bgSubtle;
  const textColor = colors.textColor;
  const textColorHeading = colors.textColorHeading;
  const borderColor = colors.borderColor;

  // Add new color variables for message list consistency
  const messageListBg = bgSubtle;
  const messageTextColor = colors.messageTextColor || textColor;

  // Add these state variables
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isRoomDetailsOpen, setIsRoomDetailsOpen] = useState<boolean>(false);
  const [isInvitingUsers, setIsInvitingUsers] = useState<boolean>(false);
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [isUpdatingName, setIsUpdatingName] = useState<boolean>(false);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get("/api/chat/get_rooms");
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
      let assigneeObj = null;
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
              assigneeObj = mentionedAgent;
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
        created_at: new Date().toISOString(),
        assignee_obj: assigneeObj
      };
      console.log("Payload:", payload);

      // Only add assignee to the payload if we found a valid assignee
      if (assigneeId) {
        // @ts-ignore
        payload.assignee = assigneeId;
      }

      await axios.post(url, payload);

      dispatch(joinRoom(roomId));

      // Add the room to the user's active_rooms
      await axios.post("/api/user/update_active_rooms", {
        roomId: roomId,
        action: "add"
      });

      // Update the Redux state to match the database
      dispatch(updateActiveRooms({ roomId, action: "add" }));
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

        // Update the Redux state to match the database
        dispatch(updateActiveRooms({ roomId, action: "add" }));

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
        // Skip messages with null sender
        if (!message.sender) {
          return acc;
        }

        const prevMessage = messages[selectedRoomId][index - 1];

        // Check if this message is from the current user
        // Add null check for message.sender.email
        const isCurrentUser = message.sender.email && session?.user?.email
          ? message.sender.email === session.user.email
          : false;

        // Check if this message is from the same sender as the previous one
        // Add null checks for both message senders
        const isContinuation =
          prevMessage &&
          prevMessage.sender &&
          message.sender &&
          prevMessage.sender.email === message.sender.email;

        if (isContinuation) {
          // Add to the last group
          acc[acc.length - 1].messages.push(message);
        } else {
          // Create a new group
          acc.push({
            sender: message.sender.username || 'Unknown User',
            senderId: message.sender.user_id,
            avatar: message.avatar || '',
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
        try {
          dispatch(setLoadingMessages(true));
          const response = await axios.get(`/api/chat/get_messages?roomId=${selectedRoomId}&limit=${MESSAGE_LIMIT}`);

          // Get the raw messages from the server
          const serverMessages = response.data;

          setHasMoreMessages(serverMessages.length >= MESSAGE_LIMIT);

          // Rest of the code remains the same
          const userIds = [...new Set(serverMessages.map((msg: any) =>
            typeof msg.sender === 'string' ? msg.sender : msg.sender?.user_id
          ))].filter(Boolean);

          // Fetch user details for all message senders
          const usersResponse = await axios.post('/api/user/get_users', {
            user_ids: userIds
          });

          // Create a map of user_id to User object
          const userMap = new Map();
          if (usersResponse.data && usersResponse.data.users) {
            usersResponse.data.users.forEach((user: User) => {
              userMap.set(user.user_id, user);
            });
          }

          // Transform messages to include proper User objects
          const transformedMessages = serverMessages.map((msg: any) => {
            // If sender is a string (user_id), replace with User object
            if (typeof msg.sender === 'string') {
              const user = userMap.get(msg.sender);
              return {
                ...msg,
                sender: user || {
                  user_id: msg.sender,
                  username: 'Unknown User',
                  email: '',
                  role: 'user',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  active_rooms: [],
                  archived_rooms: []
                }
              };
            }
            return msg;
          });

          dispatch(setMessages({
            roomId: selectedRoomId,
            messages: transformedMessages
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
    };

    if (selectedRoomId) {
      fetchMessages();
    }
  }, [selectedRoomId, dispatch, t]);

  // If there are no rooms but a room is selected, clear the selection
  useEffect(() => {
    if (rooms.length === 0 && selectedRoomId) {
      dispatch(clearSelectedRoom());
    }
  }, [rooms, selectedRoomId, dispatch]);

  const handleSendMessage = useCallback((newMessage: IMessage) => {
    console.log("Sending message:", newMessage);

    if (newMessage.content.trim() && selectedRoomId) {
      dispatch({
        type: 'chat/sendMessage',
        payload: { message: newMessage }
      });

      console.log("Message dispatched to Redux");

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

      // Directly scroll to bottom with multiple attempts to ensure it works
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });

        // Add multiple attempts with timeouts to ensure scrolling works
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }

      // Also dispatch the event as a backup method
      window.dispatchEvent(new CustomEvent('scrollToBottom'));
    }
  }, [dispatch, selectedRoomId, setMessageInput, triggerAgentAPI, messagesEndRef]);

  // Memoize the ChatInput props to prevent unnecessary re-renders
  const chatInputProps = useMemo(() => ({
    messageInput,
    setMessageInput,
    handleSendMessage,
    selectedRoomId,
    users,
    agents,
    currentUser,
    currentRoom,
    roomUsers,
    isSocketConnected,
  }), [
    messageInput,
    setMessageInput,
    handleSendMessage,
    selectedRoomId,
    users,
    agents,
    currentUser,
    currentRoom,
    roomUsers,
    isSocketConnected
  ]);

  // Add a function to load more messages
  const loadMoreMessages = async () => {
    if (!selectedRoomId || isLoadingMore || !hasMoreMessages) return;

    try {
      setIsLoadingMore(true);

      // Get the oldest message ID we currently have
      const currentMessages = messages[selectedRoomId] || [];
      if (currentMessages.length === 0) return;

      // Find the oldest message by created_at timestamp
      const oldestMessage = currentMessages.reduce((oldest, current) =>
        new Date(oldest.created_at) < new Date(current.created_at) ? oldest : current
      );

      // Fetch older messages
      const response = await axios.get(`/api/chat/get_messages?roomId=${selectedRoomId}&limit=${MESSAGE_LIMIT}&before=${oldestMessage.id}`);

      // If we got fewer messages than requested, we've reached the end
      setHasMoreMessages(response.data.length >= MESSAGE_LIMIT);

      if (response.data.length === 0) {
        setHasMoreMessages(false);
        return;
      }

      // Process messages like before
      const serverMessages = response.data;
      const userIds = [...new Set(serverMessages.map((msg: any) =>
        typeof msg.sender === 'string' ? msg.sender : msg.sender?.user_id
      ))].filter(Boolean);

      const usersResponse = await axios.post('/api/user/get_users', {
        user_ids: userIds
      });

      const userMap = new Map();
      if (usersResponse.data && usersResponse.data.users) {
        usersResponse.data.users.forEach((user: User) => {
          userMap.set(user.user_id, user);
        });
      }

      const transformedMessages = serverMessages.map((msg: any) => {
        if (typeof msg.sender === 'string') {
          const user = userMap.get(msg.sender);
          return {
            ...msg,
            sender: user || {
              user_id: msg.sender,
              username: 'Unknown User',
              email: '',
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              active_rooms: [],
              archived_rooms: []
            }
          };
        }
        return msg;
      });

      // Combine with existing messages
      dispatch(setMessages({
        roomId: selectedRoomId,
        messages: [...transformedMessages, ...currentMessages]
      }));

      // Dispatch a custom event to notify that we've loaded more messages
      // This helps with scroll position management
      window.dispatchEvent(new CustomEvent('moreMessagesLoaded'));

    } catch (error) {
      toaster.create({
        title: t("error"),
        description: t("error_loading_more_messages"),
        type: "error"
      });
      console.error("Error loading more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Add this function to your ChatPageContent component
  const loadMessages = useCallback(async (roomId: string) => {
    try {
      console.log("Loading messages for room:", roomId);
      dispatch(setLoadingMessages(true));

      const response = await axios.get(`/api/chat/get_messages?roomId=${roomId}`);

      if (response.data && Array.isArray(response.data)) {
        dispatch(setMessages({ roomId, messages: response.data }));
        dispatch(markRoomMessagesLoaded(roomId));
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toaster.create({
        title: t("error"),
        description: t("error_loading_messages"),
        type: "error"
      });
    } finally {
      dispatch(setLoadingMessages(false));
    }
  }, [dispatch, t]);

  // Then update the handleRoomSelect function
  const handleRoomSelect = useCallback((roomId: string) => {
    console.log("Selecting room:", roomId);

    // First join the room via socket
    dispatch({ type: 'chat/joinRoom', payload: roomId });

    // Then set it as selected in Redux
    dispatch(setSelectedRoom(roomId));

    // Reset unread count for this room
    dispatch(setUnreadCount({ roomId, count: 0 }));

    // Load messages if not already loaded
    if (!messagesLoaded[roomId]) {
      loadMessages(roomId);
    }
  }, [dispatch, messagesLoaded, loadMessages]);

  // Add this useEffect to your ChatPageContent component
  useEffect(() => {
    // When socket connects, join all rooms the user is part of
    if (isSocketConnected && rooms.length > 0) {
      console.log("Socket connected, joining all rooms:", rooms.map(r => r.id));
      rooms.forEach(room => {
        dispatch({ type: 'chat/joinRoom', payload: room.id });
      });
    }
  }, [isSocketConnected, rooms, dispatch]);

  // IMPORTANT: Move this conditional rendering AFTER all hooks are defined
  // This ensures all hooks are called in the same order on every render
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
          color={textColorHeading}
        >
          <Icon as={FaComments} mr={3} color="blue.500" />
          {t("chat")}
        </Heading>

        <Flex
          width="100%"
          height="calc(100% - 60px)"
          position="relative"
          overflow="hidden"
          gap={4}
        >
          {/* Room List Component with fixed width - simplified without layout flipping */}
          <MotionBox
            layout
            initial={false}
            animate={{
              left: 0,
              opacity: 1,
              scale: 1,
              width: "300px",
              pointerEvents: "auto",
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
            whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          >
            <Box height="100%">
              <ChatRoomList
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                unreadCounts={unreadCounts}
                onSelectRoom={(roomId) => dispatch(setSelectedRoom(roomId))}
                onCreateRoomClick={() => setIsCreatingRoom(true)}
                isCreatingRoomLoading={isCreatingRoomLoading}
              />
            </Box>
          </MotionBox>

          {/* Chat Interface Component - simplified without layout flipping */}
          <MotionBox
            layout
            initial={false}
            animate={{
              left: "300px",
              width: "calc(100% - 300px - 1rem)",
              opacity: 1,
              scale: 1,
            }}
            style={{
              backgroundColor: bgSubtle,
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
            borderColor={borderColor}
            zIndex={2}
            whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          >
            {/* Chat header */}
            <Flex
              p={4}
              borderBottomWidth="1px"
              borderColor={borderColor}
              bg={bgSubtle}
              align="center"
              minHeight="80px"
              width="100%"
              position="relative"
              justifyContent="space-between"
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
                        color={textColorHeading}
                        display="flex"
                        alignItems="center"
                      >
                        {currentRoom?.name || t("select_room")}
                      </Text>
                      <AnimatePresence>
                        {currentRoom && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Flex align="center">
                              <Icon
                                as={FaUsers}
                                color={colors.aiNameColor}
                                boxSize={3}
                                mr={1}
                              />
                              <Text fontSize="xs" color={colors.textColor}>
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

              {/* Room Menu moved to right side */}
              {currentRoom && !isCreatingRoom && (
                <Box>
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
                </Box>
              )}
            </Flex>

            {/* Messages area - remove isTaskMode prop */}
            <ChatMessageList
              messageGroups={groupedMessages}
              messagesEndRef={messagesEndRef}
              onLoadMore={loadMoreMessages}
              isLoadingMore={isLoadingMore}
              hasMoreMessages={hasMoreMessages}
            />

            {/* Input area */}
            <ChatInput {...chatInputProps} />
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

                      {/* Room Name Edit Section */}
                      <Box mt={3}>
                        <HStack justifyContent="space-between" mb={2}>
                          <Text fontWeight="bold" color={colors.textColorHeading}>{t("room_name")}</Text>
                          <IconButton
                            aria-label={isEditingName ? t("cancel") : t("edit")}
                            size="sm"
                            variant="outline"
                            borderRadius="full"
                            onClick={() => setIsEditingName(!isEditingName)}
                            colorScheme="blue"
                          >
                            <Icon as={isEditingName ? FaTimes : FaEdit} />
                          </IconButton>
                        </HStack>

                        {isEditingName ? (
                          <HStack mt={2}>
                            <Input
                              value={newRoomName}
                              onChange={(e) => setNewRoomName(e.target.value)}
                              placeholder={t("enter_room_name")}
                              size="sm"
                            />
                            <Button
                              size="sm"
                              colorScheme="blue"
                              loading={isUpdatingName}
                              onClick={async () => {
                                if (!newRoomName.trim() || !currentRoom) return;

                                setIsUpdatingName(true);
                                try {
                                  const response = await axios.put('/api/chat/update_room', {
                                    roomId: currentRoom.id,
                                    name: newRoomName.trim()
                                  });

                                  if (response.data) {
                                    dispatch(updateRoom(response.data));
                                    setIsEditingName(false);
                                    toaster.create({
                                      title: t("success"),
                                      description: t("room_name_updated"),
                                      type: "success"
                                    });
                                  }
                                } catch (error) {
                                  console.error("Error updating room name:", error);
                                  toaster.create({
                                    title: t("error"),
                                    description: t("failed_to_update_room_name"),
                                    type: "error"
                                  });
                                } finally {
                                  setIsUpdatingName(false);
                                }
                              }}
                            >
                              {t("save")}
                            </Button>
                          </HStack>
                        ) : (
                          <Text fontSize="md" color={colors.textColor}>{currentRoom.name}</Text>
                        )}
                      </Box>
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