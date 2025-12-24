'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Conversation, ChatUser } from '@/types/chat';
import { format } from 'date-fns';

interface ChatSidebarProps {
    conversations: Conversation[];
    selectedId?: string;
    onSelect: (id: string) => void;
    currentUser: any;
    onNewChat: (userId: string) => void;
    isNewChatOpen: boolean;
    setIsNewChatOpen: (v: boolean) => void;
}

export function ChatSidebar({
    conversations,
    selectedId,
    onSelect,
    currentUser,
    onNewChat,
    isNewChatOpen,
    setIsNewChatOpen
}: ChatSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [availableContacts, setAvailableContacts] = useState<ChatUser[]>([]);
    const supabase = createClient();

    useEffect(() => {
        if (isNewChatOpen && currentUser?.id) {
            fetchContacts();
        }
    }, [isNewChatOpen, currentUser?.id]);

    const fetchContacts = async () => {
        if (!currentUser?.id) {
            console.warn('Cannot fetch contacts: user not loaded');
            return;
        }

        console.log('Fetching contacts...');
        const { data, error } = await supabase.rpc('get_chat_contacts');

        if (error) {
            console.error('RPC Error:', error);
            return;
        }

        console.log('Fetched contacts:', data?.length || 0);
        if (data) {
            setAvailableContacts(data);
        } else {
            console.warn('No contacts returned');
        }
    };

    const filteredConversations = conversations.filter(c => {
        const otherParticipant = c.participants?.find(p => p.user_id !== currentUser?.id)?.user;
        const name = c.name || otherParticipant?.first_name || otherParticipant?.email || 'Unknown';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const getConversationDetails = (c: Conversation) => {
        const other = c.participants?.find(p => p.user_id !== currentUser?.id)?.user;

        // Name priority: conversation name > user full name > email > 'Unknown'
        let name = 'Unknown';
        if (c.name) {
            name = c.name;
        } else if (other?.first_name) {
            name = `${other.first_name} ${other.last_name || ''}`.trim();
        } else if (other?.email) {
            name = other.email;
        }

        const avatar = other?.avatar_url;
        const isOnline = false;
        const isNew = false;
        const unreadCount = c.unread_count || 0;

        return { name, avatar, isOnline, isNew, unreadCount, other };
    };

    return (
        <div className="flex flex-col h-full border-r border-gray-100 bg-white w-full md:w-[380px] shrink-0 min-h-0">
            <div className="px-6 pt-6 pb-4 shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Contacts</h2>
                    <span className="text-gray-400 font-medium">{conversations.length}</span>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        placeholder="Search contact..."
                        className="pl-11 h-12 rounded-full border-gray-200 bg-white shadow-sm focus:border-gray-300 focus:ring-0 text-base placeholder:text-gray-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 px-4 min-h-0">
                {isNewChatOpen ? (
                    <div className="space-y-1 pb-4">
                        <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                            Start New Chat with...
                        </p>
                        {availableContacts.length === 0 ? (
                            <p className="px-4 py-8 text-center text-gray-400 text-sm">
                                Loading contacts...
                            </p>
                        ) : (
                            availableContacts
                                .filter(u => {
                                    const displayName = u.first_name
                                        ? `${u.first_name} ${u.last_name || ''}`
                                        : (u.email || '');
                                    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
                                })
                                .map(contact => (
                                    <button
                                        key={contact.id}
                                        onClick={() => {
                                            onNewChat(contact.id);
                                            setIsNewChatOpen(false);
                                        }}
                                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-all text-left group"
                                    >
                                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                            <AvatarImage src={contact.avatar_url} />
                                            <AvatarFallback className="bg-orange-100 text-orange-600 font-medium">
                                                {contact.first_name?.[0] || contact.email?.[0]?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                                                {contact.first_name ? `${contact.first_name} ${contact.last_name || ''}`.trim() : contact.email}
                                            </p>
                                            <p className="text-sm text-gray-500 capitalize">{contact.role}</p>
                                        </div>
                                    </button>
                                ))
                        )}
                        <button
                            onClick={() => setIsNewChatOpen(false)}
                            className="w-full text-center py-4 text-sm text-gray-500 hover:text-gray-700"
                        >
                            Cancel selection
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2 pb-4">
                        {filteredConversations.map((conv) => {
                            const { name, avatar, isOnline, isNew, unreadCount, other } = getConversationDetails(conv);
                            const isSelected = selectedId === conv.id;

                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => onSelect(conv.id)}
                                    className={cn(
                                        "w-full flex items-start gap-4 p-4 rounded-[20px] transition-all duration-200",
                                        isSelected ? "bg-[#F4F2EE]" : "hover:bg-gray-50 bg-white"
                                    )}
                                >
                                    <div className="relative shrink-0">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={avatar} />
                                            <AvatarFallback className="bg-orange-100 text-orange-600 font-medium">
                                                {other?.first_name?.[0] || other?.email?.[0]?.toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        {isOnline && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#6B7C4F] border-2 border-white rounded-full"></span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("font-bold truncate text-[15px]", isSelected ? "text-gray-900" : "text-gray-700")}>
                                                    {name}
                                                </span>
                                                {isNew && (
                                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full uppercase tracking-wide">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 font-medium shrink-0">
                                                {conv.last_message_at ? format(new Date(conv.last_message_at), 'h:mm a') : ''}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-500 truncate max-w-[180px] font-light">
                                                {conv.last_message_preview || "Start chatting..."}
                                            </p>
                                            {unreadCount > 0 && (
                                                <span className="bg-[#EFA96F] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
