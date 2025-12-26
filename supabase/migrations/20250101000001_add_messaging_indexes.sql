-- =============================================
-- MIGRATION: Add Messaging Indexes for Performance
-- =============================================
-- Add indexes to optimize conversation queries and unread count calculations

-- Composite index for conversation_participants lookups by user_id
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_conversation
  ON public.conversation_participants (user_id, conversation_id);

-- Composite index for conversation_participants lookups by conversation_id
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_user
  ON public.conversation_participants (conversation_id, user_id);

-- Partial index for unread message count (optimized for WHERE clause)
-- This is a more optimized version than the existing one - focuses on conversation_id for COUNT queries
CREATE INDEX IF NOT EXISTS idx_messages_unread_count_optimized
  ON public.messages (conversation_id)
  WHERE read_at IS NULL AND is_deleted = false;

-- Index for last message sorting (optimized for ORDER BY)
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_desc
  ON public.conversations (last_message_at DESC NULLS LAST);

