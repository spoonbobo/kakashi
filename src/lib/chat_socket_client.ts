// do not delete below line.
// import { io, Manager } from "socket.io-client";
import io from "socket.io-client";
import { User } from "@/types/user";
import { IMessage } from "@/types/chat";
import { toaster } from '@/components/ui/toaster';
import { INotification } from "@/types/notification";

class ChatSocketClient {
    socket: any;
    private user: User;
    private messageCallback: ((message: IMessage) => void) | null = null;
    private notificationCallback: ((notification: INotification) => void) | null = null;

    constructor(user: User) {
        this.user = user;
    }

    initialize(): void {
        if (this.user.username === "") {
            return;
        }

        const socketUrl = window.location.origin;
        this.socket = io(socketUrl, {
            auth: {
                user: this.user
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        // Add direct event listeners for debugging
        this.socket.on('connect', () => {
            // Set up message listener after connection is established
            if (this.messageCallback) {
                this.setupMessageListener(this.messageCallback);
            }
            if (this.notificationCallback) {
                this.setupNotificationListener(this.notificationCallback);
            }
        });

        this.socket.on('connect_error', (err: any) => {
            toaster.create({
                title: "Connection Error",
                description: "Failed to connect to chat server",
                type: "error"
            });
        });

        this.socket.on('error', (err: any) => {
            toaster.create({
                title: "Socket Error",
                description: "An error occurred with the chat connection",
                type: "error"
            });
        });
    }

    onConnect(callback: () => void): void {
        if (this.socket) {
            this.socket.on('connect', callback);
        }
    }

    joinRoom(roomId: string): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('join_room', roomId);
        } else {
            // 
        }
    }

    inviteToRoom(roomId: string, userIds: string[]): void {
        console.log("inviteToRoom", roomId, userIds);
        console.log("this.socket", this.socket);
        console.log("this.socket.connected", this.socket.connected);
        if (this.socket && this.socket.connected) {
            this.socket.emit('invite_to_room', { roomId, userIds });
        } else {
            //
        }
        // console.log("invite_to_room", roomId, userIds);
    }

    quitRoom(roomId: string): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('quit_room', roomId);
        } else {
            //
        }
    }

    onDisconnect(callback: () => void): void {
        if (this.socket) {
            this.socket.on('disconnect', callback);
        }
    }

    onMessage(callback: (message: IMessage) => void): void {
        // Store the callback for later use if socket isn't connected yet
        this.messageCallback = callback;

        if (this.socket && this.socket.connected) {
            this.setupMessageListener(callback);
        } else {
            // console.log("Socket not connected yet, message listener will be set up after connection");
        }
    }

    onNotification(callback: (notification: INotification) => void): void {
        this.notificationCallback = callback;

        if (this.socket && this.socket.connected) {
            console.log("Socket connected, setting up notification listener");
            this.setupNotificationListener(callback);
        } else {
            // Add error handling or connection waiting logic here
            console.log("Socket not connected yet, notification listener will be set up after connection");
        }
    }

    private setupMessageListener(callback: (message: IMessage) => void): void {
        // Remove any existing listeners to prevent duplicates
        this.socket.off('message');

        this.socket.on('message', (data: any) => {

            try {
                // Handle both string and object formats
                const messageData = typeof data === 'string' ? JSON.parse(data) : data;

                if (messageData && messageData.room_id) {
                    toaster.create({
                        title: "Message Processed",
                        description: "Valid message received",
                        type: "success"
                    });
                    callback(messageData);
                } else {
                    toaster.create({
                        title: "Invalid Message",
                        description: "Received malformed message structure",
                        type: "error"
                    });
                }
            } catch (error) {
                toaster.create({
                    title: "Message Error",
                    description: "Error processing received message",
                    type: "error"
                });
            }
        });
    }

    private setupNotificationListener(callback: (notification: INotification) => void): void {
        // Remove any existing listeners to prevent duplicates
        this.socket.off('notification');

        this.socket.on('notification', (data: any) => {
            try {
                // Handle both string and object formats
                const notificationData = typeof data === 'string' ? JSON.parse(data) : data;
                console.log("notificationData", notificationData);

                if (notificationData && notificationData.notification_id) {
                    // Extract relevant information from the notification
                    const processedNotification: INotification = {
                        id: notificationData.notification_id,
                        message: notificationData.message,
                        sender: notificationData.sender,
                        timestamp: new Date().toISOString(),
                        notification_id: notificationData.notification_id,
                        created_at: notificationData.created_at,
                    };

                    // Show toast for mentions
                    if (notificationData.message && notificationData.message.includes('@')) {
                        toaster.create({
                            title: `Mention from ${notificationData.sender?.username || 'Someone'}`,
                            description: notificationData.message || "You were mentioned",
                            type: "info"
                        });
                    }

                    callback(processedNotification);
                } else {
                    toaster.create({
                        title: "Invalid Notification",
                        description: "Received malformed notification structure",
                        type: "error"
                    });
                }
            } catch (error) {
                toaster.create({
                    title: "Notification Error",
                    description: "Error processing received notification",
                    type: "error"
                });
            }
        });
    }

    onRoomUpdate(callback: (room: any) => void): void {
        if (this.socket) {
            this.socket.on('room_update', callback);
        }
    }

    sendMessage(message: IMessage): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('message', message);
        } else {
            toaster.create({
                title: "Cannot Send Message",
                description: "Socket not connected",
                type: "error"
            });
        }
    }

    sendNotification(notification: INotification): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('notification', notification);
        } else {
            toaster.create({
                title: "Cannot Send Notification",
                description: "Socket not connected",
                type: "error"
            });
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            toaster.create({
                title: "Disconnected",
                description: "Socket disconnected successfully",
                type: "info"
            });
        }
    }
}

export default ChatSocketClient;