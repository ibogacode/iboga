export type MessageType = 'text' | 'image' | 'audio' | 'file';

export interface ChatUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    avatar_url?: string;
    name?: string; // Derived for easier display
}

export interface Conversation {
    id: string;
    created_at: string;
    updated_at: string;
    last_message_at: string;
    last_message_preview?: string;
    is_group: boolean;
    name?: string;
    participants?: ChatParticipant[];
    unread_count?: number;
}

export interface ChatParticipant {
    conversation_id: string;
    user_id: string;
    joined_at: string;
    last_read_at: string;
    user?: ChatUser; // Joined profile data
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    type: MessageType;
    media_url?: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    delivered_at?: string;
    read_at?: string;
    sender?: ChatUser; // Joined profile data
}
