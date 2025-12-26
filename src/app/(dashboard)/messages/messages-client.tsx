'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChatSidebar } from '@/components/chat/sidebar';
import { ChatWindow } from '@/components/chat/chat-window';
import { Conversation } from '@/types/chat';
import { MessageSquarePlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessagesClientProps {
    user: any;
}

export function MessagesClient({ user }: MessagesClientProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
    const [loading, setLoading] = useState(true);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [showChatOnMobile, setShowChatOnMobile] = useState(false);
    const supabase = createClient();

    // Debug: Log conversations when they change
    useEffect(() => {
        console.log('Conversations state updated:', conversations.length, conversations);
    }, [conversations]);

    // Note: Online status is now tracked globally via DashboardShell
    // No need to track it here anymore

    useEffect(() => {
        if (user) {
            setLoading(true);
            // Add timeout to prevent infinite loading - if RPC hangs, use fallback
            const timeoutId = setTimeout(() => {
                console.warn('Conversations fetch timeout - using fallback method');
                fetchConversationsFallback(user);
            }, 5000); // 5 second timeout - faster fallback
            
            fetchConversations(user).finally(() => {
                clearTimeout(timeoutId);
            });
            
            const unsubscribe = subscribeToConversations(user.id);
            return () => {
                clearTimeout(timeoutId);
                if (unsubscribe) unsubscribe();
            };
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchConversations = async (user: any) => {
        try {
            console.log('Fetching conversations with optimized function for user:', user.id);
            // Try optimized function first with timeout
            const rpcPromise = supabase.rpc('get_user_conversations', {
                p_user_id: user.id
            });
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('RPC timeout after 4 seconds')), 4000)
            );
            
            let convs, error;
            try {
                const result = await Promise.race([rpcPromise, timeoutPromise]);
                ({ data: convs, error } = result as any);
            } catch (timeoutError) {
                console.warn('RPC call timed out, using fallback:', timeoutError);
                await fetchConversationsFallback(user);
                return;
            }

            console.log('RPC response:', { convs, error, convsLength: convs?.length, convsType: typeof convs });

            if (error) {
                console.warn('Optimized function error, falling back:', error);
                // Fallback to original method if function doesn't exist or has error
                await fetchConversationsFallback(user);
                return;
            }
            
            // If RPC returns null or undefined, also fallback
            if (convs === null || convs === undefined) {
                console.warn('RPC returned null/undefined, falling back');
                await fetchConversationsFallback(user);
                return;
            }

            // Handle both empty array and null/undefined
            if (convs) {
                console.log('Raw conversations from RPC:', convs);
                console.log('Number of conversations:', convs.length);
                
                if (convs.length > 0) {
                    try {
                        // Transform the data to match the expected format
                        const transformedConvs = convs.map((conv: any) => {
                            console.log('Processing conversation:', conv.id, 'participants type:', typeof conv.participants, 'participants:', conv.participants);
                            
                            // JSONB from PostgreSQL is already parsed, but check if it's a string
                            let participants = conv.participants;
                            if (typeof participants === 'string') {
                                try {
                                    participants = JSON.parse(participants);
                                } catch (e) {
                                    console.warn('Failed to parse participants JSON:', e);
                                    participants = [];
                                }
                            }
                            
                            // Ensure participants is an array
                            if (!Array.isArray(participants)) {
                                console.warn('Participants is not an array:', participants);
                                participants = [];
                            }
                            
                            console.log('Transformed participants for conv', conv.id, ':', participants.length);
                            
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
                        console.log('Transformed conversations:', transformedConvs.length);
                        console.log('Sample transformed conv:', transformedConvs[0]);
                        setConversations(transformedConvs as any);
                    } catch (transformError) {
                        console.error('Error transforming conversations data:', transformError);
                        // Fallback if transformation fails
                        await fetchConversationsFallback(user);
                        return;
                    }
                } else {
                    // Empty array - no conversations
                    console.log('No conversations found');
                    setConversations([]);
                }
            } else {
                // Null/undefined response
                console.log('Null/undefined conversations response');
                setConversations([]);
            }
        } catch (error) {
            console.error('Error in fetchConversations:', error);
            // Fallback to original method on any error
            await fetchConversationsFallback(user);
            return;
        } finally {
            // Set loading to false - fallback will also set it, but that's fine (idempotent)
            setLoading(false);
        }
    };

    // Fallback method using original query approach
    const fetchConversationsFallback = async (user: any) => {
        try {
            console.log('Using fallback method to fetch conversations');

            const { data: myParticipations, error: partError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id);

            if (partError) {
                console.error('Error fetching participations:', partError);
                setConversations([]);
                setLoading(false);
                return;
            }

            if (!myParticipations?.length) {
                console.log('No participations found');
                setConversations([]);
                setLoading(false);
                return;
            }

            const conversationIds = myParticipations.map(p => p.conversation_id);
            console.log('Found conversation IDs:', conversationIds.length);

            const { data: convs, error: convsError } = await supabase
                .from('conversations')
                .select('*')
                .in('id', conversationIds)
                .order('last_message_at', { ascending: false });

            if (convsError) {
                console.error('Error fetching conversations:', convsError);
                setConversations([]);
                setLoading(false);
                return;
            }

            if (!convs || convs.length === 0) {
                console.log('No conversations found');
                setConversations([]);
                setLoading(false);
                return;
            }

            console.log('Processing', convs.length, 'conversations with participants and unread counts');
            
            const convsWithParticipants = await Promise.all(
                convs.map(async (conv) => {
                    const { data: parts, error: partsErr } = await supabase
                        .from('conversation_participants')
                        .select('user_id, joined_at, last_read_at')
                        .eq('conversation_id', conv.id);

                    if (partsErr) {
                        console.error('Error fetching participants for conv', conv.id, partsErr);
                        return { ...conv, participants: [], unread_count: 0 };
                    }

                    const participantsWithProfiles = await Promise.all(
                        (parts || []).map(async (part) => {
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
                        p_user_id: user.id
                    });

                    return {
                        ...conv,
                        participants: participantsWithProfiles,
                        unread_count: unreadCount || 0
                    };
                })
            );

            console.log('Fallback completed, setting', convsWithParticipants.length, 'conversations');
            setConversations(convsWithParticipants as any);
        } catch (fallbackError) {
            console.error('Error in fallback method:', fallbackError);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToConversations = (userId: string) => {
        const channel = supabase.channel('conversations_list')
            // Listen for conversation updates (new messages, etc.)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'conversations'
            }, () => {
                fetchConversations({ id: userId });
            })
            // Listen for new messages to update unread counts
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'messages'
            }, () => {
                fetchConversations({ id: userId });
            })
            // Listen for message read status updates
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'messages',
            }, () => {
                fetchConversations({ id: userId });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    };
    
    // Callback to refresh unread counts after marking messages as read
    const handleMessagesRead = useCallback(() => {
        if (user) {
            fetchConversations(user);
        }
    }, [user]);

    const handleNewChat = async (targetUserId: string) => {
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
            .insert({ is_group: false })
            .select()
            .single();

        if (convError) {
            console.error('Error creating conversation:', convError);
            return;
        }

        console.log('Conversation created:', newConv.id);

        if (newConv) {
            const { error: partError } = await supabase.from('conversation_participants').insert([
                { conversation_id: newConv.id, user_id: user.id },
                { conversation_id: newConv.id, user_id: targetUserId }
            ]);

            if (partError) {
                console.error('Error adding participants:', partError);
                return;
            }

            console.log('Participants added, fetching conversations...');
            await fetchConversations(user);
            setSelectedChatId(newConv.id);
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
        // Refresh conversations list
        await fetchConversations(user);
        
        // If deleted conversation was selected, go back to list
        if (selectedChatId === conversationId) {
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
