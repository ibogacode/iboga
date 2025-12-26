-- =============================================
-- MIGRATION: Update get_user_conversations with Pagination
-- =============================================
-- Optimize RPC function to support pagination and improve performance
-- Uses EXISTS for filtering and correlated subqueries for participants

CREATE OR REPLACE FUNCTION public.get_user_conversations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
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
    SELECT 
        c.id,
        c.created_at,
        c.updated_at,
        c.last_message_at,
        c.last_message_preview,
        c.is_group,
        c.name,
        COALESCE(
            (
                SELECT COUNT(*)::INTEGER
                FROM public.messages m
                WHERE m.conversation_id = c.id
                AND m.sender_id != p_user_id
                AND m.read_at IS NULL
                AND m.is_deleted = false
            ),
            0
        ) as unread_count,
        COALESCE(
            (
                SELECT jsonb_agg(
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
                )
                FROM public.conversation_participants cp
                LEFT JOIN public.profiles p ON p.id = cp.user_id
                WHERE cp.conversation_id = c.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.conversations c
    WHERE EXISTS (
        SELECT 1
        FROM public.conversation_participants cp
        WHERE cp.conversation_id = c.id
        AND cp.user_id = p_user_id
    )
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update GRANT to match new signature
GRANT EXECUTE ON FUNCTION public.get_user_conversations(UUID, INTEGER, INTEGER) TO authenticated;

