'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Conversation, Message, ChatUser, MessageType } from '@/types/chat';
import type { Database } from '@/types/supabase';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface ChatWindowProps {
    conversationId: string;
    currentUser: any;
    userId?: string;
    onBack?: () => void;
    onMessagesRead?: () => void;
}

interface OtherUserStatus {
    is_online: boolean;
    last_seen_at: string | null;
}

type MessageRow = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export function ChatWindow({
    conversationId,
    currentUser,
    userId,
    onBack,
    onMessagesRead,
}: ChatWindowProps) {
    const effectiveUserId = userId || currentUser?.id;

    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [otherUserStatus, setOtherUserStatus] = useState<OtherUserStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [showDeleteConversationDialog, setShowDeleteConversationDialog] = useState(false);

    const supabase = createClient();
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // keep a stable sender lookup (avoids per-message profiles queries)
    const participantMapRef = useRef<Map<string, ChatUser>>(new Map());

    useEffect(() => {
        const map = new Map<string, ChatUser>();
        participants.forEach((p) => map.set(p.id, p));
        participantMapRef.current = map;
    }, [participants]);

    useEffect(() => {
        if (!conversationId || !effectiveUserId) return;

        loadChatData();

        const unsubscribeMessages = subscribeToMessages();
        return () => {
            if (unsubscribeMessages) unsubscribeMessages();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, effectiveUserId]);

    useEffect(() => {
        if (participants.length > 0) {
            const unsubscribeStatus = subscribeToOnlineStatus();
            return () => {
                if (unsubscribeStatus) unsubscribeStatus();
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [participants, conversationId, effectiveUserId]);

    useEffect(() => {
        scrollToBottom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    const scrollToBottom = (instant = false) => {
        setTimeout(() => {
            if (messagesContainerRef.current) {
                const container = messagesContainerRef.current;
                container.scrollTop = container.scrollHeight;
            } else if (scrollRef.current) {
                scrollRef.current.scrollIntoView({
                    behavior: instant ? 'auto' : 'smooth',
                    block: 'end',
                });
            }
        }, instant ? 0 : 150);
    };

    const subscribeToOnlineStatus = () => {
        const otherUser = participants.find((p) => p.id !== effectiveUserId);
        if (!otherUser) return;

        const channel = supabase
            .channel(`online_status:${otherUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${otherUser.id}`,
                },
                (payload) => {
                    setOtherUserStatus({
                        is_online: (payload.new as any).is_online,
                        last_seen_at: (payload.new as any).last_seen_at,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const loadChatData = async () => {
        setLoading(true);

        try {
            const { data: convList, error: convErr } = await supabase.rpc(
                'get_user_conversations',
                {
                    p_user_id: effectiveUserId,
                    p_limit: 200,
                    p_offset: 0,
                } as any
            );

            const convListArr = (convList ?? []) as any[];
            const currentConv = convListArr.find((c: any) => c.id === conversationId);



            if (convErr) {
                console.error('Error loading user conversations:', convErr);
                setLoading(false);
                return;
            }

            //   const currentConv = (convList || []).find((c: any) => c.id === conversationId);

            if (!currentConv) {
                console.warn('Conversation not found or not accessible for user:', {
                    conversationId,
                    effectiveUserId,
                });
                setLoading(false);
                return;
            }

            setConversation(currentConv);

            const mappedParticipants: ChatUser[] = (currentConv.participants || []).map((p: any) => ({
                id: p.user.id,
                email: p.user.email,
                first_name: p.user.first_name,
                last_name: p.user.last_name,
                name: p.user.first_name
                    ? `${p.user.first_name} ${p.user.last_name || ''}`.trim()
                    : p.user.email,
                role: p.user.role,
                avatar_url: p.user.avatar_url,
                is_online: p.user.is_online,
                last_seen_at: p.user.last_seen_at,
            }));

            setParticipants(mappedParticipants);

            const otherParticipant = mappedParticipants.find((p) => p.id !== effectiveUserId);
            if (otherParticipant) {
                setOtherUserStatus({
                    is_online: !!otherParticipant.is_online,
                    last_seen_at: otherParticipant.last_seen_at || null,
                });
            }

            // Mark messages read
            {
                const { error } = await supabase.rpc('mark_messages_as_read', {
                    p_conversation_id: conversationId,
                    p_user_id: effectiveUserId,
                });
                if (error) console.error('Error marking messages as read:', error);
            }

            // Load messages
            const { data: msgs, error: msgErr } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });

            if (msgErr) {
                console.error('Error loading messages:', msgErr);
                setMessages([]);
                setLoading(false);
                return;
            }

            const map = new Map<string, ChatUser>();
            mappedParticipants.forEach((p) => map.set(p.id, p));
            participantMapRef.current = map;

            const typed = (msgs || []) as MessageRow[];

            const messagesWithSenders: Message[] = await Promise.all(
                typed.map(async (msg): Promise<Message> => {
                    const base: Message = {
                        id: msg.id,
                        conversation_id: msg.conversation_id ?? conversationId,
                        sender_id: msg.sender_id ?? '',
                        content: msg.content ?? '',
                        type: (msg.type as MessageType) ?? 'text',
                        media_url: msg.media_url || undefined,
                        created_at: msg.created_at ?? new Date().toISOString(),
                        updated_at: msg.updated_at ?? new Date().toISOString(),
                        is_deleted: msg.is_deleted ?? false,
                        reply_to: msg.reply_to || undefined,
                        sender: msg.sender_id ? participantMapRef.current.get(msg.sender_id) : undefined,
                    };

                    if (msg.reply_to) {
                        const { data: repliedMsg } = await supabase
                            .from('messages')
                            .select('*')
                            .eq('id', msg.reply_to)
                            .single<MessageRow>();

                        if (repliedMsg && !repliedMsg.is_deleted) {
                            base.replied_message = {
                                id: repliedMsg.id,
                                conversation_id: repliedMsg.conversation_id,
                                sender_id: repliedMsg.sender_id,
                                content: repliedMsg.content,
                                type: repliedMsg.type as MessageType,
                                media_url: repliedMsg.media_url || undefined,
                                created_at: repliedMsg.created_at,
                                updated_at: repliedMsg.updated_at,
                                is_deleted: repliedMsg.is_deleted,
                                reply_to: repliedMsg.reply_to || undefined,
                                sender: participantMapRef.current.get(repliedMsg.sender_id),
                            };
                        }
                    }

                    return base;
                })
            );

            setMessages(messagesWithSenders);

            setTimeout(() => scrollToBottom(true), 200);
            setLoading(false);
        } catch (e) {
            console.error('Unexpected loadChatData error:', e);
            setLoading(false);
        }
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
                    filter: `conversation_id=eq.${conversationId}`,
                },
                async (payload) => {
                    const { data: newMsg, error } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('id', (payload.new as any).id)
                        .single<MessageRow>();

                    if (error || !newMsg) return;

                    const messageData: Message = {
                        id: newMsg.id,
                        conversation_id: newMsg.conversation_id,
                        sender_id: newMsg.sender_id,
                        content: newMsg.content,
                        type: newMsg.type as MessageType,
                        media_url: newMsg.media_url || undefined,
                        created_at: newMsg.created_at,
                        updated_at: newMsg.updated_at,
                        is_deleted: newMsg.is_deleted,
                        reply_to: newMsg.reply_to || undefined,
                        sender: participantMapRef.current.get(newMsg.sender_id),
                    };

                    if (newMsg.reply_to) {
                        const { data: repliedMsg } = await supabase
                            .from('messages')
                            .select('*')
                            .eq('id', newMsg.reply_to)
                            .single<MessageRow>();

                        if (repliedMsg && !repliedMsg.is_deleted) {
                            messageData.replied_message = {
                                id: repliedMsg.id,
                                conversation_id: repliedMsg.conversation_id,
                                sender_id: repliedMsg.sender_id,
                                content: repliedMsg.content,
                                type: repliedMsg.type as MessageType,
                                media_url: repliedMsg.media_url || undefined,
                                created_at: repliedMsg.created_at,
                                updated_at: repliedMsg.updated_at,
                                is_deleted: repliedMsg.is_deleted,
                                reply_to: repliedMsg.reply_to || undefined,
                                sender: participantMapRef.current.get(repliedMsg.sender_id),
                            };
                        }
                    }

                    setMessages((prev) => {
                        if (prev.find((m) => m.id === messageData.id)) return prev;
                        return [...prev, messageData];
                    });

                    if (newMsg.sender_id !== effectiveUserId) {
                        const { data: updatedCount } = await supabase.rpc('mark_messages_as_read', {
                            p_conversation_id: conversationId,
                            p_user_id: effectiveUserId,
                        });
                        if (updatedCount && updatedCount > 0) onMessagesRead?.();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === (payload.new as any).id
                                ? {
                                    ...msg,
                                    read_at: (payload.new as any).read_at,
                                    delivered_at: (payload.new as any).delivered_at,
                                }
                                : msg
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleSendMessage = async (
        content: string,
        type: 'text' | 'image' | 'audio',
        mediaUrl?: string,
        replyTo?: string
    ) => {
        // ✅ DEBUG: session (this must be BEFORE messageInsert)
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        console.log('session?', !!sessionData?.session, sessionData?.session?.user?.id, sessionErr);

        const messageInsert: MessageInsert = {
            conversation_id: conversationId,
            sender_id: effectiveUserId,
            content,
            type,
            media_url: mediaUrl || null,
            reply_to: replyTo || null,
        };

        const { error } = await supabase.from('messages').insert([messageInsert]);

        if (error) {
            console.error('Error sending message:', error);
        } else {
            setReplyingTo(null);
        }
    };

    const handleReply = (message: Message) => setReplyingTo(message);

    const handleJumpToMessage = (messageId: string) => {
        const el = messageRefs.current.get(messageId);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 2000);
    };

    const setMessageRef = (messageId: string, element: HTMLDivElement | null) => {
        if (element) messageRefs.current.set(messageId, element);
        else messageRefs.current.delete(messageId);
    };

    const handleDeleteMessage = async (messageId: string) => {
        const { error } = await supabase
            .from('messages')
            .update({ is_deleted: true } as any)
            .eq('id', messageId)
            .eq('sender_id', effectiveUserId);

        if (error) {
            console.error('Error deleting message:', error);
            alert('Failed to delete message');
        } else {
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
    };

    const handleDeleteConversation = async () => {
        const { error } = await supabase.rpc('delete_conversation', {
            p_conversation_id: conversationId,
        });

        if (error) {
            console.error('Error deleting conversation:', error);
            alert('Failed to delete conversation');
        } else {
            setShowDeleteConversationDialog(false);
            onBack?.();
        }
    };

    if (!effectiveUserId) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-400">Loading user...</div>
            </div>
        );
    }

    const otherUser = participants.find((p) => p.id !== effectiveUserId);
    const displayName = otherUser
        ? otherUser.first_name
            ? `${otherUser.first_name} ${otherUser.last_name || ''}`.trim()
            : otherUser.email
        : 'Chat';

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="text-gray-400">Loading conversation...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            {/* Header */}
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
                            <AvatarImage src={otherUser?.avatar_url || undefined} />
                            <AvatarFallback className="bg-orange-100 text-orange-600 font-medium text-sm">
                                {otherUser?.first_name?.[0] || otherUser?.email?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                        {otherUserStatus?.is_online && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#6B7C4F] border-2 border-white rounded-full" />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base md:text-lg text-gray-900 truncate">{displayName}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            {otherUserStatus?.is_online ? (
                                <>
                                    <span className="w-1.5 h-1.5 bg-[#6B7C4F] rounded-full" />
                                    <span className="text-[#6B7C4F] font-medium">Online</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    <span className="text-gray-500">
                                        {otherUserStatus?.last_seen_at
                                            ? `Last seen ${format(new Date(otherUserStatus.last_seen_at), 'MMM d, h:mm a')}`
                                            : 'Offline'}
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreVertical className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteConversationDialog(true)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Conversation
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto bg-gray-50 min-h-0"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(0,0,0,0.02) 35px, rgba(0,0,0,0.02) 36px)',
                }}
            >
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
                                const showDate =
                                    index === 0 ||
                                    !isSameDay(new Date(msg.created_at), new Date(messages[index - 1].created_at));
                                const isHighlighted = highlightedMessageId === msg.id;

                                return (
                                    <div
                                        key={msg.id}
                                        ref={(el) => setMessageRef(msg.id, el)}
                                        className={cn(
                                            'transition-all duration-500',
                                            isHighlighted && 'bg-yellow-100/50 rounded-lg p-2 -m-2'
                                        )}
                                    >
                                        {showDate && (
                                            <div className="flex items-center justify-center my-6">
                                                <div className="flex-1 h-px bg-gray-200" />
                                                <span className="px-4 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full shadow-sm border border-gray-100">
                                                    {format(new Date(msg.created_at), 'd MMMM yyyy')}
                                                </span>
                                                <div className="flex-1 h-px bg-gray-200" />
                                            </div>
                                        )}

                                        <MessageBubble
                                            message={msg}
                                            isOwn={msg.sender_id === effectiveUserId}
                                            sender={msg.sender}
                                            onDelete={handleDeleteMessage}
                                            onReply={handleReply}
                                            onJumpToMessage={handleJumpToMessage}
                                        />
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} className="h-4" />
                        </>
                    )}
                </div>
            </div>

            {/* Input */}
            <div className="shrink-0 bg-white border-t border-gray-200">
                <MessageInput
                    onSend={handleSendMessage}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                />
            </div>

            {/* Delete Conversation Dialog */}
            <Dialog open={showDeleteConversationDialog} onOpenChange={setShowDeleteConversationDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Conversation</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this conversation? This action cannot be undone and you will lose all
                            messages in this chat.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConversationDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConversation}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}