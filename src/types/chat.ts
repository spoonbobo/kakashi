export interface User {
  id: string;
  username: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  task_id?: string;
  is_tool_call?: boolean;
}

export interface MentionState {
  isActive: boolean;
  startPosition: number;
  searchText: string;
}

export interface Room {
  id: string;
  name: string;
  created_at: string;
  messages: ChatMessage[];
  message_count: number;
}