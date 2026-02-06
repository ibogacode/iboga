-- =============================================
-- MIGRATION: Add lightweight total unread count RPC
-- =============================================
-- This function returns just the total unread message count for a user
-- across all conversations, without fetching conversation details.
-- Much more efficient than get_user_conversations for badge counts.

CREATE OR REPLACE FUNCTION public.get_total_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(
        (
            SELECT COUNT(*)::INTEGER
            FROM public.messages m
            INNER JOIN public.conversation_participants cp 
                ON cp.conversation_id = m.conversation_id 
                AND cp.user_id = p_user_id
            WHERE m.sender_id != p_user_id
            AND m.read_at IS NULL
            AND m.is_deleted = false
        ),
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_total_unread_count(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_total_unread_count(UUID) IS 
'Returns the total count of unread messages for a user across all their conversations. 
Lightweight alternative to get_user_conversations for badge/notification counts.';
