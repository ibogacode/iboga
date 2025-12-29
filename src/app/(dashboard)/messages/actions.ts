'use server'

import { createClient } from '@/lib/supabase/server'

export async function getUserConversations(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('get_user_conversations', {
    p_user_id: userId,
    p_limit: 50,
    p_offset: 0
  })

  if (error) {
    console.error('[getUserConversations] RPC error:', error)
    return { conversations: [], error: error.message }
  }

  // Transform the data to match the expected format
  const conversations = (data ?? []).map((conv: any) => {
    // JSONB from PostgreSQL is already parsed, but check if it's a string
    let participants = conv.participants
    if (typeof participants === 'string') {
      try {
        participants = JSON.parse(participants)
      } catch (e) {
        console.warn('[getUserConversations] Failed to parse participants JSON:', e)
        participants = []
      }
    }
    
    // Ensure participants is an array
    if (!Array.isArray(participants)) {
      console.warn('[getUserConversations] Participants is not an array:', participants)
      participants = []
    }
    
    return {
      id: conv.id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      last_message_at: conv.last_message_at,
      last_message_preview: conv.last_message_preview,
      is_group: conv.is_group,
      name: conv.name,
      unread_count: conv.unread_count || 0,
      participants: participants.map((p: any) => ({
        conversation_id: conv.id,
        user_id: p.user_id,
        joined_at: p.joined_at,
        last_read_at: p.last_read_at,
        user: p.user
      }))
    }
  })

  return { conversations, error: null }
}

