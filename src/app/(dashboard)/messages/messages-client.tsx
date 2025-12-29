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
    
    // Use useMemo to ensure client is only created once per component instance
    const supabase = useMemo(() => {
        return createClient();
    }, []);

    // Refs for safe state management
    const inFlightRef = useRef<Promise<void> | null>(null);
    const reqIdRef = useRef(0);
    const fallbackInFlightRef = useRef(false);
    const mountedRef = useRef(true);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
    const channelRef = useRef<any>(null);

    // Debug: Log conversations when they change
    useEffect(() => {
        console.log('Conversations state updated:', conversations.length, conversations);
    }, [conversations]);

    // Note: Online status is now tracked globally via DashboardShell
    // No need to track it here anymore

    // Safe state update helper
    const safeSetState = useCallback(<T,>(setter: (value: T) => void, value: T) => {
        if (mountedRef.current) {
            setter(value);
        }
    }, []);

    // Safe fallback fetch - prevents double calls
    const safeFallbackFetch = useCallback(async (userId: string, requestId: number) => {
        if (fallbackInFlightRef.current) {
            console.log(`[req:${requestId}] Fallback already in flight, skipping`);
            return;
        }

        fallbackInFlightRef.current = true;
        console.log(`[req:${requestId}] Using fallback method to fetch conversations`);

        try {

            const { data: myParticipations, error: partError } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', userId);

            if (partError) {
                console.error('Error fetching participations:', partError);
                safeSetState(setConversations, []);
                return;
            }

            if (!myParticipations?.length) {
                console.log('No participations found');
                safeSetState(setConversations, []);
                return;
            }

            const conversationIds = myParticipations.map((p: { conversation_id: string }) => p.conversation_id);
            console.log('Found conversation IDs:', conversationIds.length);

            const { data: convs, error: convsError } = await supabase
                .from('conversations')
                .select('*')
                .in('id', conversationIds)
                .order('last_message_at', { ascending: false });

            if (convsError) {
                console.error('Error fetching conversations:', convsError);
                safeSetState(setConversations, []);
                return;
            }

            if (!convs || convs.length === 0) {
                console.log('No conversations found');
                safeSetState(setConversations, []);
                return;
            }

            console.log('Processing', convs.length, 'conversations with participants and unread counts');
            
            const convsWithParticipants = await Promise.all(
                convs.map(async (conv: any) => {
                    const { data: parts, error: partsErr } = await supabase
                        .from('conversation_participants')
                        .select('user_id, joined_at, last_read_at')
                        .eq('conversation_id', conv.id);

                    if (partsErr) {
                        console.error('Error fetching participants for conv', conv.id, partsErr);
                        return { ...conv, participants: [], unread_count: 0 };
                    }

                    const participantsWithProfiles = await Promise.all(
                        (parts || []).map(async (part: { user_id: string; joined_at: string; last_read_at: string | null }) => {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', part.user_id)
                                .single();

                            return {
                                conversation_id: conv.id,
                                user_id: part.user_id,
                                joined_at: part.joined_at,
                                last_read_at: part.last_read_at,
                                user: profile
                            };
                        })
                    );

                    // Get unread count for this conversation
                    const { data: unreadCount } = await supabase.rpc('get_unread_count', {
                        p_conversation_id: conv.id,
                        p_user_id: userId
                    } as any);

                    return {
                        ...conv,
                        participants: participantsWithProfiles,
                        unread_count: unreadCount || 0
                    };
                })
            );

            console.log(`[req:${requestId}] Fallback completed, setting`, convsWithParticipants.length, 'conversations');
            // Only update if this is still the latest request
            if (mountedRef.current && reqIdRef.current === requestId) {
                safeSetState(setConversations, convsWithParticipants as any);
            }
        } catch (fallbackError) {
            console.error(`[req:${requestId}] Error in fallback method:`, fallbackError);
            if (mountedRef.current && reqIdRef.current === requestId) {
                safeSetState(setConversations, []);
            }
        } finally {
            fallbackInFlightRef.current = false;
        }
    }, [supabase, safeSetState]);

    // Unified safe fetch function with single-flight and request ID guard
    const safeFetchConversations = useCallback(async (
        userId: string,
        source: 'initial' | 'realtime' | 'manual' = 'manual'
    ) => {
        // Single-flight guard: skip if already in flight
        if (inFlightRef.current) {
            console.log(`[${source}] Skipped: in-flight`);
            return;
        }

        // Increment request ID for this fetch
        reqIdRef.current += 1;
        const requestId = reqIdRef.current;
        console.log(`[req:${requestId}][${source}] Starting fetch for user:`, userId);

        // Create the fetch promise - store in local variable for identity check
        const startTime = performance.now();
        let timeoutId: NodeJS.Timeout | null = null;
        let fallbackUsed = false;

        // Create promise - use closure variable to capture identity
        let fetchPromiseRef: Promise<void> | null = null;
        const currentFetch = (async () => {
            // Set loading only if this is still the latest request
            if (mountedRef.current && reqIdRef.current === requestId) {
                safeSetState(setLoading, true);
            }

            try {
                // Try optimized function first with timeout and pagination
                const rpcPromise = supabase.rpc('get_user_conversations', {
                    p_user_id: userId,
                    p_limit: 50,
                    p_offset: 0
                } as any);

                // Create cancellable timeout
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new Error('RPC timeout after 10 seconds'));
                    }, 10000);
                });

                let convs, error;
                try {
                    const result = await Promise.race([rpcPromise, timeoutPromise]);
                    // Cancel timeout if RPC resolved
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    ({ data: convs, error } = result as any);
                    const endTime = performance.now();
                    const duration = ((endTime - startTime) / 1000).toFixed(2);
                    console.log(`[req:${requestId}][${source}] RPC completed in ${duration}s`);
                } catch (timeoutError) {
                    // Cancel timeout if it was set
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    const endTime = performance.now();
                    const duration = ((endTime - startTime) / 1000).toFixed(2);
                    console.warn(`[req:${requestId}][${source}] RPC timed out after ${duration}s, using fallback`);
                    fallbackUsed = true;
                    await safeFallbackFetch(userId, requestId);
                    return;
                }

                // Check if this is still the latest request before processing
                if (reqIdRef.current !== requestId) {
                    console.log(`[req:${requestId}][${source}] Stale request, ignoring results`);
                    return;
                }

                console.log(`[req:${requestId}][${source}] RPC response:`, { convsLength: convs?.length });

                if (error) {
                    console.warn(`[req:${requestId}][${source}] RPC error, falling back:`, error);
                    fallbackUsed = true;
                    await safeFallbackFetch(userId, requestId);
                    return;
                }
                
                // If RPC returns null or undefined, also fallback
                if (convs === null || convs === undefined) {
                    console.warn(`[req:${requestId}][${source}] RPC returned null/undefined, falling back`);
                    fallbackUsed = true;
                    await safeFallbackFetch(userId, requestId);
                    return;
                }

                // Handle both empty array and null/undefined
                if (convs) {
                    if (convs.length > 0) {
                        try {
                            // Transform the data to match the expected format
                            const transformedConvs = convs.map((conv: any) => {
                                // JSONB from PostgreSQL is already parsed, but check if it's a string
                                let participants = conv.participants;
                                if (typeof participants === 'string') {
                                    try {
                                        participants = JSON.parse(participants);
                                    } catch (e) {
                                        console.warn(`[req:${requestId}] Failed to parse participants JSON:`, e);
                                        participants = [];
                                    }
                                }
                                
                                // Ensure participants is an array
                                if (!Array.isArray(participants)) {
                                    console.warn(`[req:${requestId}] Participants is not an array:`, participants);
                                    participants = [];
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
                                };
                            });
                            
                            // Only update state if this is still the latest request
                            if (mountedRef.current && reqIdRef.current === requestId) {
                                console.log(`[req:${requestId}][${source}] Setting ${transformedConvs.length} conversations${fallbackUsed ? ' (via fallback)' : ''}`);
                                safeSetState(setConversations, transformedConvs as any);
                            }
                        } catch (transformError) {
                            console.error(`[req:${requestId}][${source}] Error transforming data:`, transformError);
                            fallbackUsed = true;
                            await safeFallbackFetch(userId, requestId);
                            return;
                        }
                    } else {
                        // Empty array - no conversations
                        if (mountedRef.current && reqIdRef.current === requestId) {
                            console.log(`[req:${requestId}][${source}] No conversations found`);
                            safeSetState(setConversations, []);
                        }
                    }
                } else {
                    // Null/undefined response
                    if (mountedRef.current && reqIdRef.current === requestId) {
                        console.log(`[req:${requestId}][${source}] Null/undefined conversations response`);
                        safeSetState(setConversations, []);
                    }
                }
            } catch (error) {
                console.error(`[req:${requestId}][${source}] Error in fetch:`, error);
                if (mountedRef.current && reqIdRef.current === requestId) {
                    await safeFallbackFetch(userId, requestId);
                }
            } finally {
                // Clean up timeout if still set
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                
                // Only clear loading if this is still the latest request
                if (mountedRef.current && reqIdRef.current === requestId) {
                    safeSetState(setLoading, false);
                }
                
                // Clear in-flight ref using promise identity (always release lock, regardless of request ID)
                // Use closure variable to check identity
                if (inFlightRef.current === fetchPromiseRef) {
                    inFlightRef.current = null;
                }
                
                const endTime = performance.now();
                const duration = ((endTime - startTime) / 1000).toFixed(2);
                console.log(`[req:${requestId}][${source}] Fetch completed in ${duration}s${fallbackUsed ? ' (fallback used)' : ''}`);
            }
        })();

        // Store promise reference for identity check
        fetchPromiseRef = currentFetch;
        
        // Store the promise for single-flight guard
        inFlightRef.current = currentFetch;
        
        return currentFetch;
    }, [supabase, safeFallbackFetch, safeSetState]);

    // Debounced refetch scheduler - prevents fetch storms from realtime
    const scheduleRefetch = useCallback((userId: string) => {
        // Don't schedule if already loading or in-flight
        if (inFlightRef.current !== null) {
            console.log('[realtime] Skipped: fetch in-flight');
            return;
        }
        
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = setTimeout(() => {
            // Double-check before executing
            if (mountedRef.current && inFlightRef.current === null) {
                safeFetchConversations(userId, 'realtime');
            }
        }, 500);
    }, [safeFetchConversations]);

    const subscribeToConversations = useCallback((userId: string) => {
        // Clean up existing channel if any
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        const channel = supabase.channel(`conversations_list_${userId}`)
            // Listen for conversation updates (new messages, etc.)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'conversations'
            }, () => {
                scheduleRefetch(userId);
            })
            // Listen for new messages to update unread counts
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'messages'
            }, () => {
                scheduleRefetch(userId);
            })
            // Listen for message read status updates
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'messages',
            }, () => {
                scheduleRefetch(userId);
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        }
    }, [supabase, scheduleRefetch]);

    // Fetch user object for child components
    useEffect(() => {
        if (!userId) return;

        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
            if (authUser) {
                setUser(authUser);
            }
        });
    }, [userId, supabase]);

    // Initialize conversations from server props and set up realtime subscriptions
    useEffect(() => {
        if (!userId) {
            return;
        }

        // Reset refs on mount
        mountedRef.current = true;
        inFlightRef.current = null;
        fallbackInFlightRef.current = false;
        reqIdRef.current = 0;

        // Initialize conversations from server-fetched data
        if (initialConversations.length > 0) {
            setConversations(initialConversations);
        }
        
        // Set up realtime subscriptions for live updates
        const unsubscribe = subscribeToConversations(userId);
        
        return () => {
            mountedRef.current = false;
            
            // Cancel any in-flight fetch
            inFlightRef.current = null;
            fallbackInFlightRef.current = false;
            
            // Clear timers
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
                timeoutIdRef.current = null;
            }
            
            // Unsubscribe from realtime
            if (unsubscribe) unsubscribe();
        };
    }, [userId, initialConversations, subscribeToConversations]);
    
    // Callback to refresh unread counts after marking messages as read
    const handleMessagesRead = useCallback(() => {
        if (userId) {
            scheduleRefetch(userId);
        }
    }, [userId, scheduleRefetch]);

    const handleNewChat = async (targetUserId: string) => {
        if (!userId) {
            console.error('Cannot create chat: userId not available');
            return;
        }

        console.log('handleNewChat called with user:', targetUserId);

        const existing = conversations.find(c =>
            c.participants?.some(p => p.user_id === targetUserId) && !c.is_group
        );

        if (existing) {
            console.log('Found existing conversation:', existing.id);
            setSelectedChatId(existing.id);
            setIsNewChatOpen(false);
            setShowChatOnMobile(true);
            return;
        }

        console.log('Creating new conversation...');
        const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({ is_group: false } as any)
            .select()
            .single();

        if (convError) {
            console.error('Error creating conversation:', convError);
            return;
        }

        console.log('Conversation created:', (newConv as any)?.id);

        if (newConv) {
            const { error: partError } = await supabase.from('conversation_participants').insert([
                { conversation_id: (newConv as any).id, user_id: userId },
                { conversation_id: (newConv as any).id, user_id: targetUserId }
            ] as any);

            if (partError) {
                console.error('Error adding participants:', partError);
                return;
            }

            console.log('Participants added, fetching conversations...');
            await safeFetchConversations(userId, 'manual');
            if (mountedRef.current) {
                setSelectedChatId((newConv as any)?.id);
            }
            setIsNewChatOpen(false);
            setShowChatOnMobile(true);
        }
    };

    const handleSelectChat = (chatId: string) => {
        setSelectedChatId(chatId);
        setShowChatOnMobile(true);
    };

    const handleBackToList = () => {
        setShowChatOnMobile(false);
        setSelectedChatId(undefined);
    };

    const handleDeleteConversation = async (conversationId: string) => {
        if (!userId) {
            console.error('Cannot delete conversation: userId not available');
            return;
        }

        // Refresh conversations list
        await safeFetchConversations(userId, 'manual');
        
        // If deleted conversation was selected, go back to list
        if (mountedRef.current && selectedChatId === conversationId) {
            setSelectedChatId(undefined);
            setShowChatOnMobile(false);
        }
    };

    if (loading) return (
        <div className="space-y-4 sm:space-y-6 md:space-y-[25px] pt-4 sm:pt-6 md:pt-[30px] px-4 sm:px-6 md:px-[25px]">
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-gray-400">Loading messages...</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4 sm:space-y-6 md:space-y-[25px] pt-4 sm:pt-6 md:pt-[30px] px-4 sm:px-6 md:px-[25px]">
            {/* Header Section - Matches other pages */}
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 ${showChatOnMobile && selectedChatId ? 'hidden md:flex' : 'flex'}`}>
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
                        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-normal leading-[1.3em] text-black" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>
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

            {/* Main Chat Container - WhatsApp Style */}
            <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-240px)] min-h-[600px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-1 overflow-hidden min-h-0 h-full">
                {/* Sidebar - Hidden on mobile when chat is selected */}
                <div className={`${showChatOnMobile && selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] lg:w-[420px] shrink-0 border-r border-gray-200 overflow-hidden`}>
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

                {/* Chat Window - Hidden on mobile when no chat selected */}
                <div className={`${!showChatOnMobile && !selectedChatId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-gray-50 min-w-0 overflow-hidden`}>
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
