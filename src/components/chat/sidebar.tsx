'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, MoreVertical, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
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
    userId: string;
    currentUser?: any;
    onNewChat: (userId: string) => void;
    isNewChatOpen: boolean;
    setIsNewChatOpen: (v: boolean) => void;
    onDeleteConversation?: (conversationId: string) => void;
}

export function ChatSidebar({
    conversations,
    selectedId,
    onSelect,
    userId,
    currentUser,
    onNewChat,
    isNewChatOpen,
    setIsNewChatOpen,
    onDeleteConversation
}: ChatSidebarProps) {
    const effectiveUserId = userId || currentUser?.id;
    
    if (!effectiveUserId) {
        return (
            <div className="flex flex-col h-full w-full md:w-[380px] shrink-0 min-h-0 overflow-hidden bg-white">
                <div className="px-6 pt-6 pb-4 shrink-0">
                    <div className="text-gray-400">Loading...</div>
                </div>
            </div>
        );
    }

    const [searchQuery, setSearchQuery] = useState('');
    const [availableContacts, setAvailableContacts] = useState<ChatUser[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        if (isNewChatOpen && effectiveUserId) {
            fetchContacts();
        }
    }, [isNewChatOpen, effectiveUserId]);

    const fetchContacts = async () => {
        if (!effectiveUserId) {
            console.warn('Cannot fetch contacts: user not loaded');
            return;
        }

        console.log('Fetching contacts...');
        const { data, error } = await supabase.rpc('get_chat_contacts');

        if (error) {
            console.error('RPC Error:', error);
            return;
        }

        const contactsData = (data as unknown) as any[] | null;
        const contactsLength = contactsData ? contactsData.length : 0;
        console.log('Fetched contacts:', contactsLength);
        if (contactsData && Array.isArray(contactsData)) {
            // Filter out current user to ensure they don't appear in contacts
            // Also ensure each contact has unique data and valid name
            const filteredContacts = contactsData
                .filter((contact: any) => {
                    // Exclude current user
                    if (contact.id === effectiveUserId) {
                        return false;
                    }
                    // Ensure contact has valid data
                    if (!contact || !contact.id) {
                        return false;
                    }
                    // Ensure contact has a name (first_name or email)
                    if (!contact.first_name && !contact.email) {
                        console.warn('Contact missing name:', contact);
                        return false;
                    }
                    return true;
                })
                .map((contact: any) => ({
                    // Explicitly map fields to ensure we're using the correct data
                    id: contact.id,
                    email: contact.email,
                    first_name: contact.first_name,
                    last_name: contact.last_name,
                    role: contact.role,
                    avatar_url: contact.avatar_url
                }));
            
            console.log('Filtered contacts (excluding self):', filteredContacts.length);
            if (filteredContacts.length > 0) {
                console.log('First contact:', {
                    id: filteredContacts[0].id,
                    name: `${filteredContacts[0].first_name} ${filteredContacts[0].last_name || ''}`.trim(),
                    email: filteredContacts[0].email
                });
            }
            setAvailableContacts(filteredContacts);
        } else {
            console.warn('No contacts returned or invalid data format');
            setAvailableContacts([]);
        }
    };

    const filteredConversations = conversations.filter(c => {
        const otherParticipant = c.participants?.find(p => p.user_id !== effectiveUserId)?.user;
        const name = c.name || otherParticipant?.first_name || otherParticipant?.email || 'Unknown';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const getConversationDetails = (c: Conversation) => {
        // Debug logging
        if (!c.participants || c.participants.length === 0) {
            console.warn('Conversation has no participants:', c.id, c);
        }
        
        const other = c.participants?.find(p => p.user_id !== effectiveUserId)?.user;

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
        const isOnline = other?.is_online || false;
        const isNew = false;
        const unreadCount = c.unread_count || 0;

        return { name, avatar, isOnline, isNew, unreadCount, other };
    };

    const handleDeleteClick = (conversationId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConversationToDelete(conversationId);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!conversationToDelete) return;

        if (!effectiveUserId) {
            console.warn("[Sidebar] Missing userId, skipping delete");
            return;
        }

        // Delete conversation participants (this will cascade delete the conversation)
        const { error } = await supabase
            .from('conversation_participants')
            .delete()
            .eq('conversation_id', conversationToDelete)
            .eq('user_id', effectiveUserId);

        if (error) {
            console.error('Error deleting conversation:', error);
            alert('Failed to delete conversation');
        } else {
            onDeleteConversation?.(conversationToDelete);
            setDeleteDialogOpen(false);
            setConversationToDelete(null);
        }
    };

    return (
        <div className="flex flex-col h-full w-full md:w-[380px] shrink-0 min-h-0 overflow-hidden bg-white">
                <div className="px-6 pt-6 pb-4 shrink-0">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Contacts</h2>
                        <span className="text-sm text-gray-500 font-semibold bg-gray-100 px-2.5 py-1 rounded-full">
                            {conversations.length}
                        </span>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                        <Input
                            placeholder="Search"
                            className="pl-11 h-12 rounded-full border-gray-200 bg-white shadow-sm focus:border-gray-300 focus:ring-0 text-base placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 px-4 min-h-0 overflow-hidden">
                <div className="w-full min-w-0 max-w-full overflow-hidden">
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
                                    // Explicitly exclude current user (double-check)
                                    if (u.id === effectiveUserId) {
                                        return false;
                                    }
                                    // Filter by search query
                                    const displayName = u.first_name
                                        ? `${u.first_name} ${u.last_name || ''}`
                                        : (u.email || '');
                                    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
                                })
                                .map(contact => {
                                    // Ensure we have valid contact data
                                    const contactName = contact.first_name
                                        ? `${contact.first_name} ${contact.last_name || ''}`.trim()
                                        : contact.email || 'Unknown';
                                    
                                    return (
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
                                                {contactName}
                                            </p>
                                            <p className="text-sm text-gray-500 capitalize">{contact.role || 'user'}</p>
                                        </div>
                                    </button>
                                    );
                                })
                        )}
                        <button
                            onClick={() => setIsNewChatOpen(false)}
                            className="w-full text-center py-4 text-sm text-gray-500 hover:text-gray-700"
                        >
                            Cancel selection
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1 pb-4 w-full max-w-full overflow-hidden">
                        {conversations.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                No conversations yet. Start a new chat to begin messaging.
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                No conversations match your search.
                            </div>
                        ) : (
                            filteredConversations.map((conv) => {
                            const { name, avatar, isOnline, isNew, unreadCount, other } = getConversationDetails(conv);
                            const isSelected = selectedId === conv.id;

                            return (
                                <div
                                    key={conv.id}
                                    className={cn(
                                        "w-full max-w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                        isSelected ? "bg-[#F4F2EE]" : "hover:bg-gray-50 bg-white"
                                    )}
                                    style={{ boxSizing: 'border-box' }}
                                >
                                    <button
                                        onClick={() => onSelect(conv.id)}
                                        className="flex-1 min-w-0 flex items-start gap-3 overflow-hidden cursor-pointer"
                                        style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                                    >
                                    <div className="relative shrink-0 flex-shrink-0" style={{ flexShrink: 0 }}>
                                        <Avatar className="h-12 w-12 border border-gray-100">
                                            <AvatarImage src={avatar} />
                                            <AvatarFallback className="bg-orange-100 text-orange-600 font-medium">
                                                {other?.first_name?.[0] || other?.email?.[0]?.toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        {isOnline && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#6B7C4F] border-2 border-white rounded-full"></span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ maxWidth: 'calc(100% - 60px)' }}>
                                        <div className="flex items-center justify-between mb-1 gap-2 min-w-0 w-full">
                                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                                <span className={cn("font-semibold truncate text-[15px] block min-w-0", isSelected ? "text-gray-900" : "text-gray-800")}>
                                                    {name}
                                                </span>
                                                {isNew && (
                                                    <span className="px-2.5 py-0.5 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium rounded shrink-0 flex-shrink-0">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 font-medium shrink-0 flex-shrink-0 ml-2">
                                                {conv.last_message_at ? format(new Date(conv.last_message_at), 'h:mm a') : ''}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 min-w-0 w-full">
                                            <div className="flex-1 min-w-0 overflow-hidden" style={{ maxWidth: 'calc(100% - 30px)' }}>
                                                <p 
                                                    className="text-sm text-gray-500 font-normal text-left block"
                                                    style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        width: '100%',
                                                        maxWidth: '100%'
                                                    }}
                                                >
                                                    {conv.last_message_preview && 
                                                     conv.last_message_preview.trim() && 
                                                     !conv.last_message_preview.includes('---') &&
                                                     !conv.last_message_preview.match(/^-+$/)
                                                        ? conv.last_message_preview 
                                                        : "Start chatting..."}
                                                </p>
                                            </div>
                                            {unreadCount > 0 && (
                                                <span className="bg-[#EFA96F] text-white text-[11px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full shadow-sm px-1.5 shrink-0 flex-shrink-0">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    </button>
                                    {onDeleteConversation && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200/50 shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreVertical className="w-4 h-4 text-gray-500" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    onClick={(e) => handleDeleteClick(conv.id, e)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            )
                        }))}
                    </div>
                )}
                </div>
                </ScrollArea>

            {/* Delete Conversation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
