// Supabase Database Types
// These types represent the structure of your Supabase database tables

export interface Database {
  public: {
    Tables: {
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: string
          created_at: string
          joined_at: string | null
          last_read_at: string | null
        }
        Insert: {
          conversation_id: string
          user_id: string
          created_at?: string
          joined_at?: string | null
          last_read_at?: string | null
        }
        Update: {
          conversation_id?: string
          user_id?: string
          created_at?: string
          joined_at?: string | null
          last_read_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          name: string | null
          role: string
          avatar_url: string | null
          phone: string | null
          designation: string | null
          pay_rate_per_hour: number | null
          is_online: boolean
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          name?: string | null
          role: string
          avatar_url?: string | null
          phone?: string | null
          designation?: string | null
          pay_rate_per_hour?: number | null
          is_online?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          name?: string | null
          role?: string
          avatar_url?: string | null
          phone?: string | null
          designation?: string | null
          pay_rate_per_hour?: number | null
          is_online?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          last_message_at: string | null
          last_message_preview: string | null
          is_group: boolean
          name: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          is_group?: boolean
          name?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          is_group?: boolean
          name?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          type: string
          media_url: string | null
          reply_to: string | null
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          type?: string
          media_url?: string | null
          reply_to?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          type?: string
          media_url?: string | null
          reply_to?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      get_unread_count: {
        Args: {
          p_conversation_id: string
          p_user_id: string
        }
        Returns: number
      }
      mark_messages_as_read: {
        Args: {
          p_conversation_id: string
          p_user_id: string
        }
        Returns: number
      }
      get_user_conversations: {
        Args: {
          p_user_id: string
          p_limit: number
          p_offset: number
        }
        Returns: unknown[]
      }
    }
  }
}

