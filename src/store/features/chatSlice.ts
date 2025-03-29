import { createSlice, PayloadAction, createAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { IChatRoom, IMessage } from '@/types/chat';
import { User } from '@/types/user';
// import { User } from '@/types/user';

interface ChatState {
    isSocketConnected: boolean;
    rooms: IChatRoom[];
    selectedRoomId: string | null;
    messages: Record<string, IMessage[]>; // roomId -> messages
    unreadCounts: Record<string, number>; // roomId -> count
    isLoadingRooms: boolean;
    isLoadingMessages: boolean;
    messagesLoaded: Record<string, boolean>; // Track which rooms have loaded messages from server
}

const initialState: ChatState = {
    isSocketConnected: false,
    rooms: [],
    selectedRoomId: null,
    messages: {},
    unreadCounts: {},
    isLoadingRooms: false,
    isLoadingMessages: false,
    messagesLoaded: {},
};

// Configure persist for chat slice
const chatPersistConfig = {
    key: 'chat',
    storage,
    whitelist: ['messages'], // Only persist messages
};

export const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setSocketConnected: (state, action: PayloadAction<boolean>) => {
            state.isSocketConnected = action.payload;
        },
        setRooms: (state, action: PayloadAction<IChatRoom[]>) => {
            state.rooms = action.payload;
        },
        addRoom: (state, action: PayloadAction<IChatRoom>) => {
            state.rooms.push(action.payload);
        },
        updateRoom: (state, action: PayloadAction<IChatRoom>) => {
            const index = state.rooms.findIndex(room => room.id === action.payload.id);
            if (index !== -1) {
                state.rooms[index] = action.payload;
            }
        },
        setSelectedRoom: (state, action: PayloadAction<string | null>) => {
            state.selectedRoomId = action.payload;
            // Reset unread count when selecting a room
            if (action.payload) {
                state.unreadCounts[action.payload] = 0;
            }
        },
        addMessage: (state, action: PayloadAction<{ roomId: string, message: IMessage }>) => {
            const { roomId, message } = action.payload;
            console.log("REDUCER: Adding message to room:", roomId, message);

            // Initialize the messages array for this room if it doesn't exist
            if (!state.messages[roomId]) {
                state.messages[roomId] = [];
            }

            // Add the message to the array
            state.messages[roomId].push(message);
            console.log("REDUCER: Updated messages for room:", state.messages[roomId]);

            // Increment unread count if not the selected room
            if (state.selectedRoomId !== roomId) {
                state.unreadCounts[roomId] = (state.unreadCounts[roomId] || 0) + 1;
            }
        },
        setMessages: (state, action: PayloadAction<{ roomId: string, messages: IMessage[] }>) => {
            const { roomId, messages } = action.payload;
            state.messages[roomId] = messages;
            state.messagesLoaded[roomId] = true;
        },
        setUnreadCount: (state, action: PayloadAction<{ roomId: string, count: number }>) => {
            state.unreadCounts[action.payload.roomId] = action.payload.count;
        },
        joinRoom: (state, action: PayloadAction<string>) => {
            // This is just to update the Redux state
            // The actual socket join happens in the middleware
            const roomId = action.payload;
            // You could add any state changes needed when joining a room
        },
        markRoomMessagesLoaded: (state, action: PayloadAction<string>) => {
            state.messagesLoaded[action.payload] = true;
        },
        initializeSocket: (state, action: PayloadAction<User>) => {
            // This is just a placeholder action
            // The actual socket initialization happens in the middleware
        },
    },
});

export const {
    setSocketConnected,
    setRooms,
    addRoom,
    updateRoom,
    setSelectedRoom,
    addMessage,
    setMessages,
    setUnreadCount,
    joinRoom,
    markRoomMessagesLoaded,
    initializeSocket,
} = chatSlice.actions;

export const setLoadingRooms = createAction<boolean>('chat/setLoadingRooms');
export const setLoadingMessages = createAction<boolean>('chat/setLoadingMessages');

// Create a persisted reducer
const persistedChatReducer = persistReducer(chatPersistConfig, chatSlice.reducer);

export default persistedChatReducer;
