import { Box, Text, VStack, Badge, Flex, IconButton, Spinner } from "@chakra-ui/react";
import { useAuth } from "@/auth/context";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Tooltip } from "@/components/tooltip";
import { v4 as uuidv4 } from 'uuid';
import { Notification } from "@/types/alert";

const MotionBox = motion(Box);

export const NotifyPanel = () => {
    const { user: currentUser, isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [socket, setSocket] = useState<Socket | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const socketInitialized = useRef(false);
    const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(new Set());

    // Priority colors for badges - making these lighter
    const priorityColors = {
        low: "green.300",
        medium: "blue.300",
        high: "orange.300",
        critical: "red.300"
    };

    useEffect(() => {
        console.log('NotifyPanel component rendering');
        if (!isAuthenticated) return;

        // Fetch initial notifications
        const fetchNotifications = async () => {
            try {
                console.log('Fetching initial notifications...');
                const response = await fetch('/api/alert/get_notifications?limit=20');
                if (response.ok) {
                    const data = await response.json();
                    // Handle both the new format (object with notifications property) and old format (array)
                    const notificationsData = Array.isArray(data) ? data : data.notifications || [];
                    console.log('Received initial notifications:', notificationsData.length);
                    setNotifications(notificationsData);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();

        // Create a new socket connection
        let socketInstance: Socket | null = null;

        const initializeSocket = () => {
            console.log("Initializing socket connection...");

            // Clean up any existing socket
            if (socketInstance) {
                socketInstance.disconnect();
            }

            // Create new socket
            socketInstance = io(window.location.origin, {
                path: '/socket.io/',
                auth: {
                    token: currentUser?.token || localStorage.getItem('token')
                },
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                timeout: 20000,
                transports: ['websocket', 'polling'],
            });

            // Set up event handlers
            socketInstance.on('connect', () => {
                console.log('Socket connected successfully with ID:', socketInstance?.id);
                setSocketConnected(true);
                setSocket(socketInstance);

                // Request latest notifications after connection
                console.log('Requesting latest notifications after connection');
                socketInstance?.emit('get_notifications');
            });

            socketInstance.on('disconnect', () => {
                console.log('Socket disconnected');
                setSocketConnected(false);
            });

            socketInstance.on('connect_error', (error) => {
                console.error('Socket connection error:', error.message);
                setSocketConnected(false);
            });

            socketInstance.on('notifications_data', (data) => {
                console.log('Received notifications data from socket:', data);
                if (data.notifications && Array.isArray(data.notifications)) {
                    setNotifications(data.notifications);
                }
            });

            socketInstance.on('notification', (newNotification: Notification) => {
                console.log('Received new notification:', newNotification);

                // Add to notifications list
                setNotifications(prev => {
                    // Check if notification already exists to avoid duplicates
                    const exists = prev.some(n => n.notification_id === newNotification.notification_id);
                    if (exists) {
                        console.log('Notification already exists, updating');
                        return prev.map(n =>
                            n.notification_id === newNotification.notification_id ? newNotification : n
                        );
                    } else {
                        console.log('Adding new notification to list');
                        return [newNotification, ...prev].slice(0, 50);
                    }
                });

                // Mark as new for animation
                setNewNotificationIds(prev => {
                    const updated = new Set(prev);
                    updated.add(newNotification.notification_id);

                    // Remove the notification ID after animation completes
                    setTimeout(() => {
                        setNewNotificationIds(current => {
                            const next = new Set(current);
                            next.delete(newNotification.notification_id);
                            return next;
                        });
                    }, 3000); // 3 seconds animation duration

                    return updated;
                });
            });

            socketInstance.on('notification_status_updated', ({ notificationId, status }) => {
                console.log('Notification status updated:', notificationId, status);
                setNotifications(prev => prev.map(notification =>
                    notification.notification_id === notificationId ? { ...notification, status } : notification
                ));
            });

            // Connect the socket
            socketInstance.connect();

            return socketInstance;
        };

        // Initialize socket and store reference
        socketInstance = initializeSocket();
        setSocket(socketInstance);

        // Set up reconnection logic
        const reconnectInterval = setInterval(() => {
            if (socketInstance && !socketInstance.connected) {
                console.log('Attempting to reconnect socket...');
                socketInstance.connect();
            }
        }, 5000);

        // Listen for task action notifications
        const handleTaskActionNotification = (event: CustomEvent) => {
            const { notification } = event.detail;
            if (notification) {
                console.log('Received task action notification:', notification);

                // Create a proper notification object
                const newNotification = {
                    ...notification,
                    notification_id: notification.notification_id || uuidv4(),
                    timestamp: new Date().toISOString(),
                    status: 'new'
                };

                // Add to local state immediately for better UX
                setNotifications(prev => {
                    // Check if notification already exists
                    const exists = prev.some(n => n.notification_id === newNotification.notification_id);
                    if (exists) return prev;
                    return [newNotification, ...prev].slice(0, 50);
                });

                // Mark as new for animation
                setNewNotificationIds(prev => {
                    const updated = new Set(prev);
                    updated.add(newNotification.notification_id);
                    setTimeout(() => {
                        setNewNotificationIds(current => {
                            const next = new Set(current);
                            next.delete(newNotification.notification_id);
                            return next;
                        });
                    }, 3000);
                    return updated;
                });

                // Send to API
                sendNotificationViaApi(notification);
            }
        };

        window.addEventListener('taskActionNotification', handleTaskActionNotification as EventListener);

        // Mark socket as initialized
        socketInitialized.current = true;

        // Clean up function
        return () => {
            console.log('Cleaning up socket connection and intervals');
            clearInterval(reconnectInterval);

            if (socketInstance) {
                socketInstance.disconnect();
            }

            window.removeEventListener('taskActionNotification', handleTaskActionNotification as EventListener);
            socketInitialized.current = false;
        };
    }, [isAuthenticated, currentUser]);

    // Function to send a notification to the server via socket
    // const sendNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    //     // For now, always use API to ensure reliability
    //     sendNotificationViaApi(notification);
    // };

    // Fallback function to send notification via API
    const sendNotificationViaApi = async (notification: Omit<Notification, 'id' | 'timestamp'>) => {
        try {
            const response = await fetch('/api/alert/insert_notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notification)
            });

            if (!response.ok) {
                throw new Error(`Failed to send notification: ${response.status}`);
            }

            console.log('Notification sent via API successfully');
        } catch (error) {
            console.error('Error sending notification via API:', error);
            // Add to local state as fallback
            const newNotification = {
                ...notification,
                id: `local-${Date.now()}`,
                timestamp: new Date().toISOString()
            } as Notification;

            setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        }
    };

    const handleRefresh = async () => {
        if (!isAuthenticated) return;
        setIsRefreshing(true);

        try {
            console.log('Manually refreshing notifications...');
            const response = await fetch('/api/alert/get_notifications?limit=20');
            if (response.ok) {
                const data = await response.json();
                // Handle both the new format (object with notifications property) and old format (array)
                const notificationsData = Array.isArray(data) ? data : data.notifications || [];
                console.log('Received refreshed notifications:', notificationsData.length);
                setNotifications(notificationsData);
            }
        } catch (error) {
            console.error('Error refreshing notifications:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <MotionBox
            width="100%"
            height="100%"
            bg="white"
            boxShadow="md"
            borderRadius="md"
            overflowY="auto"
            p={4}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{
                duration: 0.7,
                x: { type: "spring", stiffness: 300, damping: 30 }
            }}
        >
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Text fontSize="xl" fontWeight="bold" textAlign="left">
                    Notifications {notifications.length > 0 &&
                        <Text as="span" fontSize="md" color="gray.500">({notifications.length})</Text>}
                </Text>
                <Flex gap={2} alignItems="center">
                    {!socketConnected && (
                        <Badge colorScheme="red" variant="subtle">Offline</Badge>
                    )}
                    <Tooltip content="Refresh notifications">
                        <IconButton
                            aria-label="Refresh notifications"
                            size="sm"
                            loading={isRefreshing}
                            onClick={handleRefresh}
                            variant="ghost"
                        />
                    </Tooltip>
                </Flex>
            </Flex>

            {/* Notification List with Animations */}
            <VStack
                align="stretch"
                height="calc(100% - 70px)"
                overflowY="auto"
                css={{
                    '&::-webkit-scrollbar': {
                        width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                        width: '6px',
                        background: 'rgba(0,0,0,0.05)',
                        borderRadius: '24px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(0,0,0,0.15)',
                        borderRadius: '24px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                        background: 'rgba(0,0,0,0.25)',
                    },
                }}
            >
                {loading ? (
                    <Flex justify="center" align="center" height="100px">
                        <Spinner />
                    </Flex>
                ) : notifications.length === 0 ? (
                    <Flex justify="center" align="center" height="100px">
                        <Text color="gray.500">No notifications at this time.</Text>
                    </Flex>
                ) : (
                    <AnimatePresence initial={false}>
                        {notifications.map((notification) => (
                            <MotionBox
                                key={notification.notification_id}
                                layout
                                initial={newNotificationIds.has(notification.notification_id) ?
                                    { opacity: 0, y: -20, scale: 0.95 } : { opacity: 1 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    backgroundColor: newNotificationIds.has(notification.notification_id)
                                        ? ['rgba(66, 153, 225, 0.08)', 'rgba(255, 255, 255, 0)']
                                        : 'rgba(255, 255, 255, 0)'
                                }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{
                                    duration: 0.5,
                                    backgroundColor: { duration: 2.5 }
                                }}
                                p={3}
                                borderWidth="1px"
                                borderRadius="md"
                                borderLeftWidth="2px"
                                borderLeftColor={priorityColors[notification.priority]}
                                bg="gray.50"
                                _hover={{ bg: "gray.100" }}
                            >
                                <Flex direction="column" w="100%">
                                    {notification.sender && (
                                        <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>
                                            From: {notification.sender}
                                        </Text>
                                    )}
                                    <Text fontWeight="normal" mb={1}>{notification.message}</Text>
                                    <Flex justifyContent="flex-end">
                                        <Text fontSize="xs" color="gray.500">
                                            {new Date(notification.timestamp).toLocaleString()}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </MotionBox>
                        ))}
                    </AnimatePresence>
                )}
            </VStack>
        </MotionBox>
    );
};