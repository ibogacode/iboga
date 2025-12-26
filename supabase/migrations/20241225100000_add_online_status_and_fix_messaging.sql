-- =============================================
-- MIGRATION: Add Online Status & Fix Messaging
-- =============================================

-- 1. Add online status fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for online status queries
CREATE INDEX IF NOT EXISTS idx_profiles_online_status ON public.profiles(is_online, last_seen_at);

-- 2. Function to update user's online status (call this on app mount/unmount)
CREATE OR REPLACE FUNCTION public.update_online_status(p_is_online BOOLEAN)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET is_online = p_is_online,
        last_seen_at = NOW()
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_online_status(BOOLEAN) TO authenticated;

-- 3. Fix: Update last_read_at in conversation_participants when marking messages as read
-- Drop existing function first (if it exists) to change return type
DROP FUNCTION IF EXISTS public.mark_messages_as_read(UUID, UUID);

-- Create function with new return type
CREATE FUNCTION public.mark_messages_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Mark all unread messages from others as read
    UPDATE public.messages
    SET read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND read_at IS NULL
    AND is_deleted = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Also update the participant's last_read_at timestamp
    UPDATE public.conversation_participants
    SET last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID, UUID) TO authenticated;

-- 4. Policy to allow users to update their own messages' read status
-- (needed for real-time read receipts)
DROP POLICY IF EXISTS "Users can update messages read status" ON public.messages;
CREATE POLICY "Users can update messages read status"
    ON public.messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = public.messages.conversation_id
            AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = public.messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- 5. Policy to allow users to update their own profile online status
DROP POLICY IF EXISTS "Users can update own online status" ON public.profiles;
CREATE POLICY "Users can update own online status"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 6. Enable realtime for messages table (for read status updates)
-- Note: This needs to be done via Supabase Dashboard or API
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 7. Function to get conversation with online status of other participant
CREATE OR REPLACE FUNCTION public.get_conversation_with_status(p_conversation_id UUID)
RETURNS TABLE (
    other_user_id UUID,
    other_user_name TEXT,
    other_user_avatar TEXT,
    other_user_role TEXT,
    is_online BOOLEAN,
    last_seen_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(p.first_name || ' ' || COALESCE(p.last_name, ''), p.email)::TEXT,
        p.avatar_url,
        p.role,
        p.is_online,
        p.last_seen_at
    FROM public.conversation_participants cp
    JOIN public.profiles p ON p.id = cp.user_id
    WHERE cp.conversation_id = p_conversation_id
    AND cp.user_id != auth.uid()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_conversation_with_status(UUID) TO authenticated;

-- 8. Trigger to notify when message read status changes (for real-time updates)
CREATE OR REPLACE FUNCTION public.notify_message_read()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.read_at IS NULL AND NEW.read_at IS NOT NULL THEN
        -- Notify the original sender that their message was read
        PERFORM pg_notify(
            'message_read',
            json_build_object(
                'message_id', NEW.id,
                'conversation_id', NEW.conversation_id,
                'sender_id', NEW.sender_id,
                'read_at', NEW.read_at
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_read ON public.messages;
CREATE TRIGGER on_message_read
    AFTER UPDATE OF read_at ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_message_read();

