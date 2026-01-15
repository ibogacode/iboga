'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getUnreadMessageCount } from '@/app/(dashboard)/messages/actions'
import { createClient } from '@/lib/supabase/client'

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const channelRef = useRef<any>(null)
  const mountedRef = useRef(true)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count } = await getUnreadMessageCount()
      if (mountedRef.current) {
        setUnreadCount(count)
      }
    } catch (error) {
      console.error('[useUnreadMessages] Error fetching unread count:', error)
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    // Initialize Supabase client
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }

    const supabase = supabaseRef.current

    // Initial fetch
    fetchUnreadCount()

    // Set up real-time subscription immediately (Supabase will handle auth internally)
    // Subscribe to all message inserts and conversation participant updates
    const channel = supabase
      .channel('unread_messages_counter')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // When a new message is inserted, refresh the unread count
          fetchUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
        },
        (payload) => {
          // When a conversation participant's last_read_at is updated, refresh the count
          fetchUnreadCount()
        }
      )
      .subscribe()

    channelRef.current = channel

    // Also keep a backup polling mechanism (every 60 seconds) in case real-time fails
    const interval = setInterval(fetchUnreadCount, 60000)

    return () => {
      mountedRef.current = false
      clearInterval(interval)

      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchUnreadCount])

  return { unreadCount, isLoading }
}
