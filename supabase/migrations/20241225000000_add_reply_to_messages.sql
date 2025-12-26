-- Add reply_to field to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to) WHERE reply_to IS NOT NULL;

