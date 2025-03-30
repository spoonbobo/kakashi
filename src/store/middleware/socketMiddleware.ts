import { Middleware } from 'redux';
import ChatSocketClient from '@/lib/chat_socket_client';
import { User } from '@/types/user';
import {
    setSocketConnected,
    addMessage,
    updateRoom,
    setSelectedRoom,
    setUnreadCount
} from '../features/chatSlice';
import { IMessage } from '@/types/chat';
import { toaster } from '@/components/ui/toaster';

let socketClient: ChatSocketClient | null = null;

export const socketMiddleware: Middleware = store => next => action => {
    const { dispatch, getState } = store;

    // Handle socket initialization
    // @ts-ignore
    if (action.type === 'chat/initializeSocket') {
        // @ts-ignore
        const user: User = action.payload;

        // Clean up existing socket if needed
        if (socketClient) {
            socketClient.disconnect();
            socketClient = null;
        }

        // Create a new socket client
        socketClient = new ChatSocketClient(user);

        // Set up event listeners
        socketClient.onConnect(() => {
            dispatch(setSocketConnected(true));
        });

        socketClient.onDisconnect(() => {
            dispatch(setSocketConnected(false));
            toaster.create({
                title: "Socket Disconnected",
                description: "Please try reconnecting later",
                type: "error"
            });
        });

        socketClient.onMessage((message: IMessage) => {
            toaster.create({
                title: "Message Received",
                description: `From room ${message.room_id}: ${message.content}`,
                type: "info"
            });

            if (message && message.room_id) {
                toaster.create({
                    title: "Message Dispatched",
                    description: `To room ${message.room_id}`,
                    type: "info"
                });
                dispatch(addMessage({ roomId: message.room_id, message }));

                // If this is not the currently selected room, update unread count
                const state = getState();
                if (state.chat.selectedRoomId !== message.room_id) {
                    dispatch(setUnreadCount({
                        roomId: message.room_id,
                        count: (state.chat.unreadCounts[message.room_id] || 0) + 1
                    }));
                }
            } else {
                toaster.create({
                    title: "Invalid message format",
                    description: "Please try again later",
                    type: "error"
                });
            }
        });

        socketClient.onRoomUpdate((room) => {
            dispatch(updateRoom(room));
            toaster.create({
                title: "Room Updated",
                description: `Room ${room.id} updated`,
                type: "info"
            });
        });

        // Initialize the connection
        socketClient.initialize();

        return next(action);
    }

    // Handle socket disconnection
    // @ts-ignore
    if (action.type === 'chat/disconnectSocket') {
        if (socketClient) {
            socketClient.disconnect();
            socketClient = null;
            dispatch(setSocketConnected(false));
        }

        return next(action);
    }

    // Handle sending messages
    // @ts-ignore
    if (action.type === 'chat/sendMessage') {
        // TODO: fix this
        // @ts-ignore
        const { message } = action.payload;
        if (socketClient) {
            // @ts-ignore
            socketClient.sendMessage(message);
        }

        return next(action);
    }

    // Handle joining a room
    // @ts-ignore
    if (action.type === 'chat/joinRoom') {
        // @ts-ignore
        const roomId = action.payload;
        // @ts-ignore
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            // @ts-ignore
            socketClient.joinRoom(roomId);
            // Optionally select the room after joining
            dispatch(setSelectedRoom(roomId));
        }
        return next(action);
    }

    // Pass all other actions to the next middleware
    return next(action);
}; 