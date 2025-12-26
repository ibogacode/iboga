-- =============================================
-- MIGRATION: Optimize Conversations Query
-- =============================================

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_unread_count 
    ON public.messages(conversation_id, sender_id, read_at, is_deleted) 
    WHERE read_at IS NULL AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender 
    ON public.messages(conversation_id, sender_id) 
    WHERE is_deleted = false;

-- Function to get all conversations with participants and unread counts in one query
-- Optimized version using LEFT JOIN LATERAL for better performance
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    is_group BOOLEAN,
    name TEXT,
    unread_count INTEGER,
    participants JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH user_conversations AS (
        -- First, get all conversation IDs for this user (fast with index)
        SELECT DISTINCT cp.conversation_id
        FROM public.conversation_participants cp
        WHERE cp.user_id = p_user_id
    ),
    unread_counts AS (
        -- Pre-calculate unread counts for all conversations at once (much faster)
        SELECT 
            m.conversation_id,
            COUNT(*)::INTEGER as unread_count
        FROM public.messages m
        INNER JOIN user_conversations uc ON uc.conversation_id = m.conversation_id
        WHERE m.sender_id != p_user_id
        AND m.read_at IS NULL
        AND m.is_deleted = false
        GROUP BY m.conversation_id
    )
    SELECT 
        c.id,
        c.created_at,
        c.updated_at,
        c.last_message_at,
        c.last_message_preview,
        c.is_group,
        c.name,
        COALESCE(uc.unread_count, 0) as unread_count,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', cp.user_id,
                    'joined_at', cp.joined_at,
                    'last_read_at', cp.last_read_at,
                    'user', jsonb_build_object(
                        'id', p.id,
                        'email', p.email,
                        'first_name', p.first_name,
                        'last_name', p.last_name,
                        'role', p.role,
                        'avatar_url', p.avatar_url,
                        'is_online', COALESCE(p.is_online, false),
                        'last_seen_at', p.last_seen_at
                    )
                )
            ) FILTER (WHERE cp.user_id IS NOT NULL),
            '[]'::jsonb
        ) as participants
    FROM public.conversations c
    INNER JOIN user_conversations user_conv ON user_conv.conversation_id = c.id
    LEFT JOIN unread_counts uc ON uc.conversation_id = c.id
    INNER JOIN public.conversation_participants cp ON cp.conversation_id = c.id
    LEFT JOIN public.profiles p ON p.id = cp.user_id
    GROUP BY c.id, c.created_at, c.updated_at, c.last_message_at, c.last_message_preview, c.is_group, c.name, uc.unread_count
    ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_conversations(UUID) TO authenticated;

