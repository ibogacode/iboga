'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChatSidebar } from '@/components/chat/sidebar';
import { ChatWindow } from '@/components/chat/chat-window';
import { Conversation } from '@/types/chat';
import { MessageSquarePlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessagesClientProps {
  userId: string;
  initialConversations?: Conversation[];
}

export function MessagesClient({ userId, initialConversations = [] }: MessagesClientProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [user, setUser] = useState<any>(null);

  const supabase = useMemo(() => createClient(), []);

  const mountedRef = useRef(true);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const convIdsRef = useRef<string[]>([]);

  const safeSet = useCallback(<T,>(setter: (v: T) => void, v: T) => {
    if (mountedRef.current) setter(v);
  }, []);

  const transformConversations = useCallback((rows: any[]): Conversation[] => {
    return (rows ?? []).map((conv: any) => {
      const participantsRaw = conv.participants;
      const participants = Array.isArray(participantsRaw) ? participantsRaw : [];

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
          user: p.user,
        })),
      };
    });
  }, []);

const fetchConversations = useCallback(
  async (source: 'initial' | 'realtime' | 'manual' = 'manual') => {
    if (!userId) return;

    // prevent overlapping requests
    if (inFlightRef.current) return;

    // create the promise first and store it
    const promise = (async () => {
      safeSet(setLoading, true);

      try {
        const { data, error } = await supabase.rpc('get_user_conversations', {
          p_user_id: userId,
          p_limit: 50,
          p_offset: 0,
        } as any);

        if (error) {
          console.error(`[${source}] get_user_conversations error:`, error);
          return;
        }

        const next = transformConversations(data ?? []);
        safeSet(setConversations, next);
      } finally {
        safeSet(setLoading, false);
        inFlightRef.current = null; // ✅ always clear after done
      }
    })();

    inFlightRef.current = promise;
    await promise;
  },
  [supabase, userId, safeSet, transformConversations]
);

  // Kept (optional) – not used on message insert anymore
  const scheduleRefetch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (!inFlightRef.current) fetchConversations('realtime');
    }, 400);
  }, [fetchConversations]);

  const buildConversationFilter = (ids: string[]) => {
    return `conversation_id=in.(${ids.join(',')})`;
  };

  const resubscribeRealtime = useCallback(
    (ids: string[]) => {
      // Clean up old channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (!ids.length) return;

      const filter = buildConversationFilter(ids);

      const channel = supabase
        .channel(`messages_for_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter,
          },
          (payload) => {
            // ✅ NO RPC REFRESH HERE — update sidebar locally to avoid "page refresh" feel
            const msg = payload.new as any;

            setConversations((prev) =>
              prev
                .map((c) => {
                  if (c.id !== msg.conversation_id) return c;

                  const isMine = msg.sender_id === userId;

                  return {
                    ...c,
                    last_message_at: msg.created_at ?? new Date().toISOString(),
                    last_message_preview:
                      msg.type === 'image'
                        ? '📷 Image'
                        : msg.type === 'audio'
                        ? '🎵 Audio'
                        : msg.content ?? '',
                    unread_count: isMine ? (c.unread_count || 0) : (c.unread_count || 0) + 1,
                  };
                })
                // Move updated conversation to top
                .sort((a, b) => {
                  const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
                  const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
                  return bt - at;
                })
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter,
          },
          (payload) => {
            // When messages are marked as read, refresh unread counts from database
            const msg = payload.new as any;
            if (msg.read_at) {
              // Message was marked as read, refresh the conversation list to update unread counts
              scheduleRefetch();
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    },
    [supabase, userId, scheduleRefetch]
  );

  // Load auth user object once (client-side)
  useEffect(() => {
    if (!userId) return;
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) safeSet(setUser, authUser);
    });
  }, [userId, supabase, safeSet]);

  // Mount/unmount housekeeping + initial fetch
  useEffect(() => {
    mountedRef.current = true;

    if (initialConversations.length > 0) {
      safeSet(setConversations, initialConversations);
    }

    // Always refresh once on mount so RPC is the truth
    fetchConversations('initial');

    return () => {
      mountedRef.current = false;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      inFlightRef.current = null;
    };
  }, [initialConversations, fetchConversations, safeSet, supabase]);

  // Global subscription for new conversations (always active)
  useEffect(() => {
    if (!userId) return;

    const newConvChannel = supabase
      .channel(`new_conversations_for_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // When current user is added to a new conversation, refresh the list
          console.log('[Real-time] New conversation detected, refreshing list...');
          scheduleRefetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(newConvChannel);
    };
  }, [userId, supabase, scheduleRefetch]);

  // Realtime subscription should track current conversation IDs
  useEffect(() => {
    const ids = (conversations ?? []).map((c) => c.id).filter(Boolean);

    const prev = convIdsRef.current;
    const same = prev.length === ids.length && prev.every((v, i) => v === ids[i]);
    if (same) return;

    convIdsRef.current = ids;
    resubscribeRealtime(ids);
  }, [conversations, resubscribeRealtime]);

  const handleMessagesRead = useCallback(() => {
    // Optional: keep this if you want unread counts to resync from DB
    // scheduleRefetch();
  }, []);

  const handleNewChat = async (targetUserId: string) => {
    if (!userId) return;

    const existing = conversations.find(
      (c) => c.participants?.some((p) => p.user_id === targetUserId) && !c.is_group
    );

    if (existing) {
      setSelectedChatId(existing.id);
      setIsNewChatOpen(false);
      setShowChatOnMobile(true);
      return;
    }

const { data: newConvId, error } = await supabase.rpc(
  'create_conversation_with_participants',
  { p_other_user_id: targetUserId } as any
);

    if (error) {
      console.error('create_conversation_with_participants error:', error);
      return;
    }

    await fetchConversations('manual');

    if (newConvId) {
      setSelectedChatId(newConvId as string);
      setIsNewChatOpen(false);
      setShowChatOnMobile(true);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setShowChatOnMobile(true);

    // ✅ Optional UX: clear unread badge immediately (DB will catch up via mark_messages_as_read)
    setConversations((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unread_count: 0 } : c))
    );
  };

  const handleBackToList = () => {
    setShowChatOnMobile(false);
    setSelectedChatId(undefined);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    await fetchConversations('manual');

    if (selectedChatId === conversationId) {
      setSelectedChatId(undefined);
      setShowChatOnMobile(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-[25px] pt-4 sm:pt-6 md:pt-[30px] px-4 sm:px-6 md:px-[25px]">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-gray-400">Loading messages...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-[25px] pt-4 sm:pt-6 md:pt-[30px] px-4 sm:px-6 md:px-[25px]">
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 ${
          showChatOnMobile && selectedChatId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="flex items-center gap-3">
          {showChatOnMobile && selectedChatId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToList}
              className="md:hidden text-gray-700 hover:bg-gray-100 -ml-2"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          )}
          <div className="space-y-1 sm:space-y-2">
            <h1
              className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black"
              style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
            >
              Messages
            </h1>
            <p className="text-sm sm:text-base font-normal leading-[1.48em] tracking-[-0.04em] text-black">
              Chat with people, connect and communicate
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsNewChatOpen(true)}
          className="bg-[#2D3A1F] hover:bg-[#2D3A1F]/90 text-white rounded-full px-4 md:px-6 py-2 h-10 md:h-11 shadow-md transition-smooth interactive-scale focus-ring flex items-center gap-2 font-medium self-start sm:self-auto"
        >
          <MessageSquarePlus className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">New Message</span>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-240px)] min-h-[600px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-1 overflow-hidden min-h-0 h-full">
          <div
            className={`${
              showChatOnMobile && selectedChatId ? 'hidden md:flex' : 'flex'
            } w-full md:w-[380px] lg:w-[420px] shrink-0 border-r border-gray-200 overflow-hidden`}
          >
            <ChatSidebar
              conversations={conversations}
              selectedId={selectedChatId}
              onSelect={handleSelectChat}
              userId={userId}
              currentUser={user}
              onNewChat={handleNewChat}
              isNewChatOpen={isNewChatOpen}
              setIsNewChatOpen={setIsNewChatOpen}
              onDeleteConversation={handleDeleteConversation}
            />
          </div>

          <div
            className={`${
              !showChatOnMobile && !selectedChatId ? 'hidden md:flex' : 'flex'
            } flex-1 flex-col bg-gray-50 min-w-0 overflow-hidden`}
          >
            {selectedChatId ? (
              <ChatWindow
                conversationId={selectedChatId}
                currentUser={user}
                userId={userId}
                onBack={handleBackToList}
                onMessagesRead={handleMessagesRead}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white hidden md:flex relative">
                <div className="flex flex-col items-center">
                  <div className="w-40 h-40 bg-gray-100 rounded-full flex items-center justify-center mb-8">
                    <MessageSquarePlus className="w-20 h-20 text-gray-400" />
                  </div>
                  <h3 className="text-3xl font-semibold text-gray-900 mb-3">Messages</h3>
                  <p className="text-gray-500 max-w-sm text-center mb-8 text-base">
                    Click on a contact to view messages.
                  </p>
                  <Button
                    onClick={() => setIsNewChatOpen(true)}
                    className="bg-[#2D3A1F] hover:bg-[#2D3A1F]/90 text-white rounded-full px-6 py-2.5 h-11 shadow-md transition-smooth interactive-scale focus-ring flex items-center gap-2 font-medium"
                  >
                    <MessageSquarePlus className="w-5 h-5" />
                    <span>New Message</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}