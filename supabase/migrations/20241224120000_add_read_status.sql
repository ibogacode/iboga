-- Add read/delivered status to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_messages_read_status ON public.messages(sender_id, read_at) WHERE read_at IS NULL;

-- Function to mark messages as read when user opens conversation
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.messages
    SET read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID, UUID) TO authenticated;

-- Trigger to auto-set delivered_at when message is inserted
CREATE OR REPLACE FUNCTION public.set_message_delivered()
RETURNS TRIGGER AS $$
BEGIN
    NEW.delivered_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_insert_set_delivered ON public.messages;
CREATE TRIGGER on_message_insert_set_delivered
    BEFORE INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_message_delivered();
