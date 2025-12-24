'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Conversation, Message, ChatUser } from '@/types/chat';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format, isSameDay } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

interface ChatWindowProps {
    conversationId: string;
    currentUser: any;
    onBack?: () => void;
}

export function ChatWindow({ conversationId, currentUser, onBack }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationId) {
            loadChatData();
            const unsubscribe = subscribeToMessages();
            return () => {
                if (unsubscribe) unsubscribe();
            };
        }
    }, [conversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    const loadChatData = async () => {
        setLoading(true);

        const { data: conv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .single();

        if (conv) {
            setConversation(conv);
        }

        const { data: parts } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId);

        if (parts) {
            const profiles = await Promise.all(
                parts.map(async (part) => {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', part.user_id)
                        .single();
                    return profile;
                })
            );
            setParticipants(profiles.filter(p => p) as ChatUser[]);
        }

        const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        if (msgs) {
            const messagesWithSenders = await Promise.all(
                msgs.map(async (msg) => {
                    if (msg.sender_id) {
                        const { data: sender } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', msg.sender_id)
                            .single();
                        return { ...msg, sender };
                    }
                    return msg;
                })
            );
            setMessages(messagesWithSenders as Message[]);
        }

        // Mark all messages in this conversation as read
        const { error: readError } = await supabase.rpc('mark_messages_as_read', {
            p_conversation_id: conversationId,
            p_user_id: currentUser.id
        });

        if (!readError) {
            // Trigger a conversation list refresh to update unread counts
            // This works via the real-time subscription
        }

        setLoading(false);
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                async (payload) => {
                    const { data: newMsg } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('id', payload.new.id)
                        .single();

                    if (newMsg) {
                        const { data: sender } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', newMsg.sender_id)
                            .single();

                        const messageWithSender = { ...newMsg, sender };

                        setMessages(prev => {
                            if (prev.find(m => m.id === messageWithSender.id)) {
                                return prev;
                            }
                            return [...prev, messageWithSender as Message];
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleSendMessage = async (content: string, type: 'text' | 'image' | 'audio', mediaUrl?: string) => {
        const { error } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: currentUser.id,
            content,
            type,
            media_url: mediaUrl
        });

        if (error) {
            console.error('Error sending message:', error);
        }
    };

    const otherUser = participants.find(p => p.id !== currentUser?.id);
    const displayName = otherUser
        ? (otherUser.first_name ? `${otherUser.first_name} ${otherUser.last_name || ''}`.trim() : otherUser.email)
        : 'Chat';

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="text-gray-400">Loading conversation...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header - FIXED at top */}
            <div className="h-16 md:h-20 px-4 md:px-8 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    {onBack && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="md:hidden text-gray-700 hover:bg-gray-100 shrink-0 -ml-2"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    )}
                    <div className="relative shrink-0">
                        <Avatar className="h-10 w-10 md:h-12 md:w-12 border border-gray-100">
                            <AvatarImage src={otherUser?.avatar_url} />
                            <AvatarFallback className="bg-orange-100 text-orange-600 font-medium text-sm">
                                {otherUser?.first_name?.[0] || otherUser?.email?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#6B7C4F] border-2 border-white rounded-full"></span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base md:text-lg text-gray-900 truncate">{displayName}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-[#6B7C4F] rounded-full" />
                            Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline px-3 py-1 bg-[#F9F3EA] text-[#CE8548] text-xs font-semibold uppercase rounded-md">
                        {otherUser?.role || 'User'}
                    </span>
                </div>
            </div>

            {/* Messages Area - SCROLLABLE, takes remaining space */}
            <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(0,0,0,0.02) 35px, rgba(0,0,0,0.02) 36px)'
            }}>
                <div className="px-4 md:px-8 py-6">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400 py-20">
                            <div className="text-center">
                                <p className="text-sm">No messages yet</p>
                                <p className="text-xs mt-1">Send a message to start the conversation</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => {
                                const showDate = index === 0 || !isSameDay(
                                    new Date(msg.created_at),
                                    new Date(messages[index - 1].created_at)
                                );
                                return (
                                    <div key={msg.id}>
                                        {showDate && (
                                            <div className="flex justify-center mb-6 mt-4">
                                                <span className="px-4 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full shadow-sm">
                                                    {format(new Date(msg.created_at), 'd MMMM yyyy')}
                                                </span>
                                            </div>
                                        )}
                                        <MessageBubble
                                            message={msg}
                                            isOwn={msg.sender_id === currentUser?.id}
                                            sender={msg.sender}
                                        />
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} className="h-4" />
                        </>
                    )}
                </div>
            </div>

            {/* Input - FIXED at bottom */}
            <div className="shrink-0 bg-white border-t border-gray-200">
                <MessageInput onSend={handleSendMessage} />
            </div>
        </div>
    );
}
