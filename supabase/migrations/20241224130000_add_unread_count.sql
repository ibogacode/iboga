-- Function to get unread message count per conversation for a user
CREATE OR REPLACE FUNCTION public.get_unread_count(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.messages
        WHERE conversation_id = p_conversation_id
        AND sender_id != p_user_id
        AND read_at IS NULL
        AND is_deleted = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_unread_count(UUID, UUID) TO authenticated;
