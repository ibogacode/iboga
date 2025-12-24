'use client';

import { useState, useEffect } from 'react';
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

    useEffect(() => {
        if (user) {
            fetchConversations(user);
            subscribeToConversations(user.id);
        }
    }, [user]);

    const fetchConversations = async (user: any) => {
        console.log('Fetching conversations for user:', user.id);

        const { data: myParticipations, error: partError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id);

        if (partError) {
            console.error('Error fetching participations:', partError);
            setLoading(false);
            return;
        }

        console.log('Found participations:', myParticipations?.length);

        if (!myParticipations?.length) {
            setLoading(false);
            return;
        }

        const conversationIds = myParticipations.map(p => p.conversation_id);

        const { data: convs, error: convsError } = await supabase
            .from('conversations')
            .select('*')
            .in('id', conversationIds)
            .order('last_message_at', { ascending: false });

        if (convsError) {
            console.error('Error fetching conversations:', convsError);
            setLoading(false);
            return;
        }

        console.log('Fetched conversations:', convs?.length);

        if (convs) {
            const convsWithParticipants = await Promise.all(
                convs.map(async (conv) => {
                    const { data: parts, error: partsErr } = await supabase
                        .from('conversation_participants')
                        .select('user_id, joined_at, last_read_at')
                        .eq('conversation_id', conv.id);

                    if (partsErr) {
                        console.error('Error fetching participants for conv', conv.id, partsErr);
                        return { ...conv, participants: [] };
                    }

                    const participantsWithProfiles = await Promise.all(
                        (parts || []).map(async (part) => {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', part.user_id)
                                .single();

                            return {
                                ...part,
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

            console.log('Conversations with participants:', convsWithParticipants);
            console.log('Sample conversation:', convsWithParticipants[0]);
            setConversations(convsWithParticipants as any);
        }
        setLoading(false);
    };

    const subscribeToConversations = (userId: string) => {
        const channel = supabase.channel('conversations_list')
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'conversations'
            }, () => {
                fetchConversations({ id: userId });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    };

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

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50">Loading messages...</div>;

    return (
        <div className="flex flex-col h-screen max-w-[1600px] mx-auto bg-gray-50">
            {/* Desktop/Tablet Header - Hidden on mobile when chat is open */}
            <div className={`bg-[#6B7C4F] px-4 md:px-8 py-4 shrink-0 ${showChatOnMobile && selectedChatId ? 'hidden md:block' : 'block'}`}>
                <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-3">
                        {showChatOnMobile && selectedChatId && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleBackToList}
                                className="md:hidden text-white hover:bg-white/10 -ml-2"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </Button>
                        )}
                        <h1 className="text-2xl md:text-3xl font-semibold text-white">Messages</h1>
                    </div>
                    <Button
                        onClick={() => setIsNewChatOpen(true)}
                        className="bg-white hover:bg-gray-100 text-[#6B7C4F] rounded-full px-4 md:px-6 py-2 h-10 md:h-11 shadow-md transition-all flex items-center gap-2 font-medium"
                    >
                        <MessageSquarePlus className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="hidden sm:inline">New Message</span>
                    </Button>
                </div>
            </div>

            {/* Main Chat Container - WhatsApp Style */}
            <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Sidebar - Hidden on mobile when chat is selected */}
                <div className={`${showChatOnMobile && selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] lg:w-[420px] shrink-0 bg-white border-r border-gray-200`}>
                    <ChatSidebar
                        conversations={conversations}
                        selectedId={selectedChatId}
                        onSelect={handleSelectChat}
                        currentUser={user}
                        onNewChat={handleNewChat}
                        isNewChatOpen={isNewChatOpen}
                        setIsNewChatOpen={setIsNewChatOpen}
                    />
                </div>

                {/* Chat Window - Hidden on mobile when no chat selected */}
                <div className={`${!showChatOnMobile && !selectedChatId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-gray-50 min-w-0`}>
                    {selectedChatId ? (
                        <ChatWindow
                            conversationId={selectedChatId}
                            currentUser={user}
                            onBack={handleBackToList}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white hidden md:flex">
                            <div className="w-32 h-32 bg-[#6B7C4F]/10 rounded-full flex items-center justify-center mb-6">
                                <MessageSquarePlus className="w-16 h-16 text-[#6B7C4F]" />
                            </div>
                            <h3 className="text-2xl font-medium text-gray-900 mb-2">Your Messages</h3>
                            <p className="text-gray-500 max-w-sm text-center">Select a conversation from the sidebar or start a new one to begin messaging.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
