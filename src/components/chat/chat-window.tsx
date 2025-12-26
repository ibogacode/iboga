'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Conversation, Message, ChatUser } from '@/types/chat';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
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
    onBack?: () => void;
    onMessagesRead?: () => void;
}

interface OtherUserStatus {
    is_online: boolean;
    last_seen_at: string | null;
}

export function ChatWindow({ conversationId, currentUser, onBack, onMessagesRead }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [otherUserStatus, setOtherUserStatus] = useState<OtherUserStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const supabase = createClient();
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationId) {
            loadChatData();
            const unsubscribeMessages = subscribeToMessages();
            const unsubscribeStatus = subscribeToOnlineStatus();
            return () => {
                if (unsubscribeMessages) unsubscribeMessages();
                if (unsubscribeStatus) unsubscribeStatus();
            };
        }
    }, [conversationId]);

    useEffect(() => {
        // Scroll to bottom when messages change
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Scroll to bottom when conversation loads
        if (!loading && messages.length > 0) {
            scrollToBottom();
        }
    }, [loading, conversationId]);
    
    // Subscribe to other user's online status changes
    const subscribeToOnlineStatus = () => {
        const otherUser = participants.find(p => p.id !== currentUser?.id);
        if (!otherUser) return;
        
        const channel = supabase
            .channel(`online_status:${otherUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${otherUser.id}`
                },
                (payload) => {
                    setOtherUserStatus({
                        is_online: payload.new.is_online,
                        last_seen_at: payload.new.last_seen_at
                    });
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    };

    const scrollToBottom = (instant = false) => {
        // Use a longer timeout to ensure DOM is fully rendered
        setTimeout(() => {
            if (messagesContainerRef.current) {
                const container = messagesContainerRef.current;
                container.scrollTop = container.scrollHeight;
            } else if (scrollRef.current) {
                // Fallback to scrollIntoView if container ref not available
                scrollRef.current.scrollIntoView({ 
                    behavior: instant ? 'auto' : 'smooth',
                    block: 'end'
                });
            }
        }, instant ? 0 : 150);
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
                    let messageData: any = { ...msg };
                    
                    // Get sender info
                    if (msg.sender_id) {
                        const { data: sender } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', msg.sender_id)
                            .single();
                        messageData.sender = sender;
                    }
                    
                    // Get replied message if exists
                    if (msg.reply_to) {
                        const { data: repliedMsg } = await supabase
                            .from('messages')
                            .select('*, sender_id')
                            .eq('id', msg.reply_to)
                            .single();
                        
                        if (repliedMsg && !repliedMsg.is_deleted) {
                            // Get sender of replied message
                            if (repliedMsg.sender_id) {
                                const { data: repliedSender } = await supabase
                                    .from('profiles')
                                    .select('*')
                                    .eq('id', repliedMsg.sender_id)
                                    .single();
                                messageData.replied_message = { ...repliedMsg, sender: repliedSender };
                            } else {
                                messageData.replied_message = repliedMsg;
                            }
                        }
                    }
                    
                    return messageData;
                })
            );
            setMessages(messagesWithSenders as Message[]);
        }

        // Scroll to bottom immediately after loading messages
        setTimeout(() => {
            scrollToBottom(true); // Instant scroll on initial load
        }, 200);

        // Mark all messages in this conversation as read
        const { data: readCount, error: readError } = await supabase.rpc('mark_messages_as_read', {
            p_conversation_id: conversationId,
            p_user_id: currentUser.id
        });

        if (!readError && readCount > 0) {
            // Notify parent to refresh unread counts
            onMessagesRead?.();
        }
        
        // Get other user's online status
        const otherUser = parts?.find(p => p.user_id !== currentUser.id);
        if (otherUser) {
            const { data: statusData } = await supabase
                .from('profiles')
                .select('is_online, last_seen_at')
                .eq('id', otherUser.user_id)
                .single();
            
            if (statusData) {
                setOtherUserStatus({
                    is_online: statusData.is_online || false,
                    last_seen_at: statusData.last_seen_at
                });
            }
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
                        let messageData: any = { ...newMsg };
                        
                        // Get sender info
                        if (newMsg.sender_id) {
                            const { data: sender } = await supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', newMsg.sender_id)
                                .single();
                            messageData.sender = sender;
                        }
                        
                        // Get replied message if exists
                        if (newMsg.reply_to) {
                            const { data: repliedMsg } = await supabase
                                .from('messages')
                                .select('*, sender_id')
                                .eq('id', newMsg.reply_to)
                                .single();
                            
                            if (repliedMsg && !repliedMsg.is_deleted) {
                                if (repliedMsg.sender_id) {
                                    const { data: repliedSender } = await supabase
                                        .from('profiles')
                                        .select('*')
                                        .eq('id', repliedMsg.sender_id)
                                        .single();
                                    messageData.replied_message = { ...repliedMsg, sender: repliedSender };
                                } else {
                                    messageData.replied_message = repliedMsg;
                                }
                            }
                        }

                        setMessages(prev => {
                            if (prev.find(m => m.id === messageData.id)) {
                                return prev;
                            }
                            return [...prev, messageData as Message];
                        });
                        
                        // If message is from someone else, mark it as read immediately
                        if (newMsg.sender_id !== currentUser.id) {
                            supabase.rpc('mark_messages_as_read', {
                                p_conversation_id: conversationId,
                                p_user_id: currentUser.id
                            }).then(({ data }) => {
                                if (data > 0) {
                                    onMessagesRead?.();
                                }
                            });
                        }
                    }
                }
            )
            // Listen for message updates (read status changes)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    // Update the message's read_at status in local state
                    setMessages(prev => prev.map(msg => 
                        msg.id === payload.new.id 
                            ? { ...msg, read_at: payload.new.read_at, delivered_at: payload.new.delivered_at }
                            : msg
                    ));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleSendMessage = async (content: string, type: 'text' | 'image' | 'audio', mediaUrl?: string, replyTo?: string) => {
        const { error } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: currentUser.id,
            content,
            type,
            media_url: mediaUrl,
            reply_to: replyTo || null
        });

        if (error) {
            console.error('Error sending message:', error);
        } else {
            setReplyingTo(null);
        }
    };

    const handleReply = (message: Message) => {
        setReplyingTo(message);
        // Scroll to input (optional - could add ref to input)
    };

    const handleJumpToMessage = (messageId: string) => {
        const messageElement = messageRefs.current.get(messageId);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the message briefly
            setHighlightedMessageId(messageId);
            setTimeout(() => {
                setHighlightedMessageId(null);
            }, 2000);
        }
    };

    const setMessageRef = (messageId: string, element: HTMLDivElement | null) => {
        if (element) {
            messageRefs.current.set(messageId, element);
        } else {
            messageRefs.current.delete(messageId);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        const { error } = await supabase
            .from('messages')
            .update({ is_deleted: true })
            .eq('id', messageId)
            .eq('sender_id', currentUser.id);

        if (error) {
            console.error('Error deleting message:', error);
            alert('Failed to delete message');
        } else {
            setMessages(prev => prev.filter(m => m.id !== messageId));
        }
    };

    const [showDeleteConversationDialog, setShowDeleteConversationDialog] = useState(false);

    const handleDeleteConversation = async () => {
        // Delete conversation participants (this will cascade delete the conversation)
        const { error } = await supabase
            .from('conversation_participants')
            .delete()
            .eq('conversation_id', conversationId)
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('Error deleting conversation:', error);
            alert('Failed to delete conversation');
        } else {
            setShowDeleteConversationDialog(false);
            if (onBack) onBack();
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
        <div className="flex flex-col h-full bg-white overflow-hidden">
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
                        {otherUserStatus?.is_online && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#6B7C4F] border-2 border-white rounded-full"></span>
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
                <div className="flex items-center gap-3 shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setShowDeleteConversationDialog(true)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Conversation
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Messages Area - SCROLLABLE, takes remaining space */}
            <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto bg-gray-50 min-h-0" 
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(0,0,0,0.02) 35px, rgba(0,0,0,0.02) 36px)'
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
                                const showDate = index === 0 || !isSameDay(
                                    new Date(msg.created_at),
                                    new Date(messages[index - 1].created_at)
                                );
                                const isHighlighted = highlightedMessageId === msg.id;
                                return (
                                    <div 
                                        key={msg.id}
                                        ref={(el) => setMessageRef(msg.id, el)}
                                        className={cn(
                                            "transition-all duration-500",
                                            isHighlighted && "bg-yellow-100/50 rounded-lg p-2 -m-2"
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
                                            isOwn={msg.sender_id === currentUser?.id}
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

            {/* Input - FIXED at bottom */}
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
                            Are you sure you want to delete this conversation? This action cannot be undone and you will lose all messages in this chat.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConversationDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConversation}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
