import { User } from "./user";

// client -> server Message
export interface IMessage {
    id: string;
    created_at: string;
    sender: User;
    content: string;
    avatar: string;
    room_id: string;
}

export interface IChatBubbleProps {
    message: Message;
    isUser: boolean;
    isFirstInGroup: boolean;
}

// client-view
export interface IChatRoom {
    id: string;
    created_at: string;
    last_updated: string;
    name: string;
    unread: number;
    active_users: User[];
}

// server -> client message
// this update will be sent to all clients in the room.
// active_users -> chatroom (#people, who are they)
export interface IChatRoomUpdate {
    id: string;
    active_users: User[];
    messages: IMessage[];
}
