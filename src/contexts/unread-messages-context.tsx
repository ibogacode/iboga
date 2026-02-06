'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { getUnreadMessageCount } from '@/app/(dashboard)/messages/actions'
import { createClient } from '@/lib/supabase/client'

interface UnreadMessagesContextValue {
  unreadCount: number
  isLoading: boolean
  refreshUnreadCount: () => Promise<void>
}

const UnreadMessagesContext = createContext<UnreadMessagesContextValue | null>(null)

export function useUnreadMessagesContext() {
  const context = useContext(UnreadMessagesContext)
  if (!context) {
    throw new Error('useUnreadMessagesContext must be used within UnreadMessagesProvider')
  }
  return context
}

interface UnreadMessagesProviderProps {
  children: ReactNode
}

export function UnreadMessagesProvider({ children }: UnreadMessagesProviderProps) {
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
      console.error('[UnreadMessagesProvider] Error fetching unread count:', error)
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

    // Set up real-time subscription
    // Subscribe to all message inserts and conversation participant updates
    const channel = supabase
      .channel('unread_messages_counter_global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
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
        () => {
          // When a conversation participant's last_read_at is updated, refresh the count
          fetchUnreadCount()
        }
      )
      .subscribe()

    channelRef.current = channel

    // Backup polling mechanism (every 5 minutes instead of 60 seconds)
    // Real-time should handle most updates, this is just a fallback
    const interval = setInterval(fetchUnreadCount, 300000) // 5 minutes

    return () => {
      mountedRef.current = false
      clearInterval(interval)

      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchUnreadCount])

  return (
    <UnreadMessagesContext.Provider value={{ unreadCount, isLoading, refreshUnreadCount: fetchUnreadCount }}>
      {children}
    </UnreadMessagesContext.Provider>
  )
}
