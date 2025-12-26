'use client';

import { cn } from '@/lib/utils';
import { Message, ChatUser } from '@/types/chat';
import { format } from 'date-fns';
import { Play, Pause, Check, CheckCheck, MoreVertical, Trash2, Reply } from 'lucide-react';
import { useState, useRef } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    sender?: ChatUser;
    onDelete?: (messageId: string) => void;
    onReply?: (message: Message) => void;
    onJumpToMessage?: (messageId: string) => void;
    messageRef?: React.RefObject<HTMLDivElement>;
}

export function MessageBubble({ message, isOwn, sender, onDelete, onReply, onJumpToMessage, messageRef }: MessageBubbleProps) {
    const handleDelete = () => {
        if (onDelete && window.confirm('Are you sure you want to delete this message?')) {
            onDelete(message.id);
        }
    };

    return (
        <div 
            ref={messageRef}
            id={`message-${message.id}`}
            className={cn("flex flex-col mb-4", isOwn ? "items-end" : "items-start")}
        >
            <div
                className={cn(
                    "px-4 py-3 max-w-[75%] md:max-w-[65%] text-[15px] leading-relaxed relative group",
                    isOwn
                        ? "bg-[#E8E0D4] text-gray-900 rounded-2xl rounded-br-sm shadow-sm"
                        : "bg-[#F5F0E8] text-gray-900 rounded-2xl rounded-bl-sm shadow-sm"
                )}
            >
                {/* Reply to message preview - Clickable like WhatsApp */}
                {message.replied_message && !message.replied_message.is_deleted && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onJumpToMessage && message.reply_to) {
                                onJumpToMessage(message.reply_to);
                            }
                        }}
                        className="mb-2 pb-2 border-l-[3px] border-[#2D3A1F] pl-3 pr-2 text-left w-full hover:bg-black/5 rounded-r-md transition-colors cursor-pointer"
                    >
                        <div className="font-semibold text-[#2D3A1F] text-xs mb-0.5">
                            {message.replied_message.sender_id === message.sender_id 
                                ? 'You' 
                                : message.replied_message.sender?.first_name || 'User'}
                        </div>
                        <div className="truncate text-gray-600 text-xs">
                            {message.replied_message.type === 'image' 
                                ? '📷 Image' 
                                : message.replied_message.type === 'audio'
                                ? '🎵 Audio'
                                : message.replied_message.content}
                        </div>
                    </button>
                )}

                {/* Message actions menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="absolute -right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200/50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isOwn ? "end" : "start"}>
                        {onReply && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReply(message);
                                }}
                            >
                                <Reply className="w-4 h-4 mr-2" />
                                Reply
                            </DropdownMenuItem>
                        )}
                        {isOwn && onDelete && (
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete();
                                }}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
                {message.type === 'text' && <p className="break-words">{message.content}</p>}

                {message.type === 'image' && (
                    <div className="rounded-xl overflow-hidden my-1">
                        <img src={message.media_url} alt="Shared image" className="max-w-full h-auto max-h-[300px] object-cover" />
                    </div>
                )}

                {message.type === 'audio' && (
                    <AudioPlayer src={message.media_url} isOwn={isOwn} />
                )}
            </div>

            <div className={cn("flex items-center gap-1 mt-1", isOwn ? "mr-2" : "ml-2")}>
                <span className="text-[11px] text-gray-500 font-normal">
                    {format(new Date(message.created_at), 'h:mm a')}
                </span>
                {isOwn && (
                    <div className="flex items-center">
                        {message.read_at ? (
                            <CheckCheck className="w-4 h-4 text-[#6B7C4F]" strokeWidth={2.5} />
                        ) : message.delivered_at ? (
                            <CheckCheck className="w-4 h-4 text-gray-400" strokeWidth={2.5} />
                        ) : (
                            <Check className="w-3.5 h-3.5 text-gray-400" strokeWidth={2.5} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function AudioPlayer({ src, isOwn }: { src?: string; isOwn: boolean }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="flex items-center gap-3 min-w-[200px]">
            <button
                onClick={togglePlay}
                className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                    isOwn ? "bg-[#6B7C4F] text-white" : "bg-gray-800 text-white"
                )}
            >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
            </button>
            <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                <div className={cn("h-full w-1/3", isOwn ? "bg-[#6B7C4F]" : "bg-gray-800")} />
            </div>
            <audio
                ref={audioRef}
                src={src}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
            />
        </div>
    );
}
