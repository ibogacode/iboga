'use server'

import { createClient } from '@/lib/supabase/server'

export async function getUserConversations() {
  const supabase = await createClient()

  // Always use the authenticated user from the session (don’t trust an argument)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return { conversations: [], error: 'Not authenticated' }
  }

  const { data, error } = await supabase.rpc('get_user_conversations', {
    p_user_id: user.id,
    p_limit: 50,
    p_offset: 0,
  })

  if (error) {
    console.error('[getUserConversations] RPC error:', error)
    return { conversations: [], error: error.message }
  }

  const conversations = (data ?? []).map((conv: any) => {
    // participants is JSONB (already parsed). If somehow string, parse safely.
    let participants = conv.participants
    if (typeof participants === 'string') {
      try {
        participants = JSON.parse(participants)
      } catch {
        participants = []
      }
    }
    if (!Array.isArray(participants)) participants = []

    return {
      id: conv.id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      last_message_at: conv.last_message_at,
      last_message_preview: conv.last_message_preview,
      is_group: conv.is_group,
      name: conv.name,
      unread_count: conv.unread_count ?? 0,
      participants: participants.map((p: any) => ({
        conversation_id: conv.id,
        user_id: p.user_id,
        joined_at: p.joined_at,
        last_read_at: p.last_read_at,
        user: p.user,
      })),
    }
  })

  return { conversations, error: null }
}

export async function getUnreadMessageCount() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return { count: 0, error: 'Not authenticated' }
  }

  const { data, error } = await supabase.rpc('get_user_conversations', {
    p_user_id: user.id,
    p_limit: 50,
    p_offset: 0,
  })

  if (error) {
    console.error('[getUnreadMessageCount] RPC error:', error)
    return { count: 0, error: error.message }
  }

  // Sum up all unread counts across conversations
  const totalUnread = (data ?? []).reduce((sum: number, conv: any) => {
    return sum + (conv.unread_count ?? 0)
  }, 0)

  return { count: totalUnread, error: null }
}