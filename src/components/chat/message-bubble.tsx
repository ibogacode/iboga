'use client';

import { cn } from '@/lib/utils';
import { Message, ChatUser } from '@/types/chat';
import { format } from 'date-fns';
import { Play, Pause, Check, CheckCheck } from 'lucide-react';
import { useState, useRef } from 'react';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    sender?: ChatUser;
}

export function MessageBubble({ message, isOwn, sender }: MessageBubbleProps) {
    return (
        <div className={cn("flex flex-col mb-4", isOwn ? "items-end" : "items-start")}>
            <div
                className={cn(
                    "px-4 py-2 max-w-[75%] md:max-w-[65%] text-[15px] leading-relaxed relative group",
                    isOwn
                        ? "bg-[#E7F3E5] text-gray-900 rounded-2xl rounded-br-sm shadow-sm"
                        : "bg-white text-gray-900 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100"
                )}
            >
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
