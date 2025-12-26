'use client';

import { useState, useRef } from 'react';
import { Send, Plus, Smile, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';

interface MessageInputProps {
    onSend: (content: string, type: 'text' | 'image' | 'audio', mediaUrl?: string, replyTo?: string) => Promise<void>;
    disabled?: boolean;
    replyingTo?: Message | null;
    onCancelReply?: () => void;
}

export function MessageInput({ onSend, disabled, replyingTo, onCancelReply }: MessageInputProps) {
    const [content, setContent] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const handleSend = async () => {
        if (!content.trim() && !isUploading) return;
        try {
            await onSend(content, 'text', undefined, replyingTo?.id);
            setContent('');
            onCancelReply?.();
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath);

            await onSend('Sent an image', 'image', publicUrl, replyingTo?.id);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="px-6 pb-6 pt-2 bg-white">
            {/* Reply preview */}
            {replyingTo && (
                <div className="mb-2 p-3 bg-gray-50 border-l-2 border-[#2D3A1F] rounded-lg flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700 mb-1">
                            Replying to {replyingTo.sender?.first_name || 'User'}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                            {replyingTo.type === 'image' 
                                ? '📷 Image' 
                                : replyingTo.type === 'audio'
                                ? '🎵 Audio'
                                : replyingTo.content}
                        </div>
                    </div>
                    {onCancelReply && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onCancelReply}
                            className="h-6 w-6 shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            )}

            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            <div className="flex items-center gap-3 bg-white border border-gray-200 shadow-sm rounded-full p-2 pl-3">
                <Button
                    type="button"
                    size="icon"
                    disabled={disabled || isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#6B7C4F] hover:bg-[#5A6943] text-white rounded-full h-10 w-10 shrink-0"
                >
                    <Plus className="h-5 w-5" />
                </Button>

                <div className="flex-1 relative">
                    <Input
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={replyingTo ? "Type your reply..." : "Your message"}
                        disabled={disabled || isUploading}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-base placeholder:text-gray-400 h-10 px-0"
                    />
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-gray-600"
                >
                    <Smile className="h-6 w-6" />
                </Button>

                <Button
                    onClick={handleSend}
                    disabled={disabled || (!content.trim() && !isUploading)}
                    className={cn(
                        "bg-[#6B7C4F] hover:bg-[#5A6943] text-white rounded-xl h-10 px-5 gap-2 transition-all",
                        (!content.trim() && !isUploading) && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <span className="font-medium">Send</span>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -rotate-45" />}
                </Button>
            </div>
        </div>
    );
}
